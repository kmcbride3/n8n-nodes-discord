import type { INodeProperties } from 'n8n-workflow'

import { execute as addRoleExecute, properties as addRoleProperties } from './addRole.operation'
import { execute as banUserExecute, properties as banUserProperties } from './banUser.operation'
import { execute as kickUserExecute, properties as kickUserProperties } from './kickUser.operation'
import { execute as removeRoleExecute, properties as removeRoleProperties } from './removeRole.operation'
import { execute as timeoutUserExecute, properties as timeoutUserProperties } from './timeoutUser.operation'

export const addRole = { execute: addRoleExecute, properties: addRoleProperties }
export const banUser = { execute: banUserExecute, properties: banUserProperties }
export const kickUser = { execute: kickUserExecute, properties: kickUserProperties }
export const removeRole = { execute: removeRoleExecute, properties: removeRoleProperties }
export const timeoutUser = { execute: timeoutUserExecute, properties: timeoutUserProperties }

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
  ...addRole.properties,
  ...removeRole.properties,
  ...kickUser.properties,
  ...banUser.properties,
  ...timeoutUser.properties,
]
