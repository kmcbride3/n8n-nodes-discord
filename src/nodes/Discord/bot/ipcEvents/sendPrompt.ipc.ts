import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Channel,
  ChannelType,
  Client,
  ColorResolvable,
  EmbedBuilder,
  Guild,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { addLog, pollingPromptData } from '../helpers'
import state, { IPromptData } from '../state'

interface PromptRequestData {
  webhookId: string
  channelId: string
  executionId: string
  userId?: string
  content: string
  timeout?: number
  persistent?: boolean
  restrictToRoles?: boolean
  restrictToTriggeringUser?: boolean
  mentionRoles?: string[]
  buttons?: {
    button: Array<{
      label: string
      value: string
      style?: number
      emoji?: string
      disabled?: boolean
    }>
    placeholder?: string
  }
  select?: {
    select: Array<{
      label: string
      value: string
      description?: string
      emoji?: string
      default?: boolean
    }>
    placeholder?: string
    minValues?: number
    maxValues?: number
  }
  buttons_row?: number
  select_row?: number
  placeholder?: string
  colorHex?: string
  options?: {
    delay?: number
    rowButtons?: number
    largeButtons?: boolean
    [key: string]: unknown
  }
}

// Helper function to get the guild and channel
async function getGuildAndChannel(data: PromptRequestData, client: Client, socket: Socket, ipc: typeof Ipc) {
  addLog(`sendPrompt ${data.webhookId}`, client)

  const guild = client.guilds.cache.first()
  if (!guild) {
    ipc.server.emit(socket, 'sendPrompt', { error: 'No guild found' })
    return { success: false }
  }

  // Get the channel
  const channel = await client.channels.fetch(data.channelId).catch(() => null)
  if (!channel || !channel.isTextBased() || channel.type === ChannelType.DM) {
    ipc.server.emit(socket, 'sendPrompt', { error: 'No channel found or not a text-based channel' })
    return { success: false }
  }

  // Check if the channel is sendable with the send method
  if ('send' in channel && typeof channel.send === 'function') {
    return { success: true, guild, channel }
  } else {
    ipc.server.emit(socket, 'sendPrompt', { error: 'Channel is not sendable' })
    return { success: false }
  }
}

// Helper function to get permission restrictions
function getPermissionRestrictions(data: PromptRequestData) {
  let restrictToRoles: boolean | undefined
  let restrictToTriggeringUser: boolean | undefined
  let mentionRoles: string[] = []

  if (data.restrictToRoles && Array.isArray(data.mentionRoles) && data.mentionRoles.length) {
    restrictToRoles = true
    mentionRoles = data.mentionRoles
  } else if (data.restrictToTriggeringUser && data.executionId) {
    restrictToTriggeringUser = true
  }

  return { restrictToRoles, restrictToTriggeringUser, mentionRoles }
}

// Helper function to create embed
function createEmbed(data: PromptRequestData, client: Client) {
  let embed: EmbedBuilder | undefined
  if (data.colorHex) {
    try {
      embed = new EmbedBuilder().setDescription(data.content).setColor(data.colorHex as ColorResolvable)
    } catch {
      addLog(`Invalid color: ${data.colorHex}`, client)
    }
  }
  return embed
}

// Helper function to process buttons
function processButtons(data: PromptRequestData) {
  const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = []

  if (data.buttons?.button?.length) {
    const rowsButtons = data.buttons_row ?? 1
    const buttonsPerRow = Math.max(1, Math.min(5, Math.ceil(data.buttons.button.length / rowsButtons)))

    for (let i = 0; i < data.buttons.button.length; i += buttonsPerRow) {
      const row = new ActionRowBuilder<ButtonBuilder>()
      const rowButtons = data.buttons.button.slice(i, i + buttonsPerRow)

      for (const buttonData of rowButtons) {
        const buttonStyle = typeof buttonData.style === 'number' ? buttonData.style : ButtonStyle.Primary

        const button = new ButtonBuilder()
          .setCustomId(buttonData.value)
          .setLabel(buttonData.label)
          .setStyle(buttonStyle)

        if (buttonData.emoji) {
          button.setEmoji(buttonData.emoji)
        }

        if (buttonData.disabled) {
          button.setDisabled(true)
        }

        row.addComponents(button)
      }
      components.push(row)
    }
  }

  return components
}

// Helper function to process select menu
function processSelectMenu(
  data: PromptRequestData,
  components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
) {
  if (data.select?.select?.length) {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
    const selectMenu = new StringSelectMenuBuilder().setCustomId('select')

    if (data.select.placeholder) {
      selectMenu.setPlaceholder(data.select.placeholder)
    }

    if (data.select.minValues) {
      selectMenu.setMinValues(data.select.minValues)
    }

    if (data.select.maxValues !== undefined) {
      selectMenu.setMaxValues(data.select.maxValues)
    } else if (data.select.select.length > 1) {
      selectMenu.setMaxValues(data.select.select.length)
    }

    // Add options to select menu
    const selectOptions = data.select.select.map((option) => {
      const selectOption = new StringSelectMenuOptionBuilder().setLabel(option.label).setValue(option.value)

      if (option.description) {
        selectOption.setDescription(option.description)
      }

      if (option.emoji) {
        selectOption.setEmoji(option.emoji)
      }

      if (option.default) {
        selectOption.setDefault(true)
      }

      return selectOption
    })

    selectMenu.addOptions(selectOptions)
    row.addComponents(selectMenu)
    components.push(row)
  }

  return components
}

