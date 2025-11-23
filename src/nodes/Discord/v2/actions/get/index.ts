/**
 * Discord Get Actions Index
 * Exports router and properties for the Get node
 */

// Import operation modules to ensure they are bundled
import { properties as getChannelProperties } from '../channel/getChannel.operation'
import { properties as getPermissionsProperties } from '../channel/getPermissions.operation'
import { properties as getThreadMembersProperties } from '../channel/getThreadMembers.operation'
import { properties as listThreadsProperties } from '../channel/listThreads.operation'
import { properties as listWebhooksChannelProperties } from '../channel/listWebhooks.operation'
import { properties as getEventProperties } from '../event/getEvent.operation'
import { properties as getEventUsersProperties } from '../event/getEventUsers.operation'
import { properties as listEventsProperties } from '../event/listEvents.operation'
import { properties as getAuditLogProperties } from '../guild/getAuditLog.operation'
import { properties as getGuildProperties } from '../guild/getGuild.operation'
import { properties as listBansProperties } from '../guild/listBans.operation'
import { properties as listChannelsProperties } from '../guild/listChannels.operation'
import { properties as listEmojisProperties } from '../guild/listEmojis.operation'
import { properties as listInvitesProperties } from '../guild/listInvites.operation'
import { properties as listRolesGuildProperties } from '../guild/listRoles.operation'
import { properties as listWebhooksGuildProperties } from '../guild/listWebhooks.operation'
import { properties as getMessageProperties } from '../message/getMessage.operation'
import { properties as getMessagesProperties } from '../message/getMessages.operation'
import { properties as getPinnedMessagesProperties } from '../message/getPinnedMessages.operation'
import { properties as getReactionsProperties } from '../message/getReactions.operation'
import { properties as searchMessagesProperties } from '../message/searchMessages.operation'
import { properties as getRoleProperties } from '../role/getRole.operation'
import { properties as getRoleMembersProperties } from '../role/getRoleMembers.operation'
import { properties as getRolePermissionsProperties } from '../role/getRolePermissions.operation'
import { properties as listRolesRoleProperties } from '../role/listRoles.operation'
import { properties as getMemberProperties } from '../member/getMember.operation'
import { properties as getMemberRolesProperties } from '../member/getMemberRoles.operation'
import { properties as getUserProperties } from '../user/getUser.operation'
import { properties as listMembersProperties } from '../member/listMembers.operation'
import { properties as searchMembersProperties } from '../member/searchMembers.operation'

export { getProperties } from './properties'
export { router } from './router'

// Export a description array following V2 best practices
// This aggregates all operation properties for the node definition
import type { INodeProperties } from 'n8n-workflow'

export const description: INodeProperties[] = [
  ...getChannelProperties,
  ...getPermissionsProperties,
  ...getThreadMembersProperties,
  ...listThreadsProperties,
  ...listWebhooksChannelProperties,
  ...getEventProperties,
  ...getEventUsersProperties,
  ...listEventsProperties,
  ...getAuditLogProperties,
  ...getGuildProperties,
  ...listBansProperties,
  ...listChannelsProperties,
  ...listEmojisProperties,
  ...listInvitesProperties,
  ...listRolesGuildProperties,
  ...listWebhooksGuildProperties,
  ...getMessageProperties,
  ...getMessagesProperties,
  ...getPinnedMessagesProperties,
  ...getReactionsProperties,
  ...searchMessagesProperties,
  ...getRoleProperties,
  ...getRoleMembersProperties,
  ...getRolePermissionsProperties,
  ...listRolesRoleProperties,
  ...getMemberProperties,
  ...getMemberRolesProperties,
  ...getUserProperties,
  ...listMembersProperties,
  ...searchMembersProperties,
]
