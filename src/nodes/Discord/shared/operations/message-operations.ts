/**
 * Shared Message Operations using Discord.js
 *
 * This module provides shared message-building utilities using Discord.js builders
 * and validation patterns for consistent message handling across V1/V2 implementations.
 */

import {
  ActionRowBuilder,
  type APIAllowedMentions,
  type APIEmbed,
  type APISelectMenuOption,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
  type MessageCreateOptions,
  StringSelectMenuBuilder,
} from 'discord.js'
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import type { IDiscordFile } from '../../v2/helpers/types'

/**
 * Discord message configuration using compatible types
 * Following built-ins first architecture - uses Discord.js structures
 */
export interface IDiscordMessageConfig {
  content?: string
  embed?: APIEmbed
  components?: Array<{
    style?: ButtonStyle
    label?: string
    customId?: string
    url?: string
    emoji?: string | { id?: string; name?: string }
    disabled?: boolean
    placeholder?: string
    minValues?: number
    maxValues?: number
    options?: Array<{
      label: string
      value: string
      description?: string
      emoji?: string | { id?: string; name?: string }
      default?: boolean
    }>
  }>
  files?: Array<IDiscordFile | string>
  allowedMentions?: APIAllowedMentions
}

/**
 * Creates a Discord embed using Discord.js EmbedBuilder
 * Uses official Discord.js APIEmbed structure for proper validation
 */
export function createDiscordEmbed(embedConfig: APIEmbed): EmbedBuilder {
  const embed = new EmbedBuilder()

  if (embedConfig.title) {
    embed.setTitle(embedConfig.title)
  }

  if (embedConfig.description) {
    embed.setDescription(embedConfig.description)
  }

  if (embedConfig.color !== undefined) {
    embed.setColor(embedConfig.color)
  }

  if (embedConfig.url) {
    embed.setURL(embedConfig.url)
  }

  if (embedConfig.image?.url) {
    embed.setImage(embedConfig.image.url)
  }

  if (embedConfig.thumbnail?.url) {
    embed.setThumbnail(embedConfig.thumbnail.url)
  }

  if (embedConfig.footer) {
    embed.setFooter({
      text: embedConfig.footer.text,
      iconURL: embedConfig.footer.icon_url,
    })
  }

  if (embedConfig.author) {
    embed.setAuthor({
      name: embedConfig.author.name,
      url: embedConfig.author.url,
      iconURL: embedConfig.author.icon_url,
    })
  }

  if (embedConfig.timestamp) {
    embed.setTimestamp(new Date(embedConfig.timestamp))
  }

  if (embedConfig.fields && embedConfig.fields.length > 0) {
    embed.addFields(embedConfig.fields)
  }

  return embed
}

/**
 * Creates a Discord button using Discord.js ButtonBuilder
 * Uses simplified config compatible with Discord.js API types
 */
export function createDiscordButton(buttonConfig: {
  style: ButtonStyle
  label?: string
  customId?: string
  url?: string
  emoji?: string | { id?: string; name?: string }
  disabled?: boolean
}): ButtonBuilder {
  const button = new ButtonBuilder().setStyle(buttonConfig.style).setDisabled(buttonConfig.disabled ?? false)

  if (buttonConfig.label) {
    button.setLabel(buttonConfig.label)
  }

  if (buttonConfig.customId && buttonConfig.style !== ButtonStyle.Link) {
    button.setCustomId(buttonConfig.customId)
  }

  if (buttonConfig.url && buttonConfig.style === ButtonStyle.Link) {
    button.setURL(buttonConfig.url)
  }

  if (buttonConfig.emoji) {
    button.setEmoji(buttonConfig.emoji)
  }

  return button
}

/**
 * Creates a Discord select menu using Discord.js StringSelectMenuBuilder
 * Uses simplified config compatible with Discord.js API types
 */
