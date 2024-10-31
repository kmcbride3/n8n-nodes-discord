import { Client } from "discord.js"

import commands from "../commands"
import { addLog, ICredentials, withTimeout } from "../helpers"
import state from "../state"

export default function credentialsHandler(client: Client) {
  client.on("credentials", async (data: ICredentials) => {
    try {
      addLog(`credentials state login ${state.login}, ready ${state.ready}`, client)
      if (
        (!state.login && !state.ready) ||
        (state.ready && (state.clientId !== data.clientId || state.token !== data.token))
      ) {
        if (data.token && data.clientId) {
          addLog(`credentials login authenticating`, client)
          state.login = true
          await commands(data.token, data.clientId, client).catch((e) => {
            addLog(`${e}`, client)
          })
          await withTimeout(client.login(data.token), 3000)
            .then(() => {
              state.ready = true
              state.login = false
              state.clientId = data.clientId
              state.token = data.token
              client.emit("credentials", "ready")
              addLog(`credentials ready`, client)
            })
            .catch(() => {
              state.login = false
              client.emit("credentials", "error")
              addLog(`credentials error`, client)
            })
        } else {
          client.emit("credentials", "missing")
          addLog(`credentials missing`, client)
        }
      } else if (state.login) {
        client.emit("credentials", "login")
        addLog(`credentials login`, client)
      } else {
        client.emit("credentials", "already")
      }
    } catch (e) {
      state.login = false
      client.emit("credentials", "error")
      addLog(`${e}`, client)
    }
  })
}
