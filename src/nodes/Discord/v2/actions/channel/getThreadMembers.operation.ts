/**
 * GetThreadMembers Operation
 * Fetches multiple getthreadmembers from a guild
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, fetchChannel, updateDisplayOptions } from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['channel'],
      operation: ['getThreadMembers'],
    },
  },
  [
    {
      displayName: 'Thread ID',
      name: 'threadId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the thread',
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

interface IGET_GetThreadMembersCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_GetThreadMembersCredentials>(this, {
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
      const threadId = ctx.getNodeParameter('threadId', itemIndex) as string
      const limit = ctx.getNodeParameter('limit', itemIndex, 100) as number

      const channel = await fetchChannel(ctx, client, threadId, itemIndex)

      // Check if channel is a thread
      if (!channel.isThread()) {
        const { NodeOperationError } = await import('../../helpers')
        throw new NodeOperationError(ctx.getNode(), `Channel ${threadId} is not a thread`, {
          itemIndex,
        })
      }

      // Fetch thread members
      const members = await channel.members.fetch()

      // Convert to array and slice to limit
      const items = Array.from(members.values())
        .slice(0, limit)
        .map((threadMember) => ({
          userId: threadMember.id,
          joinedAt: threadMember.joinedAt?.toISOString(),
          flags: threadMember.flags,
        }))

      return {
        json: {
          threadId,
          count: items.length,
          members: items,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