// Helper function to handle execution matching for users
async function addUserMention(
  messageOptions: {
    content: string
    components?: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[]
    embeds?: EmbedBuilder[]
  },
  restrictToTriggeringUser: boolean | undefined,
  data: PromptRequestData,
  guild: Guild,
) {
  if (restrictToTriggeringUser && data.executionId) {
    const executionMatching = state.executionMatching.get(data.executionId)
    if (executionMatching?.userId) {
      const member = await guild.members.fetch(executionMatching.userId).catch(() => null)

      if (member) {
        messageOptions.content = `<@${executionMatching.userId}> ${messageOptions.content}`
      }
    }
  }
  return messageOptions
}

// Helper function to create prompt data
function createPromptData(
  data: PromptRequestData,
  restrictToRoles: boolean | undefined,
  restrictToTriggeringUser: boolean | undefined,
  mentionRoles: string[],
) {
  const promptData: IPromptData = {
    executionId: data.executionId,
    content: data.content,
    value: null,
    restrictToRoles,
    restrictToTriggeringUser,
    mentionRoles,
  }

  // Add optional properties only if they exist
  if (data.buttons) promptData.buttons = data.buttons
  if (data.select) promptData.select = data.select
  if (data.options) promptData.options = data.options
  if (data.buttons_row) promptData.buttons_row = data.buttons_row
  if (data.select_row) promptData.select_row = data.select_row
  if (data.placeholder) promptData.placeholder = data.placeholder
  if (data.colorHex) promptData.colorHex = data.colorHex

  return promptData
}
// Helper function to handle the prompt process
async function handlePromptProcess(data: PromptRequestData, socket: Socket, ipc: typeof Ipc, client: Client) {
  const guildChannelResult = await getGuildAndChannel(data, client, socket, ipc)
  if (!guildChannelResult.success) {
    return
  }

  const { guild, channel } = guildChannelResult as {
    success: true
    guild: Guild
    channel: Channel & { send: (options: unknown) => Promise<unknown> }
  }
  const { restrictToRoles, restrictToTriggeringUser, mentionRoles } = getPermissionRestrictions(data)
  const embed = createEmbed(data, client)

  // Create message options
  const messageOptions: {
    content: string
    embeds?: EmbedBuilder[]
    components?: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[]
  } = {
    content: embed ? '' : data.content,
  }

  if (embed) {
    messageOptions.embeds = [embed]
  }

  // Process components
  let components = processButtons(data)
  components = processSelectMenu(data, components)

  // Add components to message options if needed
  if (components.length > 0) {
    messageOptions.components = components
  }

  // Add user mention if needed
  await addUserMention(messageOptions, restrictToTriggeringUser, data, guild)

  // Send the message
  let message: Message<boolean> | null = null
  message = (await channel.send(messageOptions).catch((e: Error) => {
    addLog(`Error sending message: ${e.message}`, client)
    return null
  })) as Message<boolean> | null

  if (!message) {
    ipc.server.emit(socket, 'sendPrompt', { error: 'Failed to send message' })
    return
  }

  // Ensure message has an id property
  if (typeof message !== 'object' || message === null || !('id' in message)) {
    ipc.server.emit(socket, 'sendPrompt', { error: 'Message response missing ID' })
    return
  }

  const messageId = message.id as string

  // Store the prompt data
  const promptData = createPromptData(data, restrictToRoles, restrictToTriggeringUser, mentionRoles)
  state.promptDataMap.set(messageId, promptData)

  // Handle polling or persistent mode
  if (!data.persistent && data.timeout !== 0) {
    await handlePolling(messageId, message as Message, data, client, socket, ipc)
  } else {
    // For persistent prompts, just return confirmation
    ipc.server.emit(socket, 'sendPrompt', { success: true, messageId })
  }
}

// Helper function to handle polling
async function handlePolling(
  messageId: string,
  message: Message,
  data: PromptRequestData,
  client: Client,
  socket: Socket,
  ipc: typeof Ipc,
) {
  const seconds = data.timeout || 60
  const pollResult = await pollingPromptData(message, data.content, seconds, client)

  if (pollResult && state.promptDataMap.has(messageId)) {
    const response = state.promptDataMap.get(messageId)
    // Clean up using Map's delete method
    state.promptDataMap.delete(messageId)
    ipc.server.emit(socket, 'sendPrompt', { response, messageId })
  } else {
    ipc.server.emit(socket, 'sendPrompt', { timeout: true, messageId })
  }
}

export default function (ipc: typeof Ipc, client: Client): void {
  ipc.server.on('sendPrompt', async (data: PromptRequestData, socket: Socket) => {
    try {
      await handlePromptProcess(data, socket, ipc, client)
    } catch (e) {
      addLog(`Error in sendPrompt: ${e instanceof Error ? e.message : String(e)}`, client)
      ipc.server.emit(socket, 'sendPrompt', { error: e instanceof Error ? e.message : String(e) })
    }
  })

  ipc.of.bot.on('send:prompt', (data: { channelId: string; content: string }) => {
    const channel = client.channels.cache.get(data.channelId)
    if (channel && channel.isTextBased()) {
      ;(channel as TextChannel).send(data.content)
    }
  })
}
