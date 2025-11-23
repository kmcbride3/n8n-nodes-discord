/**
 * Discord Add Role to Member Operation - V2
 *
 * This module implements the add role operation for Discord guild members using
 * Discord.js built-in functionality. It assigns a role to a user in a Discord server
 * with proper permission validation and audit logging.
 *
 * Requirements:
 * - Bot must have MANAGE_ROLES permission
 * - Bot's highest role must be above the role being assigned
 * - Cannot modify roles of the server owner
 *
 * @module v2/actions/member/addRole
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import { executeAddMemberRoleOperation } from '../../../shared'
import { updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['action'],
      operation: ['addRole'],
    },
  },
  [
    {
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the user to add the role to.',
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
      description: 'The roles to add to the user.',
    },
    {
      displayName: 'Audit Log Reason',
      name: 'reason',
      type: 'string',
      default: '',
      description: 'Reason for adding the role (will appear in Discord audit logs).',
    },
  ],
)

/**
 * Adds a role to a Discord guild member
 *
 * This operation assigns one or more roles to a Discord server member. Uses
 * Discord.js native role management methods with automatic validation and
 * proper error handling. The operation respects Discord's role hierarchy
 * and permission requirements.
 *
 * The bot must have MANAGE_ROLES permission and its highest role must be
 * positioned above the role(s) being assigned. Changes appear in the server's
 * audit log with the specified reason.
 *
 * Note: The shared operation executor already implements continueOnFail handling
 * internally for batch processing resilience.
 *
 * Features:
 * - Supports multiple role assignments
 * - Validates role hierarchy
 * - Audit log integration
 * - Automatic retry on transient failures
 * - Discord.js handles rate limiting
 * - Continue-on-fail for error resilience
 *
 * @param this - n8n execution context with helper methods
 * @returns Promise resolving to execution data array with role assignment status
 * @throws NodeOperationError if insufficient permissions, invalid IDs, or role hierarchy violation (when continueOnFail is disabled)
 *
 * @example
 * // Add "Member" role to a user
 * const result = await execute.call(this);
 * // Returns: [[{ json: { roleAdded: true, userId: '123', roleId: '456', reason: 'Promoted' }, pairedItem: { item: 0 } }]]
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  // The shared operation executor already handles continueOnFail internally
  return executeAddMemberRoleOperation(this)
}
