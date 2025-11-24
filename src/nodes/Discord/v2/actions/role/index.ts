/**
 * Role Resource Index
 * Exports all role operations
 */

import type { INodeProperties } from 'n8n-workflow'

import * as getRoleOp from './getRole.operation'
import * as getRoleMembersOp from './getRoleMembers.operation'
import * as getRolePermissionsOp from './getRolePermissions.operation'
import * as listRolesOp from './listRoles.operation'

export const getRole = { execute: getRoleOp.execute, properties: getRoleOp.properties }
export const getRoleMembers = { execute: getRoleMembersOp.execute, properties: getRoleMembersOp.properties }
export const getRolePermissions = { execute: getRolePermissionsOp.execute, properties: getRolePermissionsOp.properties }
export const listRoles = { execute: listRolesOp.execute, properties: listRolesOp.properties }

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['role'],
      },
    },
    options: [
      {
        name: 'Get Role',
        value: 'getRole',
        description: 'Get details about a specific role',
        action: 'Get a role',
      },
      {
        name: 'Get Role Members',
        value: 'getRoleMembers',
        description: 'Get members with a specific role',
        action: 'Get role members',
      },
      {
        name: 'Get Role Permissions',
        value: 'getRolePermissions',
        description: 'Get permissions for a specific role',
        action: 'Get role permissions',
      },
      {
        name: 'List Roles',
        value: 'listRoles',
        description: 'List all roles in a guild',
        action: 'List roles',
      },
    ],
    default: 'getRole',
  },
  ...getRoleOp.properties,
  ...getRoleMembersOp.properties,
  ...getRolePermissionsOp.properties,
  ...listRolesOp.properties,
]
