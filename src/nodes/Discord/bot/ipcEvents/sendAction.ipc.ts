import { Channel, GuildMember, TextChannel, User } from 'discord.js'

import { IDiscordNodeActionParameters } from '../../Discord.node'
import { addLog } from '../helpers'
import state from '../state'

export default async function (process: NodeJS.Process) {
  process.on('message', async (message: { type: string; data: IDiscordNodeActionParameters }) => {
    if (message.type === 'send:action') {
      const nodeParameters = message.data
      try {
        if (state.ready) {
          const executionMatching = state.executionMatching[nodeParameters.executionId]
          let channelId: string = ''
          if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel)
            channelId = executionMatching.channelId
          else channelId = nodeParameters.channelId

          if (!channelId && !nodeParameters.actionType) {
            if (process.send) {
              process.send({ type: 'send:action', data: false })
            }
            return
          }

          state.client.channels
            .fetch(channelId)
            .then(async (channel: Channel | null) => {
              if (!channel || !channel.isTextBased()) return

              const performAction = async () => {
                if (nodeParameters.actionType === 'removeMessages') {
                  await (channel as TextChannel)
                    .bulkDelete(nodeParameters.removeMessagesNumber)
                    .catch((e: any) => addLog(`${e}`, state.client))
                } else if (['addRole', 'removeRole'].includes(nodeParameters.actionType)) {
                  await state.client.users
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
                            if (!roles.cache.has(roleId) && nodeParameters.actionType === 'addRole') roles.add(roleId)
                            else if (roles.cache.has(roleId) && nodeParameters.actionType === 'removeRole')
                              roles.remove(roleId)
                          })
                        })
                        .catch((e: any) => addLog(`${e}`, state.client))
                    })
                    .catch((e: any) => {
                      addLog(`${e}`, state.client)
                    })
                }
              }

              if (nodeParameters.triggerPlaceholder && executionMatching.placeholderId) {
                const realPlaceholderId = state.placeholderMatching[executionMatching.placeholderId]
                if (realPlaceholderId) {
                  const message = (await channel.messages.fetch(realPlaceholderId).catch((e: any) => {
                    addLog(`${e}`, state.client)
                  })) as any
                  delete state.placeholderMatching[executionMatching.placeholderId]
                  if (message && message.delete) {
                    // delete message
                    let t = 0
                    const retry = async () => {
                      if (state.placeholderWaiting[executionMatching.placeholderId] && t < 10) {
                        t++
                        setTimeout(() => retry(), 300)
                      } else {
                        await message.delete().catch((e: any) => {
                          addLog(`${e}`, state.client)
                        })

                        await performAction()
                        if (process.send) {
                          process.send({
                            type: 'send:action',
                            data: {
                              channelId,
                              action: nodeParameters.actionType,
                            },
                          })
                        }
                      }
                    }
                    retry()
                    return
                  }
                }
              }

              await performAction()
              if (process.send) {
                process.send({
                  type: 'send:action',
                  data: {
                    channelId,
                    action: nodeParameters.actionType,
                  },
                })
              }
            })
            .catch((e: any) => {
              addLog(`${e}`, state.client)
              if (process.send) {
                process.send({ type: 'send:action', data: false })
              }
            })
        }
      } catch (e) {
        addLog(`${e}`, state.client)
        if (process.send) {
          process.send({ type: 'send:action', data: false })
        }
      }
    }
  })
}
