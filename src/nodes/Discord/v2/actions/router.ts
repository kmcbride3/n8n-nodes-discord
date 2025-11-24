import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import * as channel from './channel'
import * as event from './event'
import * as guild from './guild'
import * as member from './member'
import * as message from './message'
import { sendButton, sendSelect } from './prompt'
import * as role from './role'
import * as user from './user'
import { interactionManager, utility } from './utility'
import { createWebhook, sendWebhook } from './webhook'

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const resource = this.getNodeParameter('resource', 0) as string
  const operation = this.getNodeParameter('operation', 0) as string

  let executionData: INodeExecutionData[][]

  try {
    switch (resource) {
      case 'message':
        switch (operation) {
          case 'send':
            executionData = await message.sendMessage.execute.call(this)
            break
          case 'deleteMessage':
            executionData = await message.deleteMessage.execute.call(this)
            break
          case 'removeMessages':
            executionData = await message.bulkDeleteMessages.execute.call(this)
            break
          case 'getMessage':
            executionData = await message.getMessage.execute.call(this)
            break
          case 'getMessages':
            executionData = await message.getMessages.execute.call(this)
            break
          case 'getPinnedMessages':
            executionData = await message.getPinnedMessages.execute.call(this)
            break
          case 'getReactions':
            executionData = await message.getReactions.execute.call(this)
            break
          case 'searchMessages':
            executionData = await message.searchMessages.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown message operation: ${operation}`)
        }
        break

      case 'prompt':
        switch (operation) {
          case 'button':
            executionData = await sendButton.execute.call(this)
            break
          case 'select':
            executionData = await sendSelect.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown prompt operation: ${operation}`)
        }
        break

      case 'action':
        switch (operation) {
          case 'addRole':
            executionData = await member.addRole.execute.call(this)
            break
          case 'removeRole':
            executionData = await member.removeRole.execute.call(this)
            break
          case 'kickMember':
            executionData = await member.kickUser.execute.call(this)
            break
          case 'banMember':
            executionData = await member.banUser.execute.call(this)
            break
          case 'timeoutMember':
            executionData = await member.timeoutUser.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown action operation: ${operation}`)
        }
        break

      case 'webhook':
        switch (operation) {
          case 'create':
            executionData = await createWebhook.execute.call(this)
            break
          case 'send':
            executionData = await sendWebhook.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown webhook operation: ${operation}`)
        }
        break

      case 'utility':
        switch (operation) {
          case 'utility':
            executionData = await utility.execute.call(this)
            break
          case 'interactionManager':
            executionData = await interactionManager.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown utility operation: ${operation}`)
        }
        break

      case 'channel':
        switch (operation) {
          case 'getChannel':
            executionData = await channel.getChannel.execute.call(this)
            break
          case 'getPermissions':
            executionData = await channel.getPermissions.execute.call(this)
            break
          case 'getThreadMembers':
            executionData = await channel.getThreadMembers.execute.call(this)
            break
          case 'listThreads':
            executionData = await channel.listThreads.execute.call(this)
            break
          case 'listWebhooks':
            executionData = await channel.listWebhooks.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown channel operation: ${operation}`)
        }
        break

      case 'event':
        switch (operation) {
          case 'getEvent':
            executionData = await event.getEvent.execute.call(this)
            break
          case 'getEventUsers':
            executionData = await event.getEventUsers.execute.call(this)
            break
          case 'listEvents':
            executionData = await event.listEvents.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown event operation: ${operation}`)
        }
        break

      case 'guild':
        switch (operation) {
          case 'getAuditLog':
            executionData = await guild.getAuditLog.execute.call(this)
            break
          case 'getGuild':
            executionData = await guild.getGuild.execute.call(this)
            break
          case 'listBans':
            executionData = await guild.listBans.execute.call(this)
            break
          case 'listChannels':
            executionData = await guild.listChannels.execute.call(this)
            break
          case 'listEmojis':
            executionData = await guild.listEmojis.execute.call(this)
            break
          case 'listInvites':
            executionData = await guild.listInvites.execute.call(this)
            break
          case 'listRoles':
            executionData = await guild.listRoles.execute.call(this)
            break
          case 'listWebhooks':
            executionData = await guild.listWebhooks.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown guild operation: ${operation}`)
        }
        break

      case 'member':
        switch (operation) {
          case 'addRole':
            executionData = await member.addRole.execute.call(this)
            break
          case 'removeRole':
            executionData = await member.removeRole.execute.call(this)
            break
          case 'kickMember':
            executionData = await member.kickUser.execute.call(this)
            break
          case 'banMember':
            executionData = await member.banUser.execute.call(this)
            break
          case 'timeoutMember':
            executionData = await member.timeoutUser.execute.call(this)
            break
          case 'getMember':
            executionData = await member.getMember.execute.call(this)
            break
          case 'getMemberRoles':
            executionData = await member.getMemberRoles.execute.call(this)
            break
          case 'listMembers':
            executionData = await member.listMembers.execute.call(this)
            break
          case 'searchMembers':
            executionData = await member.searchMembers.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown member operation: ${operation}`)
        }
        break

      case 'role':
        switch (operation) {
          case 'getRole':
            executionData = await role.getRole.execute.call(this)
            break
          case 'getRoleMembers':
            executionData = await role.getRoleMembers.execute.call(this)
            break
          case 'getRolePermissions':
            executionData = await role.getRolePermissions.execute.call(this)
            break
          case 'listRoles':
            executionData = await role.listRoles.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown role operation: ${operation}`)
        }
        break

      case 'user':
        switch (operation) {
          case 'getUser':
            executionData = await user.getUser.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown user operation: ${operation}`)
        }
        break

      default:
        throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`)
    }
  } catch (error) {
    // Don't double-wrap NodeOperationErrors - preserve original context
    if (error instanceof NodeOperationError) {
      throw error
    }
    throw new NodeOperationError(this.getNode(), error as Error, {
      description: `Error executing Discord ${resource} operation: ${operation}`,
    })
  }

  return executionData
}
