import { Client } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      if (Object.keys(state.channels).length > 0) {
        const matchedTriggers = Object.values(state.channels).flatMap((triggers) =>
          triggers.filter(
            (trigger) => trigger.type === 'message_update' && trigger.channelIds?.includes(newMessage.channel.id),
          ),
        )

        for (const trigger of matchedTriggers) {
          addLog(`triggerWorkflow ${trigger.webhookId}`, client)
          try {
            await triggerWorkflow(trigger.webhookId, newMessage, '', state.baseUrl)
          } catch (e) {
            addLog(`Error triggering workflow: ${e instanceof Error ? e.message : String(e)}`, client)
          }
        }
      }
    } catch (e) {
      addLog(`${e instanceof Error ? e.message : String(e)}`, client)
    }
  })
}
