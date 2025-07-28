import axios from 'axios'
import {
  ButtonBuilder,
  ButtonStyle,
  Client,
  DiscordAPIError,
  Guild,
  GuildMember,
  HTTPError,
  Message,
  PermissionFlagsBits,
  RateLimitError,
  Role,
  StringSelectMenuBuilder,
  TextChannel,
  ThreadChannel,
  User,
} from 'discord.js'
import { hexoid } from 'hexoid'
import { INodePropertyOptions } from 'n8n-workflow'
import ipc from 'node-ipc'

import state from './state'

export interface ICredentials {
  clientId: string
  token: string
  apiKey: string
  baseUrl: string
}

export const connection = (credentials: ICredentials): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!credentials || !credentials.token || !credentials.clientId) {
      reject(new Error('credentials missing'))
      return
    }

    const timeout = setTimeout(() => reject(new Error('timeout')), 15000)

    ipc.config.retry = 1500
    ipc.connectTo('bot', () => {
      ipc.of.bot.emit('credentials', credentials)

      ipc.of.bot.on('credentials', (data: string) => {
        clearTimeout(timeout)
        if (data === 'error') reject(new Error('Invalid credentials'))
        else if (data === 'missing') reject(new Error('Token or clientId missing'))
        else if (data === 'login') reject(new Error('Already logging in'))
        else if (data === 'different') resolve('Already logging in with different credentials')
        else resolve(data) // ready / already
      })
    })
  })
}

export const getChannels = async (credentials: ICredentials): Promise<INodePropertyOptions[]> => {
  const endMessage = ' - Close and reopen this node modal once you have made changes.'

  const res = await connection(credentials).catch((e: Error) => e)
  if (typeof res !== 'string' || !['ready', 'already'].includes(res)) {
    return [
      {
        name: res + endMessage,
        value: 'false',
      },
    ]
  }

  const channelsRequest = () =>
    new Promise<INodePropertyOptions[]>((resolve) => {
      const timeout = setTimeout(() => resolve([]), 5000)

      ipc.config.retry = 1500
      ipc.connectTo('bot', () => {
        ipc.of.bot.emit('list:channels')

        ipc.of.bot.on('list:channels', (data: INodePropertyOptions[]) => {
          clearTimeout(timeout)
          resolve(data)
        })
      })
    })

  const channels = await channelsRequest().catch((e: Error) => e)

  let message = 'Unexpected error'

  if (channels) {
    if (Array.isArray(channels) && channels.length) return channels
    else message = `Your Discord server has no text channels, please add at least one text channel ${endMessage}`
  }

  return [
    {
      name: message,
      value: 'false',
    },
  ]
}

export const getRoles = async (credentials: ICredentials): Promise<INodePropertyOptions[]> => {
  const endMessage = ' - Close and reopen this node modal once you have made changes.'

  const res = await connection(credentials).catch((e: Error) => e)
  if (typeof res !== 'string' || !['ready', 'already'].includes(res)) {
    return [
      {
        name: res + endMessage,
        value: 'false',
      },
    ]
  }

  const rolesRequest = () =>
    new Promise<INodePropertyOptions[]>((resolve) => {
      const timeout = setTimeout(() => resolve([]), 5000)

      ipc.config.retry = 1500
      ipc.connectTo('bot', () => {
        ipc.of.bot.emit('list:roles')

        ipc.of.bot.on('list:roles', (data: INodePropertyOptions[]) => {
          clearTimeout(timeout)
          resolve(data)
        })
      })
    })

  const roles = await rolesRequest().catch((e: Error) => e)

  let message = 'Unexpected error'

  if (roles) {
    if (Array.isArray(roles)) {
      const filtered = roles.filter((r: INodePropertyOptions) => r.name !== '@everyone')
      if (filtered.length) return filtered
      else
        message = `Your Discord server has no roles, please add at least one if you want to restrict the trigger to specific users ${endMessage}`
    } else message = `Something went wrong ${endMessage}`
  }

  return [
    {
      name: message,
      value: 'false',
    },
  ]
}

