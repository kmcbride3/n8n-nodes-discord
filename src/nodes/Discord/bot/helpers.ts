import axios from 'axios'
import { Client, Message, TextChannel, User } from 'discord.js'
import { hexoid } from 'hexoid'
import { INodePropertyOptions, LoggerProxy } from 'n8n-workflow'
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

export interface IRole {
  name: string
  id: string
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

  const res = await axios
    .post(
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
    .catch((e: Error) => {
      LoggerProxy.warn('Discord webhook execution failed', {
        error: e.message,
        webhookId,
        stack: e.stack,
      })
      if (state.triggers[webhookId] && !state.testMode) {
        state.triggers[webhookId].active = false
        ipc.connectTo('bot', () => {
          ipc.of.bot.emit('trigger', { ...state.triggers[webhookId], baseUrl: state.baseUrl })
        })
      }
    })

  return Boolean(res)
}

export const addLog = (message: string, client: Client) => {
  LoggerProxy.info('Discord bot log', { message, botId: client.user?.id })
  if (state.logs.length > 99) state.logs.shift()
  const log = `${new Date().toISOString()} -  ${message}`
  state.logs.push(log)

  if (state.ready && state.autoLogs) {
    const channel = client.channels.cache.get(state.autoLogsChannelId) as TextChannel
    if (channel) channel.send(`** ${log} **`)
  }
}

export const ipcRequest = (type: string, parameters: Record<string, unknown>): Promise<unknown> => {
  return new Promise((resolve) => {
    ipc.config.retry = 1500
    ipc.connectTo('bot', () => {
      ipc.of.bot.emit(type, parameters)
      if (parameters.botCustomization && parameters.botActivity) ipc.of.bot.emit('bot:status', parameters)

      ipc.of.bot.on(type, (data: unknown) => {
        resolve(data)
      })
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
