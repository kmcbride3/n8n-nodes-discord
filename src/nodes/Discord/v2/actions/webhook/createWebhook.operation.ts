import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { createChannelWebhook } from '../../helpers/discord-operations'
import { updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['webhook'],
      operation: ['create'],
    },
  },
  [
    {
      displayName: 'Channel ID',
      name: 'channelId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the channel to create the webhook in',
    },
    {
      displayName: 'Webhook Name',
      name: 'webhookName',
      type: 'string',
      required: true,
      default: '',
      description: 'The name of the webhook',
    },
    {
      displayName: 'Avatar URL',
      name: 'avatarUrl',
      type: 'string',
      default: '',
      description: 'URL for the webhook avatar image (optional)',
    },
    {
      displayName: 'Audit Log Reason',
      name: 'reason',
      type: 'string',
      default: '',
      description: 'Reason for creating the webhook (will appear in Discord audit logs)',
    },
  ],
)

/**
 * Creates a new Discord webhook
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  // Dynamically import Discord client creation helpers
  const { createV2DiscordClient, getV2DiscordCredentials, releaseV2DiscordClientByInstance } = await import(
    '../../helpers'
  )

  // Get credentials and create Discord client
  const credentials = await getV2DiscordCredentials.call(this)
  const client = await createV2DiscordClient.call(this, credentials)

  const returnData: INodeExecutionData[] = []
  const items: INodeExecutionData[] = this.getInputData()

  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const channelId = this.getNodeParameter('channelId', itemIndex) as string
      const webhookName = this.getNodeParameter('webhookName', itemIndex) as string
      const avatarUrl = this.getNodeParameter('avatarUrl', itemIndex, '') as string
      const reason = this.getNodeParameter('reason', itemIndex, '') as string

      if (!channelId || !webhookName) {
        throw new NodeOperationError(this.getNode(), 'Channel ID and Webhook Name are required', {
          itemIndex,
        })
      }

      try {
        const response = await createChannelWebhook.call(
          this,
          channelId,
          webhookName,
          avatarUrl || undefined,
          reason || undefined,
          client ?? undefined,
        )

        returnData.push({
          json: {
            success: true,
            webhookId: response.id,
            webhookToken: response.token,
            webhookUrl: response.url,
            webhookName: response.name,
            channelId: response.channel_id,
            guildId: response.guild_id,
            avatar: response.avatar,
            reason: reason || undefined,
            action: 'createWebhook',
            timestamp: new Date().toISOString(),
          },
          pairedItem: { item: itemIndex },
        })
      } catch (error) {
        returnData.push({
          json: {
            success: false,
            error: error.message,
            channelId,
            webhookName,
            action: 'createWebhook',
          },
          pairedItem: { item: itemIndex },
        })
      }
    }
  } finally {
    if (client) {
      await releaseV2DiscordClientByInstance(client)
    }
  }

  return [returnData]
}
