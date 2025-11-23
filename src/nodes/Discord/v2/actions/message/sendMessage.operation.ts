/**
 * Discord Send Message Operation - V2
 *
 * This module implements the send message operation for Discord using Discord.js
 * built-in functionality. It follows n8n best practices with proper error handling,
 * type safety, and comprehensive parameter validation.
 *
 * @module v2/actions/message/sendMessage
 */

import { ButtonStyle, type Client } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { generateUniqueId } from '../../../helpers'
import type { IV2DiscordCredentials } from '../../helpers'
import {
  buildEnhancedEmbed,
  createActionRow,
  createButtonComponent,
  executeV2OperationWithClient,
  getEnhancedEmbedProperties,
  isValidSnowflake,
  sendChannelMessage,
  updateDisplayOptions,
} from '../../helpers'
import {
  buildFileAttachments as buildFileAttachmentsHelper,
  getFileAttachmentProperty,
} from '../../helpers/file-attachments'

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
    // Enhanced embed properties with full Discord.js support
    ...getEnhancedEmbedProperties().map(
      (prop): INodeProperties => ({
        ...prop,
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['send'],
            ...((prop.displayOptions as { show?: Record<string, unknown> })?.show || {}),
          },
        },
      }),
    ),
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
      ...getFileAttachmentProperty(),
      displayOptions: {
        show: {
          resource: ['message'],
          operation: ['send'],
        },
      },
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

interface ISendMessageCredentials extends IV2DiscordCredentials {
  client: Client
}

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
  return executeV2OperationWithClient<ISendMessageCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials } = await import('../../helpers')
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)

      if (!client) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client is required for message operations')
      }

      if (!client.isReady()) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client failed to initialize properly', {
          description: 'The Discord client connection is not ready. Please check your bot token and try again.',
        })
      }

      return { ...credentials, client }
    },
    operation: async (ctx, { client }, itemIndex) => {
      // Get channel ID and validate using Discord.js patterns
      const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
      const content = ctx.getNodeParameter('content', itemIndex) as string

      if (!channelId) {
        throw new NodeOperationError(ctx.getNode(), 'Channel ID is required', { itemIndex })
      }

      // Validate channel ID using Discord.js snowflake validation
      if (!isValidSnowflake(channelId)) {
        throw new NodeOperationError(ctx.getNode(), `Invalid channel ID: ${channelId}`, { itemIndex })
      }

      // Prepare embeds using enhanced embed builder
      const embed = buildEnhancedEmbed(ctx, itemIndex)
      const embeds = embed ? [embed] : undefined

      // Prepare allowed mentions using existing helper
      const allowedMentions = buildAllowedMentions(ctx, itemIndex)

      // Prepare file attachments using enhanced helper with binary data support
      const processedFiles = await buildFileAttachmentsHelper(ctx, itemIndex)

      // Prepare components using existing helper (Discord.js v14 components)
      const { components } = buildComponents(ctx, itemIndex)

      // Send message using Discord.js v14 API with enhanced error handling
      const response = await sendChannelMessage.call(
        ctx,
        channelId,
        content,
        {
          embeds,
          components,
          allowedMentions,
        },
        processedFiles,
        client,
      )

      // Note: Component interaction collection is handled by the Discord Trigger node
      // V2 operations send messages but don't wait for responses (stateless design)
      // For interactive workflows, use the Discord Trigger node to capture button/select interactions

      return {
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
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
