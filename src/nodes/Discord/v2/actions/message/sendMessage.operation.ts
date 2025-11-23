/**
 * Discord Send Message Operation - V2
 *
 * This module implements the send message operation for Discord using Discord.js
 * built-in functionality. It follows n8n best practices with proper error handling,
 * type safety, and comprehensive parameter validation.
 *
 * @module v2/actions/message/sendMessage
 */

import { ButtonStyle, DiscordAPIError, HTTPError, RateLimitError } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { generateUniqueId } from '../../../helpers'
import { isValidSnowflake, sendChannelMessage } from '../../helpers'
import { buildEmbedConfig, createActionRow, createButtonComponent } from '../../helpers/builders'
import { parseDiscordError, prepareErrorData, updateDisplayOptions } from '../../helpers/utils'

/**
 * Builds allowed mentions configuration from node parameters
 *
 * Constructs Discord's allowed_mentions object to control which users, roles,
 * or @everyone/@here can be mentioned in the message. Prevents unwanted mass
 * notifications and provides granular mention control.
 *
 * @param context - The n8n execution context
 * @param itemIndex - The index of the current item being processed
 * @returns Allowed mentions configuration object, or undefined if not configured
 *
 * @example
 * const mentions = buildAllowedMentions(this, 0);
 * // Returns: { roles: ['123456'], parse: ['users'] }
 */
function buildAllowedMentions(context: IExecuteFunctions, itemIndex: number): IDataObject | undefined {
  const mentionRoles = context.getNodeParameter('mentionRoles', itemIndex, []) as string[]
  const allowedMentionsEnabled = context.getNodeParameter('allowedMentions', itemIndex, false) as boolean

  if (!mentionRoles.length && !allowedMentionsEnabled) return undefined

  const allowedMentions: IDataObject = {}

  if (mentionRoles.length > 0) {
    allowedMentions.roles = mentionRoles
  }

  if (allowedMentionsEnabled) {
    const parseUsers = context.getNodeParameter('parseUsers', itemIndex, true) as boolean
    const parseRoles = context.getNodeParameter('parseRoles', itemIndex, true) as boolean
    const parseEveryone = context.getNodeParameter('parseEveryone', itemIndex, false) as boolean

    const parse: string[] = []
    if (parseUsers) parse.push('users')
    if (parseRoles) parse.push('roles')
    if (parseEveryone) parse.push('everyone')

    allowedMentions.parse = parse
  }

  return allowedMentions
}

/**
 * Builds file attachments array from node parameters
 *
 * Extracts and formats file attachments from node configuration. Supports URLs
 * and binary data with optional filenames and descriptions. Files are attached
 * to Discord messages using Discord.js AttachmentBuilder.
 *
 * @param context - The n8n execution context
 * @param itemIndex - The index of the current item being processed
 * @returns Array of file attachment objects with name, url/data, and optional description
 *
 * @example
 * const files = buildFileAttachments(this, 0);
 * // Returns: [{ name: 'image.png', attachment: 'https://...', description: 'Screenshot' }]
 */
function buildFileAttachments(
  context: IExecuteFunctions,
  itemIndex: number,
): Array<{ name: string; attachment: string; description?: string }> {
  const filesParam = context.getNodeParameter('files', itemIndex, { file: [] }) as {
    file?: Array<{ url: string; filename?: string; description?: string }>
  }

  if (!filesParam.file || filesParam.file.length === 0) return []

  return filesParam.file.map((file) => ({
    name: file.filename || 'attachment',
    attachment: file.url,
    description: file.description,
  }))
}

/**
 * Builds Discord message components (buttons/select menus) using Discord.js builders
 *
 * Creates interactive message components using Discord.js ButtonBuilder and
 * ActionRowBuilder. Supports various button styles and automatically generates
 * unique custom IDs for interaction tracking.
 *
 * @param context - The n8n execution context
 * @param itemIndex - The index of the current item being processed
 * @returns Object containing components array and enabled flag
 *
 * @example
 * const { components } = buildComponents(this, 0);
 * // Returns: { components: [ActionRow with button], componentsEnabled: true }
 */
