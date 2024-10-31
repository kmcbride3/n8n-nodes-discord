import { Client, PresenceStatusData } from "discord.js"

import { addLog } from "../helpers"
import state from "../state"

export default function botStatusHandler(client: Client) {
  client.on(
    "bot:status",
    async (data: { botActivity: string; botActivityType: number; botStatus: PresenceStatusData }) => {
      try {
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
}
