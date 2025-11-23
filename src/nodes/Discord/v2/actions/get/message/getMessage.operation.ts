/**
 * Get Message Operation
 * Fetches a single Discord message by ID
 */

import type { Client } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../../helpers'
import {
  executeV2OperationWithClient,
  fetchChannel,
  fetchMessage,
  simplifyMessage,
  updateDisplayOptions,
} from '../../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['message'],
      operation: ['getMessage'],
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
      description: 'The ID of the message to fetch',
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

interface IGetMessageCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGetMessageCredentials>(this, {
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
      const messageId = ctx.getNodeParameter('messageId', itemIndex) as string
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const channel = await fetchChannel(ctx, client, channelId, itemIndex)
      const message = await fetchMessage(ctx, channel, messageId, itemIndex)

      return {
        json: (simplify ? simplifyMessage(message) : message.toJSON()) as IDataObject,
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
