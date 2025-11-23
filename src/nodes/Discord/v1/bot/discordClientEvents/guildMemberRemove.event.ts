import { Client, TextChannel } from 'discord.js'

import { generateUniqueId } from '../../../helpers'
import { addLog, handleNonFatalError, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client) {
  client.on('guildMemberRemove', async (member) => {
    try {
      if (member.user.system) return
      const userRoles = member.roles.cache.map((role) => role.id)
      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key]
        channel.forEach(async (trigger) => {
          if (trigger.roleIds?.length) {
            const hasRole = trigger.roleIds.some((role) => userRoles?.includes(role))
            if (!hasRole) return
          }
          if (trigger.type === 'userLeaves') {
            addLog(`Triggering workflow for member leaving: ${member.user.username}`, client, 'info')

            const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''
            const isEnabled = await triggerWorkflow(
              trigger.webhookId,
              null,
              placeholderMatchingId,
              state.baseUrl,
              member.user,
              key,
            ).catch((e) => e)
            if (isEnabled && trigger.placeholder) {
              const channel = client.channels.cache.get(key)
              const placeholder = await (channel as TextChannel)
                .send(trigger.placeholder)
                .catch((e: unknown) => handleNonFatalError('Failed to send placeholder message', client, e, 'error'))
              if (placeholder) placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder)
            }
          }
        })
      })
    } catch (e) {
      addLog(`${e}`, client, 'error')
    }
  })
}
