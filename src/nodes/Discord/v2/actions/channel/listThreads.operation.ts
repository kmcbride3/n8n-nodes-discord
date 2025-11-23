/**
 * ListThreads Operation
 * Fetches multiple threads from a guild
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, fetchGuild, simplifyThread, updateDisplayOptions } from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['channel'],
      operation: ['listThreads'],
    },
  },
  [
    {
      displayName: 'Guild ID',
      name: 'guildId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the guild',
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

interface IGET_ListThreadsCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_ListThreadsCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials, NodeOperationError } = await import('../../helpers')
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
      const guildId = ctx.getNodeParameter('guildId', itemIndex) as string
      const limit = ctx.getNodeParameter('limit', itemIndex, 100) as number
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const guild = await fetchGuild(ctx, client, guildId, itemIndex)

      // Fetch active threads from guild
      const threadsFetch = await guild.channels.fetchActiveThreads()

      // Convert to array, slice to limit, and optionally simplify
      const items = Array.from(threadsFetch.threads.values())
        .slice(0, limit)
        .map((thread) => (simplify ? simplifyThread(thread) : thread.toJSON()))

      return {
        json: {
          guildId,
          count: items.length,
          threads: items,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
