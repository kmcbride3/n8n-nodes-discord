import { Client, ThreadChannel } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('threadCreate', async (thread: ThreadChannel) => {
    try {
      const content = thread.name
      if (!content) return

      const botMention = false // Thread creation doesn't have mentions

      if (state.channels[thread.parentId || ''] || state.channels.all) {
        const triggers = [...(state.channels[thread.parentId || ''] ?? []), ...(state.channels.all ?? [])]
        for (const trigger of triggers) {
          if (
            trigger.type === 'thread_create' &&
            (trigger.pattern?.length || trigger.value?.length || trigger.botMention)
          ) {
            if (trigger.roleIds?.length) {
              // Skip role checking for thread creation as we don't have member info
              continue
            }

            if (trigger.botMention && !botMention) continue

            let match = false
            if ((trigger.pattern?.length && trigger.type === 'thread_create') || trigger.value?.length) {
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
                const result = await triggerWorkflow(trigger.webhookId, null, '', state.baseUrl, undefined, thread.id)
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
      addLog(`Error in threadCreate: ${e instanceof Error ? e.message : String(e)}`, client)
    }
  })
}
