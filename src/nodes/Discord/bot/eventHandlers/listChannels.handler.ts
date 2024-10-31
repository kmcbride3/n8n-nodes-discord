import { ChannelType, Client, GuildBasedChannel } from "discord.js"

import { addLog } from "../helpers"
import state from "../state"

export default function listChannelsHandler(client: Client) {
  client.on("list:channels", async () => {
    try {
      if (state.ready) {
        const guild = client.guilds.cache.first()
        const channels =
          guild?.channels.cache.filter(
            (c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement,
          ) ?? ([] as any)

        const channelsList = channels.map((channel: GuildBasedChannel) => {
          return {
            name: channel?.name,
            value: channel.id,
          }
        })

        client.emit("list:channels", channelsList)
        addLog(`list:channels`, client)
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
