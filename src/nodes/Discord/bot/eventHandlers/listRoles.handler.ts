import { Client, Role } from "discord.js"

import { addLog } from "../helpers"
import state from "../state"

export default function listRolesHandler(client: Client) {
  client.on("list:roles", async () => {
    try {
      if (state.ready) {
        const guild = client.guilds.cache.first()
        const roles = guild?.roles.cache ?? ([] as any)

        const rolesList = roles.map((role: Role) => {
          return {
            name: role.name,
            value: role.id,
          }
        })

        client.emit("list:roles", rolesList)
        addLog(`list:roles`, client)
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
