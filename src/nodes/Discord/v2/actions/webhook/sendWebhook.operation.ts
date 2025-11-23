import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { validateColorHex, validateWebhookToken } from '../../../helpers'
import { executeWebhookMessage } from '../../helpers'
import { updateDisplayOptions } from '../../helpers/utils'

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
    {
      displayName: 'Embed',
      name: 'embed',
      type: 'boolean',
      default: false,
      description: 'Enable rich embed for the webhook message',
    },
    {
      displayName: 'Embed Title',
      name: 'embedTitle',
      type: 'string',
      displayOptions: {
        show: {
          embed: [true],
        },
      },
      default: '',
      description: 'The title of the embed',
    },
    {
      displayName: 'Embed Description',
      name: 'embedDescription',
      type: 'string',
      displayOptions: {
        show: {
          embed: [true],
        },
      },
      typeOptions: {
        rows: 4,
      },
      default: '',
      description: 'The description of the embed',
    },
    {
      displayName: 'Embed Color',
      name: 'embedColor',
      type: 'color',
      displayOptions: {
        show: {
          embed: [true],
        },
      },
      default: '#0099ff',
      description: 'The color of the embed',
    },
  ],
)

/**
 * Sends a message through a Discord webhook
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = []
  const items: INodeExecutionData[] = this.getInputData()

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const webhookId = this.getNodeParameter('webhookId', itemIndex) as string
    const webhookToken = this.getNodeParameter('webhookToken', itemIndex) as string
    const content = this.getNodeParameter('content', itemIndex) as string

    if (!webhookId || !webhookToken) {
      throw new NodeOperationError(this.getNode(), 'Webhook ID and Token are required', { itemIndex })
    }

    // Validate webhook token format for security
    validateWebhookToken(webhookToken)

    const username = this.getNodeParameter('username', itemIndex, '') as string
    const avatarUrl = this.getNodeParameter('avatarUrl', itemIndex, '') as string
    const wait = this.getNodeParameter('wait', itemIndex, true) as boolean
    const threadId = this.getNodeParameter('threadId', itemIndex, '') as string

    // Prepare embeds if enabled
    let embeds: IDataObject[] | undefined
    const embedEnabled = this.getNodeParameter('embed', itemIndex, false) as boolean
    if (embedEnabled) {
      const embedTitle = this.getNodeParameter('embedTitle', itemIndex, '') as string
      const embedDescription = this.getNodeParameter('embedDescription', itemIndex, '') as string
      const embedColor = this.getNodeParameter('embedColor', itemIndex, '#0099ff') as string

      if (embedTitle || embedDescription) {
        embeds = [
          {
            title: embedTitle || undefined,
            description: embedDescription || undefined,
            color: embedColor ? validateColorHex(embedColor) : 0x0099ff,
          },
        ]
      }
    }

    try {
      const response = await executeWebhookMessage.call(
        this,
        webhookId,
        webhookToken,
        content || undefined,
        embeds,
        undefined, // files
        undefined, // components
        username || undefined,
        avatarUrl || undefined,
        wait,
        threadId || undefined,
      )

      returnData.push({
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
      })
    } catch (error) {
      returnData.push({
        json: {
          error: error.message,
          webhookId,
          success: false,
        },
        pairedItem: { item: itemIndex },
      })
    }
  }

  return [returnData]
}
