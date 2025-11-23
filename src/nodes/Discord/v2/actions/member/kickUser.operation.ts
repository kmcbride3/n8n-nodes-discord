/**
 * Discord Kick User Operation - V2
 *
 * This module implements the kick member operation for Discord guilds using
 * Discord.js built-in functionality. It removes a user from a server without
 * permanently banning them (they can rejoin with an invite).
 *
 * Requirements:
 * - Bot must have KICK_MEMBERS permission
 * - Cannot kick the server owner
 * - Bot's highest role must be above the target user's highest role
 *
 * @module v2/actions/member/kickUser
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import { executeKickMemberOperation } from '../../../shared'
import { updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['action'],
      operation: ['kickMember'],
    },
  },
  [
    {
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the user to kick from the server.',
    },
    {
      displayName: 'Audit Log Reason',
      name: 'reason',
      type: 'string',
      default: '',
      description: 'Reason for kicking the member (will appear in Discord audit logs).',
    },
  ],
)

/**
 * Kicks a user from a Discord guild
 *
 * This operation removes a member from the server without permanently banning them.
 * The user can rejoin using a valid invite link. Uses Discord.js native kick methods
 * with automatic validation and proper error handling.
 *
 * The bot must have KICK_MEMBERS permission and cannot kick users with higher
 * roles or the server owner. The kick reason appears in the server's audit log.
 *
 * Features:
 * - Non-permanent removal (user can rejoin)
 * - Audit log integration with reason
 * - Role hierarchy validation
 * - Automatic retry on transient failures
 * - Discord.js handles rate limiting
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to execution data array with kick status
 * @throws NodeOperationError if insufficient permissions, invalid user ID, or role hierarchy violation
 *
 * @example
 * // Kick a user from the server
 * const result = await execute.call(this);
 * // Returns: [[{ json: { kicked: true, userId: '123', reason: 'Rule violation' }, pairedItem: { item: 0 } }]]
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeKickMemberOperation(this)
}
