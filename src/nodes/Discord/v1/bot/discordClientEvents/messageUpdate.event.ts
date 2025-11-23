import { Client } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('messageUpdate', (oldMessage, newMessage) => {
    try {
      if (Object.keys(state.channels).length > 0) {
        const matchedTriggers = Object.values(state.channels).flatMap((triggers) =>
          triggers.filter(
            (trigger) => trigger.type === 'message_update' && trigger.channelIds?.includes(newMessage.channel.id),
          ),
        )

        matchedTriggers.forEach(async (trigger) => {
          addLog(`Triggering workflow for message edit from ${newMessage.author.username}`, client, 'info')

          await triggerWorkflow(trigger.webhookId, newMessage, '', state.baseUrl).catch((e: Error) => {
            addLog(`Error triggering workflow: ${e.message}`, client, 'error')
          })
        })
      }
    } catch (e) {
      addLog(`${e}`, client, 'error')
    }
  })
}
