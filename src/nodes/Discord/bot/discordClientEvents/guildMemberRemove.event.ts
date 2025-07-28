import { Client, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
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
            addLog(`triggerWorkflow ${trigger.webhookId}`, client)
            const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''
            const isEnabled = await triggerWorkflow(
              trigger.webhookId,
              null,
              placeholderMatchingId,
              state.baseUrl,
              member.user,
              key,
            ).catch((e: Error) => addLog(e.message, client))
            if (isEnabled && trigger.placeholder) {
              const channel = client.channels.cache.get(key)
              if (!channel || !channel.isTextBased()) return
              const placeholder = await (channel as TextChannel)
                .send(trigger.placeholder)
                .catch((e: Error) => addLog(e.message, client))
              if (placeholder) placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder)
            }
          }
        })
      })
    } catch (e) {
      addLog(e instanceof Error ? e.message : String(e), client)
    }
  })
}
