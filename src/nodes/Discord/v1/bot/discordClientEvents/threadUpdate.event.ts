import { Client } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('threadUpdate', (oldThread, newThread) => {
    try {
      if (Object.keys(state.channels).length > 0) {
        const matchedTriggers = Object.values(state.channels).flatMap((triggers) =>
          triggers.filter((trigger) => trigger.type === 'thread_update' && trigger.channelIds?.includes(newThread.id)),
        )

        matchedTriggers.forEach(async (trigger) => {
          addLog(`Triggering workflow for thread update: "${newThread.name}"`, client, 'info')

          await triggerWorkflow(trigger.webhookId, null, '', state.baseUrl, undefined, newThread.id).catch(
            (e: Error) => {
              addLog(`Error triggering workflow: ${e.message}`, client, 'error')
            },
          )
        })
      }
    } catch (e) {
      addLog(`${e}`, client, 'error')
    }
  })
}
