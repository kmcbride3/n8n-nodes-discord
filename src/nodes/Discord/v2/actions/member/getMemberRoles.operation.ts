/**
 * GetMemberRoles Operation
 * Fetches multiple getmemberroles from a guild
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import {
  collectionToArray,
  executeV2OperationWithClient,
  fetchGuild,
  simplifyRole,
  updateDisplayOptions,
} from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['user'],
      operation: ['getMemberRoles'],
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
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the user',
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

interface IGET_GetMemberRolesCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_GetMemberRolesCredentials>(this, {
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
      const userId = ctx.getNodeParameter('userId', itemIndex) as string
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const guild = await fetchGuild(ctx, client, guildId, itemIndex)
      const member = await guild.members.fetch(userId)

      // Get member's roles (excluding @everyone)
      const roles = member.roles.cache.filter((role) => role.id !== guildId)
      const items = collectionToArray(roles, simplify ? simplifyRole : undefined)

      return {
        json: {
          guildId,
          userId,
          count: items.length,
          roles: items,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
