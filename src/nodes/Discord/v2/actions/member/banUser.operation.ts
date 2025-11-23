/**
 * Discord Ban User Operation - V2
 *
 * This module implements the ban member operation for Discord guilds using
 * Discord.js built-in functionality. It permanently bans a user from a server
 * with optional message history deletion and audit logging.
 *
 * Requirements:
 * - Bot must have BAN_MEMBERS permission
 * - Cannot ban the server owner
 * - Bot's highest role must be above the target user's highest role
 *
 * @module v2/actions/member/banUser
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import { executeBanMemberOperation } from '../../../shared'
import { updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['action'],
      operation: ['banMember'],
    },
  },
  [
    {
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the user to ban from the server',
    },
    {
      displayName: 'Delete Message Days',
      name: 'deleteMessageDays',
      type: 'options',
      options: [
        {
          name: "Don't Delete Any Messages",
          value: 0,
        },
        {
          name: '1 Day',
          value: 1,
        },
        {
          name: '7 Days',
          value: 7,
        },
      ],
      default: 0,
      description: 'Number of days of messages to delete from the banned user',
    },
    {
      displayName: 'Audit Log Reason',
      name: 'reason',
      type: 'string',
      default: '',
      description: 'Reason for banning the member (will appear in Discord audit logs)',
    },
  ],
)

/**
 * Bans a user from a Discord guild
 *
 * This operation permanently bans a member from the server. Optionally deletes
 * the user's message history (up to 7 days). Uses Discord.js native ban methods
 * with automatic validation and proper error handling.
 *
 * The bot must have BAN_MEMBERS permission and cannot ban users with higher
 * roles or the server owner. The ban reason appears in the server's audit log.
 * Banned users cannot rejoin until unbanned.
 *
 * Features:
 * - Optional message deletion (0, 1, or 7 days)
 * - Audit log integration with reason
 * - Role hierarchy validation
 * - Automatic retry on transient failures
 * - Discord.js handles rate limiting
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to execution data array with ban status
 * @throws NodeOperationError if insufficient permissions, invalid user ID, or role hierarchy violation
 *
 * @example
 * // Ban a user and delete 7 days of messages
 * const result = await execute.call(this);
 * // Returns: [[{ json: { banned: true, userId: '123', deleteMessageDays: 7, reason: 'Spam' }, pairedItem: { item: 0 } }]]
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeBanMemberOperation(this)
}
