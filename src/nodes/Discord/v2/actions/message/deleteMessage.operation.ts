/**
 * Discord Delete Message Operation - V2
 *
 * This module implements the delete message operation for Discord using Discord.js
 * built-in functionality. It permanently removes a message from a Discord channel
 * with proper permission validation and error handling.
 *
 * Requires bot permissions: MANAGE_MESSAGES (or message must be authored by the bot)
 *
 * @module v2/actions/message/deleteMessage
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { DiscordValidation } from '../../../shared'
import type { IV2DiscordCredentials } from '../../helpers'
import { deleteMessage, executeV2OperationWithClient, updateDisplayOptions } from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['message'],
      operation: ['deleteMessage'],
    },
  },
  [
    {
      displayName: 'Channel ID',
      name: 'channelId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the channel containing the message to delete',
    },
    {
      displayName: 'Message ID',
      name: 'messageId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the message to delete',
    },
    {
      displayName: 'Audit Log Reason',
      name: 'reason',
      type: 'string',
      default: '',
      description: 'Reason for deleting the message (will appear in Discord audit logs)',
    },
  ],
)

/**
 * Deletes a single Discord message by ID
 *
 * This operation permanently deletes a message from a Discord channel.
 * Requires proper bot permissions (MANAGE_MESSAGES or message author).
 * Uses Discord.js native deletion methods with automatic rate limiting.
 *
 * Supports continue-on-fail for batch operations. Validates snowflake IDs
 * and audit log reason before executing deletion. Discord.js handles retries
 * automatically (3 attempts with exponential backoff).
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to execution data array with deletion status
 * @throws NodeOperationError if channel/message not found or insufficient permissions
 *
 * @example
 * // Delete a specific message
 * const result = await execute.call(this);
 * // Returns: [[{ json: { success: true, deleted: true, messageId: '123', channelId: '456' }, pairedItem: { item: 0 } }]]
 */
interface IDeleteMessageCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IDeleteMessageCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials } = await import('../../helpers')
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)

      if (!client) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client is required for message delete operations')
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
      const reason = ctx.getNodeParameter('reason', itemIndex, '') as string

      // Validate parameters using consolidated validation
      DiscordValidation.snowflake(channelId, 'Channel ID', ctx.getNode())
      DiscordValidation.snowflake(messageId, 'Message ID', ctx.getNode())

      if (reason) {
        DiscordValidation.auditLogReason(reason, ctx.getNode())
      }

      // Delete message using V2 helpers
      await deleteMessage.call(ctx, channelId, messageId, reason || undefined, client)

      return {
        json: {
          success: true,
          channelId,
          messageId,
          deleted: true,
          reason: reason || undefined,
          timestamp: new Date().toISOString(),
        },
        pairedItem: { item: itemIndex },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
