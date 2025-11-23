/**
 * Discord Timeout User Operation - V2
 *
 * This module implements the timeout member operation for Discord guilds using
 * Discord.js built-in functionality. It temporarily restricts a user's ability
 * to interact in the server for a specified duration (up to 28 days).
 *
 * Requirements:
 * - Bot must have MODERATE_MEMBERS permission
 * - Cannot timeout the server owner
 * - Bot's highest role must be above the target user's highest role
 *
 * @module v2/actions/member/timeoutUser
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow'

import { executeTimeoutMemberOperation } from '../../../shared'

export const properties: INodeProperties[] = [
  {
    displayName: 'User ID',
    name: 'userId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['action'],
        operation: ['timeoutMember'],
      },
    },
    default: '',
    description: 'The ID of the user to timeout',
  },
  {
    displayName: 'Timeout Duration',
    name: 'timeoutDuration',
    type: 'options',
    options: [
      {
        name: '1 Minute',
        value: 1,
      },
      {
        name: '5 Minutes',
        value: 5,
      },
      {
        name: '10 Minutes',
        value: 10,
      },
      {
        name: '1 Hour',
        value: 60,
      },
      {
        name: '1 Day',
        value: 1440,
      },
      {
        name: '1 Week',
        value: 10080,
      },
      {
        name: 'Remove Timeout',
        value: 0,
      },
    ],
    displayOptions: {
      show: {
        resource: ['action'],
        operation: ['timeoutMember'],
      },
    },
    default: 10,
    description:
      'Duration of the timeout in minutes (max 28 days = 40320 minutes). Set to 0 to remove an existing timeout.',
  },
  {
    displayName: 'Audit Log Reason',
    name: 'reason',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['action'],
        operation: ['timeoutMember'],
      },
    },
    default: '',
    description: 'Reason for timing out the member (will appear in Discord audit logs)',
  },
]

/**
 * Timeouts a user in a Discord guild
 *
 * This operation temporarily restricts a member's ability to send messages, react,
 * join voice channels, or interact in threads for a specified duration. Uses Discord.js
 * native timeout methods with automatic validation and proper error handling.
 *
 * The bot must have MODERATE_MEMBERS permission and cannot timeout users with higher
 * roles or the server owner. Timeouts can be removed by setting duration to 0.
 * Maximum timeout duration is 28 days (40320 minutes).
 *
 * Features:
 * - Flexible duration options (1 min to 1 week presets)
 * - Remove existing timeouts (duration = 0)
 * - Audit log integration with reason
 * - Role hierarchy validation
 * - Automatic retry on transient failures
 * - Discord.js handles rate limiting
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to execution data array with timeout status
 * @throws NodeOperationError if insufficient permissions, invalid user ID, or role hierarchy violation
 *
 * @example
 * // Timeout a user for 10 minutes
 * const result = await execute.call(this);
 * // Returns: [[{ json: { timedOut: true, userId: '123', duration: 10, reason: 'Spam' }, pairedItem: { item: 0 } }]]
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeTimeoutMemberOperation(this)
}