export const triggerWorkflow = async (
  webhookId: string,
  message: Message | null,
  placeholderId: string,
  baseUrl: string,
  user?: User,
  channelId?: string,
  presence?: string,
  nick?: string,
  addedRoles?: string[],
  removedRoles?: string[],
  interactionMessageId?: string,
  interactionValues?: string[],
  userRoles?: string[],
): Promise<boolean> => {
  const headers = {
    accept: 'application/json',
  }
  try {
    const res = await axios.post(
      `${baseUrl}/webhook${state.testMode ? '-test' : ''}/${webhookId}/webhook`,
      {
        content: message?.content,
        channelId: message?.channelId ?? channelId,
        placeholderId,
        userId: message?.author.id ?? user?.id,
        userName: message?.author.username ?? user?.username,
        userTag: message?.author.tag ?? user?.tag,
        messageId: message?.id,
        attachments: message?.attachments,
        presence,
        nick,
        addedRoles,
        removedRoles,
        interactionMessageId,
        interactionValues,
        userRoles,
      },
      { headers },
    )
    return Boolean(res)
  } catch (error) {
    // Use message?.client if available, otherwise require client to be passed explicitly
    const client = message?.client ?? (typeof user === 'object' && 'client' in user ? (user as User).client : undefined)
    addLog(
      error instanceof DiscordAPIError || error instanceof HTTPError || error instanceof RateLimitError
        ? `triggerWorkflow Discord.js error: ${error.message}`
        : `triggerWorkflow error: ${error.message}`,
      client as Client,
    )
    if (state.triggers[webhookId] && !state.testMode) {
      state.triggers[webhookId].active = false
      ipc.connectTo('bot', () => {
        ipc.of.bot.emit('trigger', { ...state.triggers[webhookId], baseUrl: state.baseUrl })
      })
    }
    return false
  }
}

export const addLog = (message: string, client: Client) => {
  console.log(message)
  if (state.logs.length > 99) state.logs.shift()
  const log = `${new Date().toISOString()} -  ${message}`
  state.logs.push(log)

  if (state.ready && state.autoLogs) {
    const channel = client.channels.cache.get(state.autoLogsChannelId) as TextChannel
    if (channel) channel.send(`** ${log} **`)
  }
}

export const ipcRequest = <T = object>(type: string, parameters: Record<string, object>): Promise<T> => {
  return new Promise((resolve) => {
    ipc.config.retry = 1500
    ipc.connectTo('bot', () => {
      ipc.of.bot.emit(type, parameters)
      if ('botCustomization' in parameters && 'botActivity' in parameters) ipc.of.bot.emit('bot:status', parameters)
      const handler = (data: T) => {
        resolve(data)
        ipc.of.bot.off(type, handler)
      }
      ipc.of.bot.on(type, handler)
    })
  })
}

export const pollingPromptData = (
  message: Message,
  content: string,
  seconds: number,
  client: Client,
): Promise<boolean> => {
  return new Promise((resolve) => {
    let remainingTime = seconds
    let timeoutId: NodeJS.Timeout | null = null

    // Use a single timeout reference that can be cleared
    const checkPromptData = () => {
      // Check if response has been received
      if (state.promptData[message.id]?.value) {
        resolve(true)
        return
      }

      // Check for timeout expiry
      if (seconds && remainingTime <= 0) {
        // Update message to show timeout
        message
          .edit({ content, components: [] })
          .catch((error: Error) => addLog(`Failed to update timeout message: ${error.message}`, client))

        // Send timeout notification
        const channel = client.channels.cache.get(message.channelId)
        if (channel?.isTextBased()) {
          ;(channel as TextChannel)
            .send('Timeout reached')
            .catch((error: Error) => addLog(`Failed to send timeout message: ${error.message}`, client))
        }

        resolve(true)
        return
      }

      // Update timer in message if needed
      if (seconds) {
        remainingTime--
        message
          .edit({ content: `${content} (${remainingTime}s)` })
          .catch((error: Error) => addLog(`Failed to update timer: ${error.message}`, client))
      }

      // Schedule the next check
      timeoutId = setTimeout(checkPromptData, 1000)
    }

    // Start the polling
    timeoutId = setTimeout(checkPromptData, 1000)

    // Clean up event listeners when done
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  })
}

export interface IExecutionData {
  executionId: string
  placeholderId: string
  channelId: string
  apiKey: string
  baseUrl: string
  userId?: string
}

export const execution = (
  executionId: string,
  placeholderId: string,
  channelId: string,
  apiKey: string,
  baseUrl: string,
  userId?: string,
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 15000)
    ipc.connectTo('bot', () => {
      ipc.of.bot.emit('execution', {
        executionId,
        placeholderId,
        channelId,
        apiKey,
        baseUrl,
        userId,
      })
      ipc.of.bot.on('execution', () => {
        clearTimeout(timeout)
        resolve(true)
      })
    })
  })
}

