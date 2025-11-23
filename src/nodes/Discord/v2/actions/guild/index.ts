/**
 * Guild Resource Index
 * Exports all guild operations
 */

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
