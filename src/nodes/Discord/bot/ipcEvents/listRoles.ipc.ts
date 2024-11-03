import { addLog } from '../helpers'
import state from '../state'

export default async function (process: NodeJS.Process) {
  process.on('message', (message: { type: string }) => {
    if (message.type === 'list:roles') {
      try {
        if (state.ready) {
          const roles = state.client.guilds.cache
            .map((guild) =>
              guild.roles.cache.map((role) => ({
                name: role.name,
                value: role.id,
              })),
            )
            .flat()
          if (process.send) {
            process.send({ type: 'list:roles', data: roles })
          }
        } else {
          if (process.send) {
            process.send({ type: 'list:roles', data: [] })
          }
        }
      } catch (e) {
        addLog(`${e}`, state.client)
      }
    }
  })
}
