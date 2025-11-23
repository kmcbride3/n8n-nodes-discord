/**
 * Get Pinned Messages Operation
 * Fetches all pinned messages from a channel
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../../helpers'
import {
  collectionToArray,
  executeV2OperationWithClient,
  fetchChannel,
  simplifyMessage,
  updateDisplayOptions,
} from '../../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['message'],
      operation: ['getPinnedMessages'],
    },
  },
  [
    {
      displayName: 'Channel',
      name: 'channelId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getChannels',
      },
      required: true,
      default: '',
      description: 'The channel to fetch pinned messages from',
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

interface IGetPinnedMessagesCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGetPinnedMessagesCredentials>(this, {
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
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const channel = await fetchChannel(ctx, client, channelId, itemIndex)

      if (!('messages' in channel)) {
        const { NodeOperationError } = await import('n8n-workflow')
        throw new NodeOperationError(ctx.getNode(), 'Channel does not support messages', { itemIndex })
      }

      // Fetch pinned messages using Discord.js
      const pinnedMessages = await channel.messages.fetchPinned()

      // Convert Collection to array and optionally simplify
      const messagesArray = collectionToArray(pinnedMessages, simplify ? simplifyMessage : undefined)

      return {
        json: {
          channelId,
          count: messagesArray.length,
          pinnedMessages: messagesArray,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
