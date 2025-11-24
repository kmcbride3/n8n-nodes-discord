/**
 * Channel Resource Index
 * Exports all channel operations
 */

import type { INodeProperties } from 'n8n-workflow'

import * as getChannelOp from './getChannel.operation'
import * as getPermissionsOp from './getPermissions.operation'
import * as getThreadMembersOp from './getThreadMembers.operation'
import * as listThreadsOp from './listThreads.operation'
import * as listWebhooksOp from './listWebhooks.operation'

export const getChannel = { execute: getChannelOp.execute, properties: getChannelOp.properties }
export const getPermissions = { execute: getPermissionsOp.execute, properties: getPermissionsOp.properties }
export const getThreadMembers = { execute: getThreadMembersOp.execute, properties: getThreadMembersOp.properties }
export const listThreads = { execute: listThreadsOp.execute, properties: listThreadsOp.properties }
export const listWebhooks = { execute: listWebhooksOp.execute, properties: listWebhooksOp.properties }

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['channel'],
      },
    },
    options: [
      {
        name: 'Get Channel',
        value: 'getChannel',
        description: 'Get details about a specific channel',
        action: 'Get a channel',
      },
      {
        name: 'Get Permissions',
        value: 'getPermissions',
        description: 'Get permission overwrites for a channel',
        action: 'Get channel permissions',
      },
      {
        name: 'Get Thread Members',
        value: 'getThreadMembers',
        description: 'Get members in a thread',
        action: 'Get thread members',
      },
      {
        name: 'List Threads',
        value: 'listThreads',
        description: 'List active or archived threads in a channel',
        action: 'List threads',
      },
      {
        name: 'List Webhooks',
        value: 'listWebhooks',
        description: 'Get webhooks in a channel',
        action: 'List webhooks',
      },
    ],
    default: 'getChannel',
  },
  ...getChannelOp.properties,
  ...getPermissionsOp.properties,
  ...getThreadMembersOp.properties,
  ...listThreadsOp.properties,
  ...listWebhooksOp.properties,
]
