/**
 * ListWebhooks Operation
 * Fetches multiple webhooks from a guild
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../../helpers'
import { executeV2OperationWithClient, fetchChannel, simplifyWebhook, updateDisplayOptions } from '../../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['channel'],
      operation: ['listWebhooks'],
    },
  },
  [
    {
      displayName: 'Channel ID',
      name: 'channelId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the channel',
    },
    {
      displayName: 'Limit',
      name: 'limit',
      type: 'number',
      default: 100,
      description: 'Maximum number of items to fetch',
      typeOptions: {
        minValue: 1,
        maxValue: 1000,
      },
    },
    {
      displayName: 'Simplify Output',
      name: 'simplify',
      type: 'boolean',
      default: true,
      description: 'Whether to return simplified output or full Discord API response',
    },
  ],
)

interface IGET_ListWebhooksCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_ListWebhooksCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials, NodeOperationError } = await import('../../../helpers')
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)

      if (!client) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client is required for get operations')
      }

      if (!client.isReady()) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client failed to initialize properly', {
          description: 'The Discord client connection is not ready. Please check your bot token and try again.',
        })
      }

      return { ...credentials, client }
    },
    operation: async (ctx, { client }, itemIndex) => {
      const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
      const limit = ctx.getNodeParameter('limit', itemIndex, 100) as number
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const channel = await fetchChannel(ctx, client, channelId, itemIndex)

      // Check if channel supports webhooks
      if (!('fetchWebhooks' in channel)) {
        const { NodeOperationError } = await import('../../../helpers')
        throw new NodeOperationError(ctx.getNode(), `Channel ${channelId} does not support webhooks`, {
          itemIndex,
          description: 'Only text channels, news channels, forum channels, and stage channels support webhooks',
        })
      }

      // Fetch webhooks using Discord.js
      const webhooks = await channel.fetchWebhooks()

      // Convert to array, slice to limit, and optionally simplify
      const items = Array.from(webhooks.values())
        .slice(0, limit)
        .map((webhook) => (simplify ? simplifyWebhook(webhook) : { ...webhook }))

      return {
        json: {
          channelId,
          count: items.length,
          webhooks: items,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
