import { Client, ThreadChannel } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('threadUpdate', async (oldThread: ThreadChannel, newThread: ThreadChannel) => {
    try {
      const content = newThread.name
      if (!content) return

      if (state.channels[newThread.parentId || ''] || state.channels.all) {
        const triggers = [...(state.channels[newThread.parentId || ''] ?? []), ...(state.channels.all ?? [])]
        for (const trigger of triggers) {
          if (trigger.type === 'thread_update' && (trigger.pattern?.length || trigger.value?.length)) {
            let match = false
            if ((trigger.pattern?.length && trigger.type === 'thread_update') || trigger.value?.length) {
              const regStr = trigger.pattern?.length ? trigger.pattern : `^${trigger.value}$`
              const reg = new RegExp(regStr, trigger.caseSensitive ? '' : 'i')
              match = reg.test(content)
            }

            if (match) {
              addLog(`triggerWorkflow ${trigger.webhookId}`, client)
              let isEnabled = false
              try {
                const result = await triggerWorkflow(
                  trigger.webhookId,
                  null,
                  '',
                  state.baseUrl,
                  undefined,
                  newThread.id,
                )
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
      addLog(`Error in threadUpdate: ${e instanceof Error ? e.message : String(e)}`, client)
    }
  })
}
