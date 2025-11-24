/**
 * Guild Resource Index
 * Exports all guild operations
 */

import type { INodeProperties } from 'n8n-workflow'

import * as getAuditLogOp from './getAuditLog.operation'
import * as getGuildOp from './getGuild.operation'
import * as listBansOp from './listBans.operation'
import * as listChannelsOp from './listChannels.operation'
import * as listEmojisOp from './listEmojis.operation'
import * as listInvitesOp from './listInvites.operation'
import * as listRolesOp from './listRoles.operation'
import * as listWebhooksOp from './listWebhooks.operation'

export const getAuditLog = { execute: getAuditLogOp.execute, properties: getAuditLogOp.properties }
export const getGuild = { execute: getGuildOp.execute, properties: getGuildOp.properties }
export const listBans = { execute: listBansOp.execute, properties: listBansOp.properties }
export const listChannels = { execute: listChannelsOp.execute, properties: listChannelsOp.properties }
export const listEmojis = { execute: listEmojisOp.execute, properties: listEmojisOp.properties }
export const listInvites = { execute: listInvitesOp.execute, properties: listInvitesOp.properties }
export const listRoles = { execute: listRolesOp.execute, properties: listRolesOp.properties }
export const listWebhooks = { execute: listWebhooksOp.execute, properties: listWebhooksOp.properties }

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['guild'],
      },
    },
    options: [
      {
        name: 'Get Audit Log',
        value: 'getAuditLog',
        description: 'Get audit log entries for a guild',
        action: 'Get audit log',
      },
      {
        name: 'Get Guild',
        value: 'getGuild',
        description: 'Get details about a specific guild',
        action: 'Get a guild',
      },
      {
        name: 'List Bans',
        value: 'listBans',
        description: 'List all bans in a guild',
        action: 'List bans',
      },
      {
        name: 'List Channels',
        value: 'listChannels',
        description: 'List all channels in a guild',
        action: 'List channels',
      },
      {
        name: 'List Emojis',
        value: 'listEmojis',
        description: 'List all emojis in a guild',
        action: 'List emojis',
      },
      {
        name: 'List Invites',
        value: 'listInvites',
        description: 'List all invites for a guild',
        action: 'List invites',
      },
      {
        name: 'List Roles',
        value: 'listRoles',
        description: 'List all roles in a guild',
        action: 'List roles',
      },
      {
        name: 'List Webhooks',
        value: 'listWebhooks',
        description: 'List all webhooks in a guild',
        action: 'List webhooks',
      },
    ],
    default: 'getGuild',
  },
  ...getAuditLogOp.properties,
  ...getGuildOp.properties,
  ...listBansOp.properties,
  ...listChannelsOp.properties,
  ...listEmojisOp.properties,
  ...listInvitesOp.properties,
  ...listRolesOp.properties,
  ...listWebhooksOp.properties,
]
