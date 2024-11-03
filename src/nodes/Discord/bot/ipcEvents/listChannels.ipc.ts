import { GuildBasedChannel } from 'discord.js'

import { addLog } from '../helpers'
import state from '../state'

export default async function (process: NodeJS.Process) {
  process.on('message', (message: { type: string }) => {
    if (message.type === 'list:channels') {
      try {
        if (state.ready) {
          const channels = state.client.channels.cache
            .filter((channel): channel is GuildBasedChannel => channel.isTextBased())
            .map((channel) => ({
              name: channel.name,
              value: channel.id,
            }))
          if (process.send) {
            process.send({ type: 'list:channels', data: channels })
          }
        } else {
          if (process.send) {
            process.send({ type: 'list:channels', data: [] })
          }
        }
      } catch (e) {
        addLog(`${e}`, state.client)
      }
    }
  })
}