export function createDiscordSelectMenu(selectConfig: {
  customId: string
  placeholder: string
  disabled?: boolean
  minValues?: number
  maxValues?: number
  options: Array<{
    label: string
    value: string
    description?: string
    emoji?: string | { id?: string; name?: string }
    default?: boolean
  }>
}): StringSelectMenuBuilder {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(selectConfig.customId)
    .setPlaceholder(selectConfig.placeholder)
    .setDisabled(selectConfig.disabled ?? false)
    .setMinValues(selectConfig.minValues ?? 1)
    .setMaxValues(selectConfig.maxValues ?? 1)

  const options: APISelectMenuOption[] = selectConfig.options.map((option) => {
    const apiOption: APISelectMenuOption = {
      label: option.label,
      value: option.value,
      default: option.default ?? false,
    }

    if (option.description) {
      apiOption.description = option.description
    }

    if (option.emoji) {
      if (typeof option.emoji === 'string') {
        apiOption.emoji = { name: option.emoji }
      } else {
        apiOption.emoji = option.emoji
      }
    }

    return apiOption
  })

  selectMenu.addOptions(options)

  return selectMenu
}

/**
 * Creates a Discord action row using Discord.js ActionRowBuilder for proper validation
 */
export function createDiscordActionRow(
  components: Array<ButtonBuilder | StringSelectMenuBuilder>,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()

  for (const component of components) {
    actionRow.addComponents(component as MessageActionRowComponentBuilder)
  }

  return actionRow
}

/**
 * Creates Discord attachments using Discord.js AttachmentBuilder for proper validation
 */
export function createDiscordAttachments(files: Array<IDiscordFile | string>): AttachmentBuilder[] {
  return files.map((file) => {
    if (typeof file === 'string') {
      // Handle URL or base64 string
      if (file.startsWith('http://') || file.startsWith('https://')) {
        return new AttachmentBuilder(file)
      } else if (file.startsWith('data:')) {
        // Handle data URL
        const [header, data] = file.split(',')
        const buffer = Buffer.from(data, 'base64')
        const mimeMatch = header.match(/data:([^;]+)/)
        const extension = mimeMatch?.[1]?.split('/')[1] || 'png'
        return new AttachmentBuilder(buffer, { name: `file.${extension}` })
      } else {
        // Handle base64 string
        const buffer = Buffer.from(file, 'base64')
        return new AttachmentBuilder(buffer, { name: 'file.png' })
      }
    } else {
      // Handle IDiscordFile object
      return new AttachmentBuilder(file.attachment, {
        name: file.name,
        description: file.description,
      })
    }
  })
}

/**
 * Builds a complete Discord message using Discord.js builders and validation
 */
export function buildDiscordMessage(messageConfig: IDiscordMessageConfig): MessageCreateOptions {
  const messageOptions: MessageCreateOptions = {}

  // Set content
  if (messageConfig.content) {
    messageOptions.content = messageConfig.content
  }

  // Create embed if provided
  if (messageConfig.embed) {
    const embed = createDiscordEmbed(messageConfig.embed)
    messageOptions.embeds = [embed]
  }

  // Create components if provided
  if (messageConfig.components && messageConfig.components.length > 0) {
    const actionRows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = []

    // Group components into action rows (max 5 components per row for buttons, 1 for select menu)
    let currentRow: Array<ButtonBuilder | StringSelectMenuBuilder> = []

    for (const componentConfig of messageConfig.components) {
      let component: ButtonBuilder | StringSelectMenuBuilder

      if (componentConfig.style !== undefined) {
        // Button component
        if (componentConfig.style !== undefined) {
          component = createDiscordButton({
            style: componentConfig.style,
            label: componentConfig.label,
            customId: componentConfig.customId,
            url: componentConfig.url,
            emoji: componentConfig.emoji,
            disabled: componentConfig.disabled,
          })
          currentRow.push(component)

          // Start new row if we have 5 buttons
          if (currentRow.length === 5) {
            actionRows.push(createDiscordActionRow(currentRow))
            currentRow = []
          }
        }
      } else if (componentConfig.customId && componentConfig.placeholder && componentConfig.options) {
        // Select menu component (takes full row)
        if (currentRow.length > 0) {
          actionRows.push(createDiscordActionRow(currentRow))
          currentRow = []
        }

        component = createDiscordSelectMenu({
          customId: componentConfig.customId,
          placeholder: componentConfig.placeholder,
          disabled: componentConfig.disabled,
          minValues: componentConfig.minValues,
          maxValues: componentConfig.maxValues,
          options: componentConfig.options,
        })
        actionRows.push(createDiscordActionRow([component]))
      }
    }

    // Add remaining components
    if (currentRow.length > 0) {
      actionRows.push(createDiscordActionRow(currentRow))
    }

    messageOptions.components = actionRows
  }

  // Create files if provided
  if (messageConfig.files && messageConfig.files.length > 0) {
    messageOptions.files = createDiscordAttachments(messageConfig.files)
  }

  // Set allowed mentions
  if (messageConfig.allowedMentions) {
    messageOptions.allowedMentions = messageConfig.allowedMentions
  }

  return messageOptions
}

