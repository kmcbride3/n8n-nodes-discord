/**
 * GetAuditLog Operation
 * Fetches multiple getauditlog from a guild
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, fetchGuild, updateDisplayOptions } from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['guild'],
      operation: ['getAuditLog'],
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

interface IGET_GetAuditLogCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IGET_GetAuditLogCredentials>(this, {
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
      const limit = ctx.getNodeParameter('limit', itemIndex, 100) as number

      const guild = await fetchGuild(ctx, client, guildId, itemIndex)

      // Fetch audit logs using Discord.js
      const auditLogs = await guild.fetchAuditLogs({ limit })

      // Convert entries to array
      const items = Array.from(auditLogs.entries.values()).map((entry) => ({
        id: entry.id,
        action: entry.action,
        actionType: entry.actionType,
        reason: entry.reason,
        executor: entry.executor?.toJSON(),
        target: entry.target,
        changes: entry.changes,
        createdAt: entry.createdAt.toISOString(),
      }))

      return {
        json: {
          guildId,
          count: items.length,
          auditLogs: items,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
