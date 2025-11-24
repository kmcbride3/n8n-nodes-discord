import type { INodeProperties } from 'n8n-workflow'

import * as addRoleOp from './addRole.operation'
import * as banUserOp from './banUser.operation'
import * as getMemberOp from './getMember.operation'
import * as getMemberRolesOp from './getMemberRoles.operation'
import * as kickUserOp from './kickUser.operation'
import * as listMembersOp from './listMembers.operation'
import * as removeRoleOp from './removeRole.operation'
import * as searchMembersOp from './searchMembers.operation'
import * as timeoutUserOp from './timeoutUser.operation'

// Write operations
export const addRole = { execute: addRoleOp.execute, properties: addRoleOp.properties }
export const banUser = { execute: banUserOp.execute, properties: banUserOp.properties }
export const kickUser = { execute: kickUserOp.execute, properties: kickUserOp.properties }
export const removeRole = { execute: removeRoleOp.execute, properties: removeRoleOp.properties }
export const timeoutUser = { execute: timeoutUserOp.execute, properties: timeoutUserOp.properties }

// Read operations
export const getMember = { execute: getMemberOp.execute, properties: getMemberOp.properties }
export const getMemberRoles = { execute: getMemberRolesOp.execute, properties: getMemberRolesOp.properties }
export const listMembers = { execute: listMembersOp.execute, properties: listMembersOp.properties }
export const searchMembers = { execute: searchMembersOp.execute, properties: searchMembersOp.properties }

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['action'],
      },
    },
    options: [
      {
        name: 'Add Role',
        value: 'addRole',
        description: 'Add a role to a member',
        action: 'Add role to member',
      },
      {
        name: 'Remove Role',
        value: 'removeRole',
        description: 'Remove a role from a member',
        action: 'Remove role from member',
      },
      {
        name: 'Kick User',
        value: 'kickMember',
        description: 'Kick a user from the server',
        action: 'Kick user',
      },
      {
        name: 'Ban User',
        value: 'banMember',
        description: 'Ban a user from the server',
        action: 'Ban user',
      },
      {
        name: 'Timeout User',
        value: 'timeoutMember',
        description: 'Timeout a user in the server',
        action: 'Timeout user',
      },
    ],
    default: 'addRole',
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['member'],
      },
    },
    options: [
      {
        name: 'Get Member',
        value: 'getMember',
        description: 'Get information about a guild member',
        action: 'Get a member',
      },
      {
        name: 'Get Member Roles',
        value: 'getMemberRoles',
        description: 'Get all roles for a guild member',
        action: 'Get member roles',
      },
      {
        name: 'List Members',
        value: 'listMembers',
        description: 'Get a list of guild members',
        action: 'List members',
      },
      {
        name: 'Search Members',
        value: 'searchMembers',
        description: 'Search for guild members by username or nickname',
        action: 'Search members',
      },
    ],
    default: 'getMember',
  },
  ...addRole.properties,
  ...removeRole.properties,
  ...kickUser.properties,
  ...banUser.properties,
  ...timeoutUser.properties,
  ...getMember.properties,
  ...getMemberRoles.properties,
  ...listMembers.properties,
  ...searchMembers.properties,
]
