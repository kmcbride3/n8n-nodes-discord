/**
 * Channel Resource Index
 * Exports all channel operations
 */

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
