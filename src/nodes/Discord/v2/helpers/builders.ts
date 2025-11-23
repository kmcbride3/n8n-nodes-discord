/**
 * Discord Component Builders - V2
 *
 * This module provides Discord.js-based builder functions for creating message
 * components (buttons, select menus), action rows, and embeds. All builders
 * use official Discord.js builders for proper validation and type safety.
 *
 * @module v2/helpers/builders
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
} from 'discord.js'
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow'

import { validateColorHex } from '../../helpers'
import { toAPISelectMenuOptions, toIDataObject, toMessageActionRowComponents } from './type-helpers'
import type { IDiscordFile } from './types'

// Re-export Discord.js enums for convenience
export { ButtonStyle } from 'discord.js'

/**
 * Creates a Discord button component using Discord.js ButtonBuilder
 *
 * Builds interactive buttons with proper validation using Discord.js native builders.
 * Supports all button styles (Primary, Secondary, Success, Danger, Link) and optional
 * emoji customization. Automatically handles Link button URL requirements.
 *
 * @param customId - Unique identifier for the button (used in interactions)
 * @param label - Text displayed on the button
 * @param style - Button style (Primary, Secondary, Success, Danger, Link)
 * @param emoji - Optional emoji (string or object with id/name)
 * @param url - Required for Link style buttons, ignored for others
 * @param disabled - Whether the button is disabled
 * @returns Button component as IDataObject (JSON representation)
 *
 * @example
 * const button = createButtonComponent('btn_accept', 'Accept', ButtonStyle.Success);
 * const linkButton = createButtonComponent('link', 'Visit', ButtonStyle.Link, undefined, 'https://example.com');
 */
export function createButtonComponent(
  customId: string,
  label: string,
  style: ButtonStyle = ButtonStyle.Primary,
  emoji?: IDataObject,
  url?: string,
  disabled = false,
): IDataObject {
  const button = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style).setDisabled(disabled)

  if (emoji) {
    if (typeof emoji === 'string') {
      button.setEmoji(emoji)
    } else if (emoji.id || emoji.name) {
      button.setEmoji({ id: emoji.id as string, name: emoji.name as string })
    }
  }

  if (url && style === ButtonStyle.Link) {
    button.setURL(url)
  }

  return toIDataObject(button.toJSON())
}

/**
 * Creates a Discord select menu component using Discord.js StringSelectMenuBuilder
 *
 * Builds dropdown select menus with multiple options. Supports single or multi-select
 * modes with configurable min/max selection values. Uses Discord.js native builder
 * for proper validation of options and values.
 *
 * @param customId - Unique identifier for the select menu (used in interactions)
 * @param placeholder - Text shown when no option is selected
 * @param options - Array of menu options (label, value, description, emoji, default)
 * @param disabled - Whether the select menu is disabled
 * @param minValues - Minimum number of options user must select
 * @param maxValues - Maximum number of options user can select
 * @returns Select menu component as IDataObject (JSON representation)
 *
 * @example
 * const options = [
 *   { label: 'Option 1', value: 'opt1', description: 'First option' },
 *   { label: 'Option 2', value: 'opt2', description: 'Second option' }
 * ];
 * const selectMenu = createSelectMenuComponent('menu_id', 'Choose...', options);
 */
export function createSelectMenuComponent(
  customId: string,
  placeholder: string,
  options: IDataObject[],
  disabled = false,
  minValues = 1,
  maxValues = 1,
): IDataObject {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setDisabled(disabled)
    .setMinValues(minValues)
    .setMaxValues(maxValues)

  selectMenu.addOptions(toAPISelectMenuOptions(options))

  return toIDataObject(selectMenu.toJSON())
}

/**
 * Creates an action row container for components using Discord.js ActionRowBuilder
 *
 * Action rows are containers that hold message components (buttons, select menus).
 * Each message can have up to 5 action rows, and each row can contain up to 5 buttons
 * or 1 select menu. Uses Discord.js ActionRowBuilder for proper validation.
 *
 * @param components - Array of component objects (buttons or select menus)
 * @returns Action row as IDataObject (JSON representation)
 *
 * @example
 * const button1 = createButtonComponent('btn1', 'Click Me', ButtonStyle.Primary);
 * const button2 = createButtonComponent('btn2', 'Cancel', ButtonStyle.Secondary);
 * const row = createActionRow([button1, button2]);
 */
