import { PresenceStatusData } from 'discord.js'

import { addLog } from '../helpers'
import state from '../state'

export default async function (process: NodeJS.Process) {
  process.on(
    'message',
    (message: {
      type: string
      data: {
        botActivity: string
        botActivityType: number
        botStatus: PresenceStatusData
      }
    }) => {
      if (message.type === 'bot:status') {
        const data = message.data
        try {
          if (process.send) {
            process.send({ type: 'bot:status', data: true })
          }
          if (state.ready) {
            state.client.user?.setPresence({
              activities: [{ name: data.botActivity, type: data.botActivityType }],
              status: data.botStatus,
            })
          }
        } catch (e) {
          addLog(`${e}`, state.client)
        }
      }
    },
  )
}
