import { Client, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client) {
  client.on('guildMemberAdd', (member) => {
    try {
      if (member.user.system) return
      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key]
        channel.forEach(async (trigger) => {
          if (trigger.type === 'userJoins') {
            addLog(`triggerWorkflow ${trigger.webhookId}`, client)
            const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''
            let isEnabled = false
            try {
              const result = await triggerWorkflow(
                trigger.webhookId,
                null,
                placeholderMatchingId,
                state.baseUrl,
                member.user,
                key,
              )
              isEnabled = Boolean(result)
            } catch (e) {
              addLog(e instanceof Error ? e.message : String(e), client)
            }
            if (isEnabled && trigger.placeholder) {
              const channelObj = client.channels.cache.get(key)
              if (!channelObj || !channelObj.isTextBased()) return
              let placeholder
              try {
                placeholder = await (channelObj as TextChannel).send(trigger.placeholder)
              } catch (e) {
                addLog(e instanceof Error ? e.message : String(e), client)
              }
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