export function createActionRow(components: IDataObject[]): IDataObject {
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    toMessageActionRowComponents(components),
  )
  return toIDataObject(actionRow.toJSON())
}

/**
 * Prepares a file for Discord upload
 *
 * Formats file data for Discord API attachment. Handles both Buffer and string
 * data types with optional content type specification. Used for attaching files
 * to Discord messages.
 *
 * @param fileName - The name of the file as it will appear in Discord
 * @param fileData - File content as Buffer or base64 string
 * @param contentType - Optional MIME type (e.g., 'image/png', 'application/pdf')
 * @returns Formatted file object for Discord API
 *
 * @example
 * const fileBuffer = Buffer.from('Hello World', 'utf8');
 * const file = prepareFile('hello.txt', fileBuffer, 'text/plain');
 */
export function prepareFile(fileName: string, fileData: Buffer | string, contentType?: string): IDiscordFile {
  return {
    attachment: fileData,
    name: fileName,
    content_type: contentType,
  }
}

/**
 * Builds Discord embed configuration from node parameters
 *
 * Extracts and validates embed parameters from n8n node execution context. Supports
 * all Discord embed features: title, description, color, fields, author, footer,
 * images, and timestamps. Uses Discord.js validation patterns for color codes.
 * Returns undefined if no embed content is configured.
 *
 * @param context - The n8n execution context
 * @param itemIndex - The index of the current item being processed
 * @returns Embed configuration object or undefined if embed is not enabled/empty
 *
 * @example
 * const embed = buildEmbedConfig(this, 0);
 * if (embed) {
 *   // Send message with embed
 * }
 */
export function buildEmbedConfig(context: IExecuteFunctions, itemIndex: number): IDataObject | undefined {
  const embedEnabled = context.getNodeParameter('embed', itemIndex, false) as boolean
  if (!embedEnabled) return undefined

  const title = context.getNodeParameter('title', itemIndex, '') as string
  const description = context.getNodeParameter('description', itemIndex, '') as string
  const color = context.getNodeParameter('color', itemIndex, '#0099ff') as string
  const url = context.getNodeParameter('url', itemIndex, '') as string
  const imageUrl = context.getNodeParameter('imageUrl', itemIndex, '') as string
  const thumbnailUrl = context.getNodeParameter('thumbnailUrl', itemIndex, '') as string
  const authorName = context.getNodeParameter('authorName', itemIndex, '') as string
  const authorIconUrl = context.getNodeParameter('authorIconUrl', itemIndex, '') as string
  const authorUrl = context.getNodeParameter('authorUrl', itemIndex, '') as string
  const footerText = context.getNodeParameter('footerText', itemIndex, '') as string
  const footerIconUrl = context.getNodeParameter('footerIconUrl', itemIndex, '') as string
  const timestamp = context.getNodeParameter('timestamp', itemIndex, '') as string
  const fields = context.getNodeParameter('fields', itemIndex, { field: [] }) as {
    field?: Array<{ name: string; value: string; inline?: boolean }>
  }

  if (!(title || description || authorName || footerText || fields.field?.length)) return undefined

  const embed: IDataObject = {
    title: title || undefined,
    description: description || undefined,
    color: color ? validateColorHex(color) : 0x0099ff,
    url: url || undefined,
  }

  if (imageUrl) embed.image = { url: imageUrl }
  if (thumbnailUrl) embed.thumbnail = { url: thumbnailUrl }

  if (authorName) {
    embed.author = {
      name: authorName,
      icon_url: authorIconUrl || undefined,
      url: authorUrl || undefined,
    }
  }

  if (footerText) {
    embed.footer = {
      text: footerText,
      icon_url: footerIconUrl || undefined,
    }
  }

  if (timestamp) {
    embed.timestamp = timestamp
  } else if (embedEnabled) {
    embed.timestamp = new Date().toISOString()
  }

  // Transform n8n field input format to Discord embed field format
  // Each field can be displayed inline (side-by-side) or full-width (inline: false)
  if (fields.field?.length) {
    embed.fields = fields.field.map((field) => ({
      name: field.name,
      value: field.value,
      inline: field.inline || false,
    }))
  }

  return embed
}
