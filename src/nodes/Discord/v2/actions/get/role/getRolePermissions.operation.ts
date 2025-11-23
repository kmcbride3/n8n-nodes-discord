/**
 * GetRolePermissions Operation
 * Fetches multiple getrolepermissions from a guild
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../../helpers'
import { executeV2OperationWithClient, fetchGuild, NodeOperationError, updateDisplayOptions } from '../../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['role'],
      operation: ['getRolePermissions'],
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
  ],
)

interface IGET_GetRolePermissionsCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_GetRolePermissionsCredentials>(this, {
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

      const guild = await fetchGuild(ctx, client, guildId, itemIndex)
      const role = await guild.roles.fetch(roleId)

      if (!role) {
        throw new NodeOperationError(ctx.getNode(), `Role ${roleId} not found in guild ${guildId}`, { itemIndex })
      }

      // Get role permissions
      const permissions = role.permissions.toArray()

      return {
        json: {
          guildId,
          roleId,
          roleName: role.name,
          permissions,
          permissionsValue: role.permissions.bitfield.toString(),
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
