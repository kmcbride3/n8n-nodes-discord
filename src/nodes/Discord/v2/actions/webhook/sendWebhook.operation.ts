import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { validateWebhookToken } from '../../../helpers'
import { buildFileAttachments, getFileAttachmentProperty } from '../../helpers/file-attachments'
import {
  buildEnhancedEmbed,
  executeV2Operation,
  executeWebhookMessage,
  getEnhancedEmbedProperties,
  updateDisplayOptions,
} from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['webhook'],
      operation: ['send'],
    },
  },
  [
    {
      displayName: 'Webhook ID',
      name: 'webhookId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the Discord webhook',
    },
    {
      displayName: 'Webhook Token',
      name: 'webhookToken',
      type: 'string',
      required: true,
      default: '',
      description: 'The token of the Discord webhook',
    },
    {
      displayName: 'Content',
      name: 'content',
      type: 'string',
      typeOptions: {
        rows: 4,
      },
      default: '',
      description: 'The text content of the webhook message',
    },
    {
      displayName: 'Username Override',
      name: 'username',
      type: 'string',
      default: '',
      description: 'Override the default username of the webhook (Discord.js v14 feature)',
    },
    {
      displayName: 'Avatar URL Override',
      name: 'avatarUrl',
      type: 'string',
      default: '',
      description: 'Override the default avatar of the webhook (Discord.js v14 feature)',
    },
    {
      displayName: 'Wait for Response',
      name: 'wait',
      type: 'boolean',
      default: true,
      description: 'Whether to wait for the Discord API response containing the message data',
    },
    {
      displayName: 'Thread ID',
      name: 'threadId',
      type: 'string',
      default: '',
      description: 'Send the webhook message to a specific thread (Discord.js v14 feature)',
    },
    // Embed properties using centralized enhanced embed builder
    ...getEnhancedEmbedProperties().map(
      (prop): INodeProperties => ({
        ...prop,
        displayOptions: {
          show: {
            resource: ['webhook'],
            operation: ['send'],
            ...(prop.displayOptions?.show || {}),
          },
        },
      }),
    ),
  ],
)

interface IWebhookCredentials {
  // Webhook operations don't need Discord credentials
  noCredentials: true
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2Operation<IWebhookCredentials>(this, {
    getCredentials: async () => ({ noCredentials: true }),
    operation: async (ctx, _credentials, itemIndex) => {
      const webhookId = ctx.getNodeParameter('webhookId', itemIndex) as string
      const webhookToken = ctx.getNodeParameter('webhookToken', itemIndex) as string
      const content = ctx.getNodeParameter('content', itemIndex) as string

      if (!webhookId || !webhookToken) {
        throw new NodeOperationError(ctx.getNode(), 'Webhook ID and Token are required', { itemIndex })
      }

      // Validate webhook token format for security
      validateWebhookToken(webhookToken)

      const username = ctx.getNodeParameter('username', itemIndex, '') as string
      const avatarUrl = ctx.getNodeParameter('avatarUrl', itemIndex, '') as string
      const wait = ctx.getNodeParameter('wait', itemIndex, true) as boolean
      const threadId = ctx.getNodeParameter('threadId', itemIndex, '') as string

      // Build embed using centralized enhanced embed builder
      const embed = buildEnhancedEmbed(ctx, itemIndex)
      const embeds = embed ? [embed] : undefined

      // Process file attachments
      const files = await buildFileAttachments(ctx, itemIndex)

      const response = await executeWebhookMessage.call(
        ctx,
        webhookId,
        webhookToken,
        content || undefined,
        embeds,
        files.length > 0 ? files : undefined,
        undefined, // components
        username || undefined,
        avatarUrl || undefined,
        wait,
        threadId || undefined,
      )

      return {
        json: {
          success: true,
          webhookId,
          ...(wait &&
            response && {
              messageId: response.id,
              channelId: response.channel_id,
              content: response.content,
              embeds: response.embeds,
              timestamp: response.timestamp,
              webhook_id: response.webhook_id,
            }),
          discordVersion: 'v14',
          features: {
            webhookEnhancements: true,
            threadSupport: Boolean(threadId),
            customAppearance: Boolean(username || avatarUrl),
          },
        },
        pairedItem: { item: itemIndex },
      }
    },
  })
}
