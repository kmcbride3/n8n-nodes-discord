import { Client, ThreadChannel } from 'discord.js'

import { safeRegexTest } from '../../../helpers'
import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('threadCreate', async (thread: ThreadChannel) => {
    try {
      const content = thread.name
      if (!content) return

      const botMention = false // Thread creation doesn't have mentions

      if (state.channels[thread.parentId || ''] || state.channels.all) {
        ;[...(state.channels[thread.parentId || ''] ?? []), ...(state.channels.all ?? [])].forEach(async (trigger) => {
          if (
            trigger.type === 'thread_create' &&
            (trigger.pattern?.length || trigger.value?.length || trigger.botMention)
          ) {
            if (trigger.roleIds?.length) {
              // Skip role checking for thread creation as we don't have member info
              return
            }

            if (trigger.botMention && !botMention) return

            let match = false
            if ((trigger.pattern?.length && trigger.type === 'thread_create') || trigger.value?.length) {
              const regStr = trigger.pattern?.length ? trigger.pattern : `^${trigger.value}$`
              try {
                match = safeRegexTest(regStr, content, trigger.caseSensitive ? '' : 'i')
              } catch (error) {
                addLog(`Invalid regex pattern in trigger: ${error.message}`, client, 'warn')
                return // Skip this trigger if regex is invalid
              }
            } else if (botMention) {
              match = true
            }

            if (match) {
              addLog(`Triggering workflow for new thread: "${thread.name}"`, client, 'info')
              const isEnabled = await triggerWorkflow(
                trigger.webhookId,
                null,
                '',
                state.baseUrl,
                undefined,
                thread.id,
              ).catch((e: Error) => {
                addLog(`Error triggering workflow: ${e.message}`, client, 'error')
                return false
              })

              if (!isEnabled && trigger.active) {
                trigger.active = false
              }
            }
          }
        })
      }
    } catch (e) {
      addLog(`Error in threadCreate: ${e instanceof Error ? e.message : String(e)}`, client, 'error')
    }
  })
}
