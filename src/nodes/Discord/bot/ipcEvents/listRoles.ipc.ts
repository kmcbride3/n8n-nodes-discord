import { Client, Role } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { addLog } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('list:roles', (data: undefined, socket: Socket) => {
    try {
      if (state.ready) {
        const guild = client.guilds.cache.first()
        const roles = guild?.roles.cache ?? new Map<string, Role>()

        const rolesList = Array.from(roles.values()).map((role: Role) => {
          return {
            name: role.name,
            value: role.id,
          }
        })

        ipc.server.emit(socket, 'list:roles', rolesList)
        addLog('list:roles', client)
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })

  ipc.of.bot.on('list:roles', (data: { roles: string[] }) => {
    state.roles = data.roles
  })
}
