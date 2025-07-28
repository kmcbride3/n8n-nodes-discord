import { ChannelType, Client, GuildBasedChannel } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { addLog } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('list:channels', (data: undefined, socket: Socket) => {
    try {
      if (state.ready) {
        const guild = client.guilds.cache.first()
        const channels =
          guild?.channels.cache.filter(
            (c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement,
          ) ?? ([] as GuildBasedChannel[])
        const channelsList = Array.from(channels.values()).map((channel: GuildBasedChannel) => {
          return {
            name: channel?.name,
            value: channel.id,
          }
        })

        ipc.server.emit(socket, 'list:channels', channelsList)
        addLog('list:channels', client)
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })

  ipc.of.bot.on('list:channels', (data: { channels: string[] }) => {
    state.channelList = data.channels
  })
}
