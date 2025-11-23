/**
 * GetUser Operation
 * Fetches a single user by ID
 */

import type { Client } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, fetchUser, simplifyUser, updateDisplayOptions } from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['user'],
      operation: ['getUser'],
    },
  },
  [
    {
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the user to fetch',
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

interface IGET_GetUserCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_GetUserCredentials>(this, {
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
      const userId = ctx.getNodeParameter('userId', itemIndex) as string
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const user = await fetchUser(ctx, client, userId, itemIndex)

      return {
        json: (simplify ? simplifyUser(user) : user.toJSON()) as IDataObject,
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
