import { Channel, Client, GuildMember, TextChannel, User } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { IDiscordNodeActionParameters } from '../../Discord.node'
import { addLog } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('send:action', (nodeParameters: IDiscordNodeActionParameters, socket: Socket) => {
    try {
      if (state.ready) {
        const executionMatching = state.executionMatching[nodeParameters.executionId]
        let channelId = ''
        if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel) channelId = executionMatching?.channelId
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
                  .catch((e: Error) => addLog(`${e}`, client))
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
                      .catch((e: Error) => addLog(`${e}`, client))
                  })
                  .catch((e: Error) => {
                    addLog(`${e}`, client)
                  })
              }
            }

            if (nodeParameters.triggerPlaceholder && executionMatching?.placeholderId) {
              const realPlaceholderId = state.placeholderMatching[executionMatching.placeholderId]
              if (realPlaceholderId) {
                const message = await channel.messages.fetch(realPlaceholderId).catch((e: Error) => {
                  addLog(`${e}`, client)
                })
                if (executionMatching.placeholderId) {
                  Reflect.deleteProperty(state.placeholderMatching, executionMatching.placeholderId)
                }
                if (message?.delete) {
                  let retryCount = 0
                  const retry = async () => {
                    if (state.placeholderWaiting[executionMatching.placeholderId] && retryCount < 10) {
                      retryCount++
                      setTimeout(() => retry(), 300)
                    } else {
                      await message.delete().catch((e: Error) => {
                        addLog(`${e}`, client)
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
            addLog(`${e}`, client)
            ipc.server.emit(socket, 'send:action', false)
          })
      }
    } catch (e) {
      addLog(`${e}`, client)
      ipc.server.emit(socket, 'send:action', false)
    }
  })

  ipc.of.bot.on('send:action', (data: { action: string }) => {
    state.lastAction = data.action
  })
}