/**
 * Executor for sending a Discord message using shared message building utilities
 */
export async function executeSendMessage(
  this: IExecuteFunctions,
  channelId: string,
  messageConfig: IDiscordMessageConfig,
  executionContext?: IDataObject,
): Promise<IDataObject> {
  // Import discord-operations dynamically to avoid circular imports
  const { sendChannelMessage } = await import('../../v2/helpers/discord-operations')

  try {
    // Build the message using Discord.js builders
    const messageOptions = buildDiscordMessage(messageConfig)

    // Send the message using existing discord-operations
    const result = await sendChannelMessage.call(this, channelId, messageOptions.content || '', {
      embeds: messageOptions.embeds as object[] | undefined,
      files: messageOptions.files as object[] | undefined,
      components: messageOptions.components as object[] | undefined,
      allowedMentions: messageOptions.allowedMentions as object | undefined,
    })

    return {
      success: true,
      channelId,
      messageId: result?.id,
      messageOptions,
      action: 'sendMessage',
      timestamp: new Date().toISOString(),
      executionContext,
    }
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to send Discord message: ${error instanceof Error ? error.message : String(error)}`,
      { level: 'warning' },
    )
  }
}

/**
 * Executor for deleting a Discord message
 */
export async function executeDeleteMessage(
  this: IExecuteFunctions,
  channelId: string,
  messageId: string,
  reason?: string,
  executionContext?: IDataObject,
): Promise<IDataObject> {
  // Import discord-operations dynamically to avoid circular imports
  const { deleteMessage } = await import('../../v2/helpers/discord-operations')

  try {
    await deleteMessage.call(this, channelId, messageId, reason)

    return {
      success: true,
      channelId,
      messageId,
      deleted: true,
      reason,
      action: 'deleteMessage',
      timestamp: new Date().toISOString(),
      executionContext,
    }
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to delete Discord message: ${error instanceof Error ? error.message : String(error)}`,
      { level: 'warning' },
    )
  }
}

/**
 * Executor for bulk deleting Discord messages
 */
export async function executeBulkDeleteMessages(
  this: IExecuteFunctions,
  channelId: string,
  messageCount: number,
  reason?: string,
  executionContext?: IDataObject,
): Promise<IDataObject> {
  // Import discord-operations dynamically to avoid circular imports
  const { getChannelMessages, bulkDeleteMessages } = await import('../../v2/helpers/discord-operations')

  try {
    // Validate message count
    if (messageCount <= 0 || messageCount > 100) {
      throw new NodeOperationError(this.getNode(), 'Number of messages to delete must be between 1 and 100')
    }

    // Get messages to delete
    const messages = await getChannelMessages.call(this, channelId, messageCount)

    if (messages.length === 0) {
      return {
        success: true,
        channelId,
        messagesDeleted: 0,
        message: 'No messages found to delete',
        action: 'bulkDeleteMessages',
        timestamp: new Date().toISOString(),
        executionContext,
      }
    }

    // Extract message IDs
    const messageIds = messages.map((msg) => (msg as { id: string }).id)

    // Bulk delete messages
    await bulkDeleteMessages.call(this, channelId, messageIds, reason)

    return {
      success: true,
      channelId,
      messagesDeleted: messageIds.length,
      requestedCount: messageCount,
      actuallyDeleted: messageIds.length,
      reason,
      action: 'bulkDeleteMessages',
      timestamp: new Date().toISOString(),
      executionContext,
    }
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to bulk delete Discord messages: ${error instanceof Error ? error.message : String(error)}`,
      { level: 'warning' },
    )
  }
}
