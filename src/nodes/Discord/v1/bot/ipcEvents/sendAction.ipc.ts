import { Channel, Client, GuildMember, TextChannel, User } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { IDiscordNodeActionParameters } from '../../../Discord.node'
import { addLog, handleNonFatalError, withWorkflowContext } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('send:action', (nodeParameters: IDiscordNodeActionParameters, socket: Socket) => {
    withWorkflowContext(nodeParameters.workflowId || null, () => {
      try {
        if (state.ready) {
          const executionMatching = state.executionMatching.get(nodeParameters.executionId)
          let channelId = ''
          if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel)
            channelId = executionMatching?.channelId || ''
          else channelId = nodeParameters.channelId

          if (!channelId && !nodeParameters.actionType) {
            ipc.server.emit(socket, 'send:action', false)
            return
          }

          client.channels
            .fetch(channelId)
            .then(async (channel: Channel | null): Promise<void> => {
              if (!channel || !channel.isTextBased()) return

              const performAction = async () => {
                if (nodeParameters.actionType === 'removeMessages') {
                  await (channel as TextChannel)
                    .bulkDelete(nodeParameters.removeMessagesNumber)
                    .catch((e: Error) => handleNonFatalError('Failed to bulk delete messages', client, e, 'error'))
                } else if (['addRole', 'removeRole'].includes(nodeParameters.actionType)) {
                  await client.users
                    .fetch(nodeParameters.userId as string)
                    .then(async (user: User) => {
                      await (channel as TextChannel).guild.members
                        .fetch(user)
                        .then((member: GuildMember) => {
                          const roles = member.roles
                          const roleUpdateIds =
                            typeof nodeParameters.roleUpdateIds === 'string'
                              ? nodeParameters.roleUpdateIds.split(',')
                              : nodeParameters.roleUpdateIds
                          ;(roleUpdateIds ?? []).forEach((roleId: string) => {
                            if (!roles.cache.has(roleId) && nodeParameters.actionType === 'addRole')
                              roles.add(roleId, nodeParameters.auditLogReason)
                            else if (roles.cache.has(roleId) && nodeParameters.actionType === 'removeRole')
                              roles.remove(roleId, nodeParameters.auditLogReason)
                          })
                        })
                        .catch((e: Error) => handleNonFatalError('Failed to update member roles', client, e, 'error'))
                    })
                    .catch((e: Error) => {
                      addLog(`${e}`, client, 'error')
                    })
                }
              }

              if (nodeParameters.triggerPlaceholder && executionMatching?.placeholderId) {
                const realPlaceholderId = state.placeholderMatching.get(executionMatching.placeholderId)
                if (realPlaceholderId) {
                  const message = await channel.messages.fetch(realPlaceholderId).catch((e: Error) => {
                    addLog(`${e}`, client, 'error')
                  })
                  if (executionMatching.placeholderId) {
                    state.placeholderMatching.delete(executionMatching.placeholderId)
                  }
                  if (message?.delete) {
                    // Note: This retry logic is for WORKFLOW STATE synchronization (placeholder deletion),
                    // NOT for Discord API retries. Discord.js handles API retries automatically.
                    // This waits for the workflow execution state to be ready before deleting the placeholder.
                    let retryCount = 0
                    const retry = async () => {
                      if (
                        executionMatching.placeholderId &&
                        state.placeholderWaiting.get(executionMatching.placeholderId) &&
                        retryCount < 10
                      ) {
                        retryCount++
                        setTimeout(() => retry(), 300)
                      } else {
                        // Discord.js message.delete() handles its own retries and rate limiting
                        await message.delete().catch((e: Error) => {
                          addLog(`${e}`, client, 'error')
                        })

                        await performAction()
                        ipc.server.emit(socket, 'send:action', {
                          channelId,
                          action: nodeParameters.actionType,
                        })
                      }
                    }
                    await retry()
                    return
                  }
                }
              }

              await performAction()
              ipc.server.emit(socket, 'send:action', {
                channelId,
                action: nodeParameters.actionType,
              })
            })
            .catch((e: Error) => {
              addLog(`${e}`, client, 'error')
              ipc.server.emit(socket, 'send:action', false)
            })
        }
      } catch (e) {
        addLog(`${e}`, client, 'error')
        ipc.server.emit(socket, 'send:action', false)
      }
    })
  })
}
