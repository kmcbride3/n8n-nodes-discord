/**
 * Get Messages Operation
 * Fetches multiple messages from a channel with various filters
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
      operation: ['getMessages'],
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
      description: 'The channel to fetch messages from',
    },
    {
      displayName: 'Limit',
      name: 'limit',
      type: 'number',
      default: 50,
      description: 'Maximum number of messages to fetch (1-100)',
      typeOptions: {
        minValue: 1,
        maxValue: 100,
      },
    },
    {
      displayName: 'Fetch Mode',
      name: 'fetchMode',
      type: 'options',
      options: [
        {
          name: 'Latest Messages',
          value: 'latest',
          description: 'Fetch the most recent messages',
        },
        {
          name: 'Before Message ID',
          value: 'before',
          description: 'Fetch messages before a specific message',
        },
        {
          name: 'After Message ID',
          value: 'after',
          description: 'Fetch messages after a specific message',
        },
        {
          name: 'Around Message ID',
          value: 'around',
          description: 'Fetch messages around a specific message',
        },
      ],
      default: 'latest',
      description: 'How to fetch messages',
    },
    {
      displayName: 'Message ID',
      name: 'referenceMessageId',
      type: 'string',
      displayOptions: {
        show: {
          fetchMode: ['before', 'after', 'around'],
        },
      },
      default: '',
      description: 'The message ID to use as reference point',
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

interface IGetMessagesCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGetMessagesCredentials>(this, {
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
      const limit = ctx.getNodeParameter('limit', itemIndex, 50) as number
      const fetchMode = ctx.getNodeParameter('fetchMode', itemIndex, 'latest') as string
      const referenceMessageId = ctx.getNodeParameter('referenceMessageId', itemIndex, '') as string
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const channel = await fetchChannel(ctx, client, channelId, itemIndex)

      if (!('messages' in channel)) {
        const { NodeOperationError } = await import('n8n-workflow')
        throw new NodeOperationError(ctx.getNode(), 'Channel does not support messages', { itemIndex })
      }

      // Build fetch options based on mode
      const fetchOptions: { limit: number; before?: string; after?: string; around?: string } = { limit }

      if (fetchMode === 'before' && referenceMessageId) {
        fetchOptions.before = referenceMessageId
      } else if (fetchMode === 'after' && referenceMessageId) {
        fetchOptions.after = referenceMessageId
      } else if (fetchMode === 'around' && referenceMessageId) {
        fetchOptions.around = referenceMessageId
      }

      // Fetch messages using Discord.js Collection
      const messages = await channel.messages.fetch(fetchOptions)

      // Convert Collection to array and optionally simplify
      const messagesArray = collectionToArray(messages, simplify ? simplifyMessage : undefined)

      return {
        json: {
          channelId,
          fetchMode,
          count: messagesArray.length,
          messages: messagesArray,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
