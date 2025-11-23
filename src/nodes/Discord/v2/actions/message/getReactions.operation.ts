/**
 * Get Reactions Operation
 * Get all reactions on a message or users who reacted with a specific emoji
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import {
  collectionToArray,
  executeV2OperationWithClient,
  fetchChannel,
  fetchMessage,
  simplifyUser,
  updateDisplayOptions,
} from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['message'],
      operation: ['getReactions'],
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
      description: 'The channel containing the message',
    },
    {
      displayName: 'Message ID',
      name: 'messageId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the message to get reactions from',
    },
    {
      displayName: 'Mode',
      name: 'mode',
      type: 'options',
      options: [
        {
          name: 'All Reactions Summary',
          value: 'summary',
          description: 'Get count and emoji for all reactions',
        },
        {
          name: 'Users for Specific Emoji',
          value: 'users',
          description: 'Get users who reacted with a specific emoji',
        },
      ],
      default: 'summary',
      description: 'What reaction data to retrieve',
    },
    {
      displayName: 'Emoji',
      name: 'emoji',
      type: 'string',
      displayOptions: {
        show: {
          mode: ['users'],
        },
      },
      default: '',
      description: 'The emoji to get users for (e.g., "👍", "❤️", or custom emoji ID)',
    },
    {
      displayName: 'Limit',
      name: 'limit',
      type: 'number',
      displayOptions: {
        show: {
          mode: ['users'],
        },
      },
      default: 100,
      description: 'Maximum number of users to fetch (1-100)',
      typeOptions: {
        minValue: 1,
        maxValue: 100,
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

interface IGetReactionsCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGetReactionsCredentials>(this, {
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
      const messageId = ctx.getNodeParameter('messageId', itemIndex) as string
      const mode = ctx.getNodeParameter('mode', itemIndex, 'summary') as string
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const channel = await fetchChannel(ctx, client, channelId, itemIndex)
      const message = await fetchMessage(ctx, channel, messageId, itemIndex)

      if (mode === 'summary') {
        // Return summary of all reactions
        const reactions = message.reactions.cache.map((reaction) => ({
          emoji: reaction.emoji.name || reaction.emoji.id,
          emojiId: reaction.emoji.id,
          count: reaction.count,
          me: reaction.me,
        }))

        return {
          json: {
            messageId,
            channelId,
            totalReactions: reactions.length,
            reactions,
          },
        }
      } else {
        // Get users who reacted with specific emoji
        const emoji = ctx.getNodeParameter('emoji', itemIndex) as string
        const limit = ctx.getNodeParameter('limit', itemIndex, 100) as number

        const reaction = message.reactions.cache.find(
          (r) => r.emoji.name === emoji || r.emoji.id === emoji || r.emoji.toString() === emoji,
        )

        if (!reaction) {
          return {
            json: {
              messageId,
              channelId,
              emoji,
              count: 0,
              users: [],
            },
          }
        }

        // Fetch users who reacted
        const users = await reaction.users.fetch({ limit })
        const usersArray = collectionToArray(users, simplify ? simplifyUser : undefined)

        return {
          json: {
            messageId,
            channelId,
            emoji,
            count: reaction.count,
            users: usersArray,
          },
        }
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
