/**
 * Search Messages Operation
 * Search for messages in a channel with filters
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, fetchChannel, simplifyMessage, updateDisplayOptions } from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['message'],
      operation: ['searchMessages'],
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
      description: 'The channel to search messages in',
    },
    {
      displayName: 'Search Query',
      name: 'searchQuery',
      type: 'string',
      default: '',
      description: 'Text to search for in message content (case-insensitive)',
    },
    {
      displayName: 'Limit',
      name: 'limit',
      type: 'number',
      default: 50,
      description: 'Maximum number of messages to search through (1-100)',
      typeOptions: {
        minValue: 1,
        maxValue: 100,
      },
    },
    {
      displayName: 'Filter Options',
      name: 'filterOptions',
      type: 'collection',
      placeholder: 'Add Filter',
      default: {},
      options: [
        {
          displayName: 'Author User ID',
          name: 'authorId',
          type: 'string',
          default: '',
          description: 'Filter by message author user ID',
        },
        {
          displayName: 'Has Attachments',
          name: 'hasAttachments',
          type: 'boolean',
          default: false,
          description: 'Only return messages with attachments',
        },
        {
          displayName: 'Has Embeds',
          name: 'hasEmbeds',
          type: 'boolean',
          default: false,
          description: 'Only return messages with embeds',
        },
        {
          displayName: 'Is Pinned',
          name: 'isPinned',
          type: 'boolean',
          default: false,
          description: 'Only return pinned messages',
        },
      ],
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

interface ISearchMessagesCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<ISearchMessagesCredentials>(this, {
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
      const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
      const searchQuery = ctx.getNodeParameter('searchQuery', itemIndex, '') as string
      const limit = ctx.getNodeParameter('limit', itemIndex, 50) as number
      const filterOptions = ctx.getNodeParameter('filterOptions', itemIndex, {}) as {
        authorId?: string
        hasAttachments?: boolean
        hasEmbeds?: boolean
        isPinned?: boolean
      }
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const channel = await fetchChannel(ctx, client, channelId, itemIndex)

      if (!('messages' in channel)) {
        const { NodeOperationError } = await import('n8n-workflow')
        throw new NodeOperationError(ctx.getNode(), 'Channel does not support messages', { itemIndex })
      }

      // Fetch messages
      const messages = await channel.messages.fetch({ limit })

      // Filter messages based on search criteria
      let filteredMessages = Array.from(messages.values())

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filteredMessages = filteredMessages.filter((msg) => msg.content.toLowerCase().includes(query))
      }

      if (filterOptions.authorId) {
        filteredMessages = filteredMessages.filter((msg) => msg.author.id === filterOptions.authorId)
      }

      if (filterOptions.hasAttachments) {
        filteredMessages = filteredMessages.filter((msg) => msg.attachments.size > 0)
      }

      if (filterOptions.hasEmbeds) {
        filteredMessages = filteredMessages.filter((msg) => msg.embeds.length > 0)
      }

      if (filterOptions.isPinned) {
        filteredMessages = filteredMessages.filter((msg) => msg.pinned)
      }

      // Optionally simplify
      const messagesArray = simplify ? filteredMessages.map(simplifyMessage) : filteredMessages.map((m) => m.toJSON())

      return {
        json: {
          channelId,
          searchQuery,
          filters: filterOptions,
          count: messagesArray.length,
          messages: messagesArray,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