function buildComponents(
  context: IExecuteFunctions,
  itemIndex: number,
): { components: IDataObject[] | undefined; componentsEnabled: boolean } {
  const componentsEnabled = context.getNodeParameter('components', itemIndex, false) as boolean
  if (!componentsEnabled) return { components: undefined, componentsEnabled: false }

  const componentType = context.getNodeParameter('componentType', itemIndex, 'button') as string

  if (componentType === 'button') {
    const buttonLabel = context.getNodeParameter('buttonLabel', itemIndex, 'Click Me') as string
    const buttonStyle = context.getNodeParameter('buttonStyle', itemIndex, 'PRIMARY') as string
    const buttonId = context.getNodeParameter('buttonId', itemIndex, generateUniqueId(8)) as string

    const button = createButtonComponent(
      buttonId,
      buttonLabel,
      ButtonStyle[buttonStyle as keyof typeof ButtonStyle] || ButtonStyle.Primary,
    )

    return { components: [createActionRow([button])], componentsEnabled: true }
  }

  return { components: undefined, componentsEnabled: true }
}

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['message'],
      operation: ['send'],
    },
  },
  [
    {
      displayName: 'Replace the trigger placeholder',
      name: 'triggerPlaceholder',
      type: 'boolean',
      required: false,
      displayOptions: {
        hide: {
          triggerChannel: [true],
        },
      },
      default: false,
      description:
        'If active, the message produced by this node will replace the previous placeholder set. It can be a placeholder set by the Discord Trigger node or by another Discord Send node.',
    },
    {
      displayName: 'Send to the trigger channel',
      name: 'triggerChannel',
      type: 'boolean',
      required: false,
      displayOptions: {
        hide: {
          triggerPlaceholder: [true],
        },
      },
      default: false,
      description:
        'If active, the message produced will be sent to the same channel were the workflow was triggered (but not replace the placeholder if there is one).',
    },
    {
      displayName: 'Send to',
      name: 'channelId',
      required: false,
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getChannels',
      },
      displayOptions: {
        hide: {
          triggerPlaceholder: [true],
          triggerChannel: [true],
        },
      },
      default: '',
      description:
        'Let you specify the text channels where you want to send the message. Your credentials must be set and the bot running, you also need at least one text channel available.',
    },
    {
      displayName: 'Content',
      name: 'content',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
        },
      },
      typeOptions: {
        rows: 4,
      },
      default: '',
      description: 'The text content of the message to send.',
    },
    {
      displayName: 'Embed',
      name: 'embed',
      type: 'boolean',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
        },
      },
      required: false,
      default: false,
      description: 'If active it will enable the creation of rich messages.',
    },
    {
      displayName: 'Title',
      name: 'title',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'The title of the embed.',
    },
    {
      displayName: 'Description',
      name: 'description',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      typeOptions: {
        rows: 4,
      },
      default: '',
      description: 'The description of the embed.',
    },
    {
      displayName: 'Color',
      name: 'color',
      type: 'color',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '#0099ff',
      description: 'The accent color of the embed sidebar (hex color code, e.g., #FF5733 for orange-red).',
    },
    {
      displayName: 'URL',
      name: 'url',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'URL for the embed title to link to.',
    },
    {
      displayName: 'Image URL',
      name: 'imageUrl',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description:
        'URL of an image to display in the embed (e.g., https://example.com/image.png). Supports PNG, JPG, GIF.',
    },
    {
      displayName: 'Thumbnail URL',
      name: 'thumbnailUrl',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'URL of a thumbnail image to display in the embed.',
    },
    {
      displayName: 'Author Name',
      name: 'authorName',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'Name of the embed author.',
    },
    {
      displayName: 'Author Icon URL',
      name: 'authorIconUrl',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'URL of the author icon.',
    },
    {
      displayName: 'Author URL',
      name: 'authorUrl',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'URL for the author name to link to.',
    },
    {
      displayName: 'Footer Text',
      name: 'footerText',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'Text for the embed footer.',
    },
    {
      displayName: 'Footer Icon URL',
      name: 'footerIconUrl',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'URL of the footer icon.',
    },
    {
      displayName: 'Timestamp',
      name: 'timestamp',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: '',
      description: 'ISO 8601 timestamp for the embed (e.g., 2023-01-01T00:00:00Z). Leave empty for current time.',
    },
    {
      displayName: 'Fields',
      name: 'fields',
      placeholder: 'Add Field',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          embed: [true],
        },
      },
      default: {},
      options: [
        {
          name: 'field',
          displayName: 'Field',
          values: [
            {
              displayName: 'Name',
              name: 'name',
              type: 'string',
              default: '',
              description: 'The name/title of the field.',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'The value/content of the field.',
            },
            {
              displayName: 'Inline',
              name: 'inline',
              type: 'boolean',
              default: false,
              description: 'Whether this field should be displayed inline with other fields.',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Mention Roles',
      name: 'mentionRoles',
      type: 'multiOptions',
      typeOptions: {
        loadOptionsMethod: 'getRoles',
      },
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
        },
      },
      default: [],
      description: 'Roles to mention in the message.',
    },
    {
      displayName: 'Files',
      name: 'files',
      placeholder: 'Add File',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
        },
      },
      default: {},
      options: [
        {
          name: 'file',
          displayName: 'File',
          values: [
            {
              displayName: 'File URL or Base64',
              name: 'url',
              type: 'string',
              default: '',
              description: 'URL of the file to attach or base64 encoded file data.',
            },
            {
              displayName: 'Filename',
              name: 'filename',
              type: 'string',
              default: '',
              description: 'Name of the file (optional, will be auto-detected from URL if not provided).',
            },
            {
              displayName: 'Description',
              name: 'description',
              type: 'string',
              default: '',
              description: 'Description of the file (optional).',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Components',
      name: 'components',
      type: 'boolean',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
        },
      },
      default: false,
      description: 'Add interactive components like buttons and select menus (Discord.js v14 feature).',
    },
    {
      displayName: 'Component Type',
      name: 'componentType',
      type: 'options',
      options: [
        {
          name: 'Button',
          value: 'button',
        },
        {
          name: 'Select Menu',
          value: 'selectMenu',
        },
      ],
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          components: [true],
        },
      },
      default: 'button',
      description: 'Type of component to add to the message.',
    },
    {
      displayName: 'Button Label',
      name: 'buttonLabel',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          components: [true],
          componentType: ['button'],
        },
      },
      default: 'Click Me',
      description: 'The text displayed on the button.',
    },
    {
      displayName: 'Button Style',
      name: 'buttonStyle',
      type: 'options',
      options: [
        {
          name: 'Primary (Blue)',
          value: 1,
        },
        {
          name: 'Secondary (Gray)',
          value: 2,
        },
        {
          name: 'Success (Green)',
          value: 3,
        },
        {
          name: 'Danger (Red)',
          value: 4,
        },
        {
          name: 'Link',
          value: 5,
        },
      ],
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          components: [true],
          componentType: ['button'],
        },
      },
      default: 1,
      description: 'The style of the button.',
    },
    {
      displayName: 'Button Custom ID',
      name: 'buttonCustomId',
      type: 'string',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          components: [true],
          componentType: ['button'],
        },
      },
      default: 'button_1',
      description: 'Unique identifier for the button (used for interaction handling).',
    },
    {
      displayName: 'Allowed Mentions',
      name: 'allowedMentions',
      type: 'boolean',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
        },
      },
      default: false,
      description: 'Configure mention behavior (Discord.js v14 feature).',
    },
    {
      displayName: 'Parse Everyone',
      name: 'parseEveryone',
      type: 'boolean',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          allowedMentions: [true],
        },
      },
      default: false,
      description: 'Whether to parse @everyone and @here mentions.',
    },
    {
      displayName: 'Parse Users',
      name: 'parseUsers',
      type: 'boolean',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          allowedMentions: [true],
        },
      },
      default: true,
      description: 'Whether to parse user mentions.',
    },
    {
      displayName: 'Parse Roles',
      name: 'parseRoles',
      type: 'boolean',
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
          allowedMentions: [true],
        },
      },
      default: true,
      description: 'Whether to parse role mentions.',
    },
  ],
)

