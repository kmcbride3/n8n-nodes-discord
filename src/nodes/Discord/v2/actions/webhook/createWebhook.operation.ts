import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { createChannelWebhook, executeV2OperationWithClient, updateDisplayOptions } from '../../helpers'

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

interface ICreateWebhookCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<ICreateWebhookCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials } = await import('../../helpers')
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)

      return { ...credentials, client: client! }
    },
    operation: async (ctx, { client }, itemIndex) => {
      const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
      const webhookName = ctx.getNodeParameter('webhookName', itemIndex) as string
      const avatarUrl = ctx.getNodeParameter('avatarUrl', itemIndex, '') as string
      const reason = ctx.getNodeParameter('reason', itemIndex, '') as string

      if (!channelId || !webhookName) {
        throw new NodeOperationError(ctx.getNode(), 'Channel ID and Webhook Name are required', {
          itemIndex,
        })
      }

      const response = await createChannelWebhook.call(
        ctx,
        channelId,
        webhookName,
        avatarUrl || undefined,
        reason || undefined,
        client,
      )

      return {
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
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
