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

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { DiscordValidation } from '../../../shared'
import { deleteMessage } from '../../helpers'
import { parseDiscordError, updateDisplayOptions } from '../../helpers/utils'

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
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = []
  const items: INodeExecutionData[] = this.getInputData()

  // CRITICAL: Create Discord client for message operations
  const { createV2DiscordClient, getV2DiscordCredentials, releaseV2DiscordClientByInstance } = await import(
    '../../helpers'
  )

  const credentials = await getV2DiscordCredentials.call(this)
  const client = await createV2DiscordClient.call(this, credentials)

  if (!client) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for message delete operations')
  }

  // Validate client is ready before processing items
  if (!client.isReady()) {
    throw new NodeOperationError(this.getNode(), 'Discord client failed to initialize properly', {
      description: 'The Discord client connection is not ready. Please check your bot token and try again.',
    })
  }

  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const channelId = this.getNodeParameter('channelId', itemIndex) as string
      const messageId = this.getNodeParameter('messageId', itemIndex) as string
      const reason = this.getNodeParameter('reason', itemIndex, '') as string

      try {
        // Validate parameters using consolidated validation
        DiscordValidation.snowflake(channelId, 'Channel ID', this.getNode())
        DiscordValidation.snowflake(messageId, 'Message ID', this.getNode())

        if (reason) {
          DiscordValidation.auditLogReason(reason, this.getNode())
        }

        // Delete message using V2 helpers
        await deleteMessage.call(this, channelId, messageId, reason || undefined, client)

        returnData.push({
          json: {
            success: true,
            channelId,
            messageId,
            deleted: true,
            reason: reason || undefined,
            timestamp: new Date().toISOString(),
          },
          pairedItem: { item: itemIndex },
        })
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              channelId,
              messageId,
              action: 'deleteMessage',
              timestamp: new Date().toISOString(),
            },
            pairedItem: { item: itemIndex },
          })
        } else {
          throw parseDiscordError.call(this, error, itemIndex)
        }
      }
    }

    return [returnData]
  } finally {
    // Release Discord client back to the pool
    if (client) {
      await releaseV2DiscordClientByInstance(client)
    }
  }
}
