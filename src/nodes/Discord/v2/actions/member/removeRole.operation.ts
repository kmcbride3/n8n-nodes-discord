/**
 * Discord Remove Role from Member Operation - V2
 *
 * This module implements the remove role operation for Discord guild members using
 * Discord.js built-in functionality. It removes a role from a user in a Discord server
 * with proper permission validation and audit logging.
 *
 * Requirements:
 * - Bot must have MANAGE_ROLES permission
 * - Bot's highest role must be above the role being removed
 * - Cannot modify roles of the server owner
 *
 * @module v2/actions/member/removeRole
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import { executeRemoveMemberRoleOperation } from '../../../shared'
import { updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['action'],
      operation: ['removeRole'],
    },
  },
  [
    {
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the user to remove the role from.',
    },
    {
      displayName: 'Roles',
      name: 'roleUpdateIds',
      required: true,
      type: 'multiOptions',
      typeOptions: {
        loadOptionsMethod: 'getRoles',
      },
      default: [],
      description: 'The roles to remove from the user.',
    },
    {
      displayName: 'Audit Log Reason',
      name: 'reason',
      type: 'string',
      default: '',
      description: 'Reason for removing the role (will appear in Discord audit logs).',
    },
  ],
)

/**
 * Removes a role from a Discord guild member
 *
 * This operation removes one or more roles from a Discord server member. Uses
 * Discord.js native role management methods with automatic validation and
 * proper error handling. The operation respects Discord's role hierarchy
 * and permission requirements.
 *
 * The bot must have MANAGE_ROLES permission and its highest role must be
 * positioned above the role(s) being removed. Changes appear in the server's
 * audit log with the specified reason.
 *
 * Features:
 * - Supports multiple role removals
 * - Validates role hierarchy
 * - Audit log integration
 * - Automatic retry on transient failures
 * - Discord.js handles rate limiting
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to execution data array with role removal status
 * @throws NodeOperationError if insufficient permissions, invalid IDs, or role hierarchy violation
 *
 * @example
 * // Remove "Member" role from a user
 * const result = await execute.call(this);
 * // Returns: [[{ json: { roleRemoved: true, userId: '123', roleId: '456', reason: 'Demoted' }, pairedItem: { item: 0 } }]]
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeRemoveMemberRoleOperation(this)
}
