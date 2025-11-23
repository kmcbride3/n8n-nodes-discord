/**
 * Discord Get Node Router
 * Routes operations to their respective handlers
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import * as channel from './channel'
import * as event from './event'
import * as guild from './guild'
import * as message from './message'
import * as role from './role'
import * as user from './user'

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const resource = this.getNodeParameter('resource', 0) as string
  const operation = this.getNodeParameter('operation', 0) as string

  // Route to appropriate resource and operation
  switch (resource) {
    case 'channel':
      switch (operation) {
        case 'getChannel':
          return channel.getChannel.execute.call(this)
        case 'getPermissions':
          return channel.getPermissions.execute.call(this)
        case 'getThreadMembers':
          return channel.getThreadMembers.execute.call(this)
        case 'listThreads':
          return channel.listThreads.execute.call(this)
        case 'listWebhooks':
          return channel.listWebhooks.execute.call(this)
        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation '${operation}' for resource '${resource}'`)
      }

    case 'event':
      switch (operation) {
        case 'getEvent':
          return event.getEvent.execute.call(this)
        case 'getEventUsers':
          return event.getEventUsers.execute.call(this)
        case 'listEvents':
          return event.listEvents.execute.call(this)
        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation '${operation}' for resource '${resource}'`)
      }

    case 'guild':
      switch (operation) {
        case 'getAuditLog':
          return guild.getAuditLog.execute.call(this)
        case 'getGuild':
          return guild.getGuild.execute.call(this)
        case 'listBans':
          return guild.listBans.execute.call(this)
        case 'listChannels':
          return guild.listChannels.execute.call(this)
        case 'listEmojis':
          return guild.listEmojis.execute.call(this)
        case 'listInvites':
          return guild.listInvites.execute.call(this)
        case 'listRoles':
          return guild.listRoles.execute.call(this)
        case 'listWebhooks':
          return guild.listWebhooks.execute.call(this)
        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation '${operation}' for resource '${resource}'`)
      }

    case 'message':
      switch (operation) {
        case 'getMessage':
          return message.getMessage.execute.call(this)
        case 'getMessages':
          return message.getMessages.execute.call(this)
        case 'getPinnedMessages':
          return message.getPinnedMessages.execute.call(this)
        case 'getReactions':
          return message.getReactions.execute.call(this)
        case 'searchMessages':
          return message.searchMessages.execute.call(this)
        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation '${operation}' for resource '${resource}'`)
      }

    case 'role':
      switch (operation) {
        case 'getRole':
          return role.getRole.execute.call(this)
        case 'getRoleMembers':
          return role.getRoleMembers.execute.call(this)
        case 'getRolePermissions':
          return role.getRolePermissions.execute.call(this)
        case 'listRoles':
          return role.listRoles.execute.call(this)
        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation '${operation}' for resource '${resource}'`)
      }

    case 'user':
      switch (operation) {
        case 'getMember':
          return user.getMember.execute.call(this)
        case 'getMemberRoles':
          return user.getMemberRoles.execute.call(this)
        case 'getUser':
          return user.getUser.execute.call(this)
        case 'listMembers':
          return user.listMembers.execute.call(this)
        case 'searchMembers':
          return user.searchMembers.execute.call(this)
        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation '${operation}' for resource '${resource}'`)
      }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown resource '${resource}'`)
  }
}
