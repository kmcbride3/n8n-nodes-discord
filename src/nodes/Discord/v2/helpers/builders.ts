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
import type { IDataObject } from 'n8n-workflow'

import { toAPISelectMenuOptions, toIDataObject, toMessageActionRowComponents } from './type-helpers'
import type { IDiscordFile } from './types'

// Re-export Discord.js enums for convenience
export { ButtonStyle } from 'discord.js'

// Re-export enhanced embed builder
export { buildEnhancedEmbed, getEnhancedEmbedProperties, EMBED_LIMITS } from './embedBuilder'

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

