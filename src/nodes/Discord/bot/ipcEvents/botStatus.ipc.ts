import { Client, PresenceStatusData } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { addLog } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on(
    'bot:status',
    (data: { botActivity: string; botActivityType: number; botStatus: PresenceStatusData }, socket: Socket) => {
      try {
        ipc.server.emit(socket, 'bot:status', true)
        if (state.ready) {
          client.user?.setPresence({
            activities: [{ name: data.botActivity, type: data.botActivityType }],
            status: data.botStatus,
          })
        }
      } catch (e) {
        addLog(`${e}`, client)
      }
    },
  )

  ipc.of.bot.on('bot:status', (data: { status: string }) => {
    state.ready = data.status === 'ready'
  })
}
