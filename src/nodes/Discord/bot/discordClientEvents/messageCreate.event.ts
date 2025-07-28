import { Client, Message } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    try {
      const content = message.content
      if (!content || message.author.bot) return

      const botMention = message.mentions.has(client.user?.id || '')

      if (state.channels[message.channelId] || state.channels.all) {
        const triggers = [...(state.channels[message.channelId] ?? []), ...(state.channels.all ?? [])]
        for (const trigger of triggers) {
          if (trigger.type === 'message' && (trigger.pattern?.length || trigger.value?.length || trigger.botMention)) {
            if (trigger.roleIds?.length) {
              const memberRoles = message.member?.roles.cache.map((r) => r.id) ?? []
              const hasRole = trigger.roleIds.some((role) => memberRoles.includes(role))
              if (!hasRole) continue
            }

            if (trigger.botMention && !botMention) continue

            let match = false
            if ((trigger.pattern?.length && trigger.type === 'message') || trigger.value?.length) {
              const regStr = trigger.pattern?.length ? trigger.pattern : `^${trigger.value}$`
              const reg = new RegExp(regStr, trigger.caseSensitive ? '' : 'i')
              match = reg.test(content)
            } else if (botMention) {
              match = true
            }

            if (match) {
              addLog(`triggerWorkflow ${trigger.webhookId}`, client)
              let isEnabled = false
              try {
                const result = await triggerWorkflow(trigger.webhookId, message, '', state.baseUrl)
                isEnabled = Boolean(result)
              } catch (e) {
                addLog(`Error triggering workflow: ${e instanceof Error ? e.message : String(e)}`, client)
              }

              if (!isEnabled && trigger.active) {
                trigger.active = false
              }
            }
          }
        }
      }
    } catch (e) {
      addLog(`Error in messageCreate: ${e instanceof Error ? e.message : String(e)}`, client)
    }
  })
}
