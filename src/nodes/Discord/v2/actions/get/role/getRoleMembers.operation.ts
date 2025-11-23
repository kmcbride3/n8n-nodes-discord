/**
 * GetRoleMembers Operation
 * Fetches multiple getrolemembers from a guild
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../../helpers'
import { executeV2OperationWithClient, fetchGuild, simplifyMember, updateDisplayOptions } from '../../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['role'],
      operation: ['getRoleMembers'],
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
      displayName: 'Role ID',
      name: 'roleId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the role',
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

interface IGET_GetRoleMembersCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_GetRoleMembersCredentials>(this, {
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
      const guildId = ctx.getNodeParameter('guildId', itemIndex) as string
      const roleId = ctx.getNodeParameter('roleId', itemIndex) as string
      const limit = ctx.getNodeParameter('limit', itemIndex, 100) as number
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const guild = await fetchGuild(ctx, client, guildId, itemIndex)

      // Verify role exists
      const role = await guild.roles.fetch(roleId)
      if (!role) {
        const { NodeOperationError } = await import('../../../helpers')
        throw new NodeOperationError(ctx.getNode(), `Role ${roleId} not found in guild ${guildId}`, {
          itemIndex,
        })
      }

      // Fetch all members and filter by role
      await guild.members.fetch()
      const membersWithRole = Array.from(guild.members.cache.values())
        .filter((member) => member.roles.cache.has(roleId))
        .slice(0, limit)
        .map((member) => (simplify ? simplifyMember(member) : member.toJSON()))

      return {
        json: {
          guildId,
          roleId,
          count: membersWithRole.length,
          members: membersWithRole,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