/**
 * Executes the Discord send message operation
 *
 * Main execution function for sending messages to Discord channels. Handles multiple
 * items in batch, validates all inputs using Discord.js patterns, and provides
 * comprehensive error handling with n8n error types. Supports embeds, components,
 * file attachments, and mention controls.
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to array of execution data arrays (n8n standard format)
 * @throws NodeOperationError for invalid channel IDs, Discord API errors, or network issues
 *
 * @example
 * // Called by n8n workflow engine
 * const results = await execute.call(this);
 * // Returns: [[{ json: { id: '123', content: 'Hello', ... }, pairedItem: { item: 0 } }]]
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = []
  const items: INodeExecutionData[] = this.getInputData()

  // CRITICAL: Create Discord client for message operations
  // Import dynamically to avoid circular dependencies
  const { createV2DiscordClient, getV2DiscordCredentials, releaseV2DiscordClientByInstance } = await import(
    '../../helpers'
  )

  const credentials = await getV2DiscordCredentials.call(this)
  const client = await createV2DiscordClient.call(this, credentials)

  if (!client) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for message operations')
  }

  // Validate client is ready before processing items
  if (!client.isReady()) {
    throw new NodeOperationError(this.getNode(), 'Discord client failed to initialize properly', {
      description: 'The Discord client connection is not ready. Please check your bot token and try again.',
    })
  }

  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      // Get channel ID and validate using Discord.js patterns
      const channelId = this.getNodeParameter('channelId', itemIndex) as string
      const content = this.getNodeParameter('content', itemIndex) as string

      if (!channelId) {
        continue
      }

      // Validate channel ID using Discord.js snowflake validation
      if (!isValidSnowflake(channelId)) {
        throw new NodeOperationError(this.getNode(), `Invalid channel ID: ${channelId}`, { itemIndex })
      }

      // Prepare embeds using existing helper function
      const embed = buildEmbedConfig(this, itemIndex)
      const embeds = embed ? [embed] : undefined

      // Prepare allowed mentions using existing helper
      const allowedMentions = buildAllowedMentions(this, itemIndex)

      // Prepare file attachments using existing helper
      const processedFiles = buildFileAttachments(this, itemIndex)

      // Prepare components using existing helper (Discord.js v14 components)
      const { components } = buildComponents(this, itemIndex)

      try {
        // Send message using Discord.js v14 API with enhanced error handling
        const response = await sendChannelMessage.call(
          this,
          channelId,
          content,
          {
            embeds,
            components,
            allowedMentions,
          },
          processedFiles,
          client, // CRITICAL: Pass the Discord client
        )

        // Note: Component interaction collection is handled by the Discord Trigger node
        // V2 operations send messages but don't wait for responses (stateless design)
        // For interactive workflows, use the Discord Trigger node to capture button/select interactions

        returnData.push({
          json: {
            messageId: response.id,
            channelId: response.channel_id,
            content: response.content,
            embeds: response.embeds,
            components: response.components,
            timestamp: response.timestamp,
            author: response.author,
            discordVersion: 'v14',
          },
          pairedItem: { item: itemIndex },
        })
      } catch (error) {
        // Use standardized Discord error handling
        if (error instanceof DiscordAPIError || error instanceof RateLimitError || error instanceof HTTPError) {
          throw parseDiscordError.call(this, error, itemIndex)
        } else {
          throw prepareErrorData.call(this, error, itemIndex)
        }
      }
    }

    return [returnData]
  } finally {
    // Release Discord client back to the pool
    if (client) {
      await releaseV2DiscordClientByInstance(client)
    }
  }
}