export const placeholderLoading = (
  placeholder: Message,
  placeholderMatchingId: string,
  txt: string,
): Promise<string> => {
  return new Promise((resolve) => {
    state.placeholderMatching[placeholderMatchingId] = placeholder.id
    state.placeholderWaiting[placeholderMatchingId] = true
    let i = 0
    const waiting = () => {
      i++
      if (i > 3) i = 0
      let content = `${txt}`
      for (let j = 0; j < i; j++) content += '.'

      if (!state.placeholderMatching[placeholderMatchingId]) {
        placeholder.edit(txt).catch((e: Error) => e)
        state.placeholderWaiting[placeholderMatchingId] = false
        resolve(txt)
        return
      }
      placeholder.edit(content).catch((e: Error) => e)
      setTimeout(() => {
        if (state.placeholderMatching[placeholderMatchingId]) waiting()
        else {
          placeholder.edit(txt).catch((e: Error) => e)
          state.placeholderWaiting[placeholderMatchingId] = false
          resolve(txt)
        }
      }, 800)
    }
    waiting()
  })
}

export function withTimeout<T>(promise: Promise<T>, ms: number) {
  const timeout = new Promise((resolve, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms} ms.`)), ms))
  return Promise.race([promise, timeout])
}

export function generateUniqueId(length = 12): string {
  return hexoid(length)()
}

// Example: Permission check using Discord.js built-in
export function hasPermission(
  member: User | { permissions?: Role['permissions'] },
  permission: keyof typeof PermissionFlagsBits,
): boolean {
  if ('permissions' in member && typeof member.permissions?.has === 'function') {
    return member.permissions.has(PermissionFlagsBits[permission])
  }
  return false
}

// Example: Thread management using Discord.js v14+
export async function archiveThread(thread: ThreadChannel): Promise<void> {
  try {
    if (!thread.archived) {
      await thread.setArchived(true)
    }
  } catch (error) {
    if (error instanceof DiscordAPIError || error instanceof HTTPError || error instanceof RateLimitError) {
      addLog(`Thread archive failed: ${error.message}`, thread.client)
    } else {
      throw error
    }
  }
}

// Example: Message component builder usage
export function buildButton(label: string, style: ButtonStyle, customId: string): ButtonBuilder {
  return new ButtonBuilder().setLabel(label).setStyle(style).setCustomId(customId)
}

export function buildSelectMenu(
  options: { label: string; value: string; description?: string }[],
  customId: string,
): StringSelectMenuBuilder {
  const selectMenu = new StringSelectMenuBuilder().setCustomId(customId)
  selectMenu.addOptions(options.map((opt) => ({ label: opt.label, value: opt.value, description: opt.description })))
  return selectMenu
}

export const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.UseApplicationCommands,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageThreads,
]

export function getMissingPermissions(
  member: GuildMember,
  channel: TextChannel | null,
  required: bigint[] = REQUIRED_PERMISSIONS,
): string[] {
  if (!channel) return required.map((perm) => permissionNameFromBit(perm))
  const perms = channel.permissionsFor(member)
  if (!perms) return required.map((perm) => permissionNameFromBit(perm))
  return required.filter((perm) => !perms.has(perm)).map((perm) => permissionNameFromBit(perm))
}

function permissionNameFromBit(bit: bigint): string {
  // Find the key name for the permission bit
  for (const [key, value] of Object.entries(PermissionFlagsBits)) {
    if (value === bit) return key
  }
  return bit.toString()
}

export async function checkBotPermissionsOnStartup(
  client: Client,
  guild: Guild,
  logFn: (msg: string) => void = console.error,
): Promise<boolean> {
  try {
    const botMember = await guild.members.fetchMe()
    const textChannels = guild.channels.cache.filter((ch): ch is TextChannel => ch.isTextBased() && ch.type === 0)
    let allOk = true
    for (const channel of textChannels.values()) {
      const missing = getMissingPermissions(botMember, channel)
      if (missing.length) {
        logFn(`Bot is missing permissions in channel #${channel.name}: ${missing.join(', ')}`)
        allOk = false
      }
    }
    return allOk
  } catch (err) {
    logFn(`Failed to check bot permissions: ${(err as Error).message}`)
    return false
  }
}

export function generateInviteUrl(clientId: string, missingPerms: string[]): string {
  const bits = missingPerms
    .map((name) => PermissionFlagsBits[name as keyof typeof PermissionFlagsBits])
    .filter((bit): bit is bigint => typeof bit === 'bigint')
    .reduce((acc, bit) => acc | bit, 0n)
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot+applications.commands&permissions=${bits.toString()}`
}
