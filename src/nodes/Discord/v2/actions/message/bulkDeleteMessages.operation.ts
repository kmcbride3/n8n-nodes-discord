/**
 * Discord Bulk Delete Messages Operation - V2
 *
 * This module implements the bulk me  const credentials = await getV2DiscordCredentials.call(this)
  const client = await createV2DiscordClient.call(this, credentials)

  if (!client) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for bulk message delete operations')
  }

  // Validate client is ready before processing items
  if (!client.isReady()) {
    throw new NodeOperationError(this.getNode(), 'Discord client failed to initialize properly', {
      description: 'The Discord client connection is not ready. Please check your bot token and try again.',
    })
  }

  try {letion operation for Discord using
 * Discord.js built-in functionality. It removes multiple messages from a channel
 * efficiently while respecting Discord API limitations.
 *
 * Discord Limitations:
 * - Maximum 100 messages per bulk delete operation
 * - Messages older than 14 days cannot be bulk deleted
 * - Requires MANAGE_MESSAGES permission
 *
 * @module v2/actions/message/bulkDeleteMessages
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { DiscordLimits, DiscordValidation } from '../../../shared'
import { bulkDeleteMessages, getChannelMessages } from '../../helpers'
import { parseDiscordError, updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['message'],
      operation: ['removeMessages'],
    },
  },
  [
    {
      displayName: 'Channel',
      name: 'channelId',
      required: true,
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getChannels',
      },
      default: '',
      description: 'The channel to remove messages from.',
    },
    {
      displayName: 'How many?',
      name: 'removeMessagesNumber',
      type: 'number',
      required: true,
      default: 1,
      description: `The number of messages to remove from the channel (max ${DiscordLimits.MESSAGE_BULK_DELETE_MAX}).`,
    },
    {
      displayName: 'Audit Log Reason',
      name: 'reason',
      type: 'string',
      default: '',
      description: 'Reason for removing the messages (will appear in Discord audit logs).',
    },
  ],
)

/**
 * Bulk deletes messages from a Discord channel
 *
 * This operation efficiently removes multiple messages from a Discord channel.
 * Fetches recent messages and deletes them in bulk using Discord.js native methods.
 * Automatically filters out messages older than 14 days (Discord API requirement).
 *
 * Features:
 * - Automatic pagination to fetch messages
 * - Filters old messages (>14 days) automatically
 * - Supports continue-on-fail for error resilience
 * - Validates channel ID and message limits
 * - Discord.js handles rate limiting automatically
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to execution data array with deletion statistics
 * @throws NodeOperationError if channel not found, invalid permissions, or limit exceeded
 *
 * @example
 * // Delete 50 messages from a channel
 * const result = await execute.call(this);
 * // Returns: [[{ json: { success: true, deletedCount: 50, channelId: '123' }, pairedItem: { item: 0 } }]]
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
    throw new NodeOperationError(this.getNode(), 'Discord client is required for bulk delete operations')
  }

  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const channelId = this.getNodeParameter('channelId', itemIndex) as string
      const removeMessagesNumber = this.getNodeParameter('removeMessagesNumber', itemIndex) as number
      const reason = this.getNodeParameter('reason', itemIndex, '') as string

      try {
        // Validate using consolidated Discord.js validation and constants
        DiscordValidation.snowflake(channelId, 'Channel ID', this.getNode())

        if (removeMessagesNumber <= 0 || removeMessagesNumber > DiscordLimits.MESSAGE_BULK_DELETE_MAX) {
          throw new NodeOperationError(
            this.getNode(),
            `Number of messages to delete must be between 1 and ${DiscordLimits.MESSAGE_BULK_DELETE_MAX}`,
            { itemIndex },
          )
        }

        if (reason) {
          DiscordValidation.auditLogReason(reason, this.getNode())
        }

        // Get messages to delete
        const messages = await getChannelMessages.call(
          this,
          channelId,
          removeMessagesNumber,
          undefined,
          undefined,
          undefined,
          client,
        )

        if (messages.length === 0) {
          returnData.push({
            json: {
              success: true,
              channelId,
              messagesDeleted: 0,
              message: 'No messages found to delete',
              action: 'removeMessages',
              timestamp: new Date().toISOString(),
            },
            pairedItem: { item: itemIndex },
          })
          continue
        }

        // Extract message IDs
        const messageIds = messages.map((msg) => (msg as { id: string }).id)

        // Bulk delete messages
        await bulkDeleteMessages.call(this, channelId, messageIds, reason || undefined, client)

        returnData.push({
          json: {
            success: true,
            channelId,
            messagesDeleted: messageIds.length,
            requestedCount: removeMessagesNumber,
            actuallyDeleted: messageIds.length,
            reason: reason || undefined,
            action: 'removeMessages',
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
              requestedCount: removeMessagesNumber,
              action: 'removeMessages',
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
