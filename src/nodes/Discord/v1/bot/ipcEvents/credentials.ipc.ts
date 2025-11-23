import { Client } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { extractDiscordContext, handleV1BotError } from '../../../v2/helpers/error-handling'
import commandsHandle from '../commands'
import { addLog, ICredentials } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client): void {
  ipc.server.on('credentials', (data: ICredentials, socket: Socket) => {
    try {
      addLog(`credentials state login ${state.login}, ready ${state.ready}`, client, 'debug')

      if (
        (!state.login && !state.ready) ||
        (state.ready && (state.clientId !== data.clientId || state.token !== data.token))
      ) {
        if (!data.token || !data.clientId) ipc.server.emit(socket, 'credentials', 'missing')
        else {
          state.login = true
          ipc.server.emit(socket, 'credentials', 'login')
          client
            .login(data.token)
            .then(() => {
              addLog('logged !', client, 'info')
              state.ready = true
              state.login = false
              state.clientId = data.clientId
              state.token = data.token
              commandsHandle(data.token, data.clientId, client)
              ipc.server.emit(socket, 'credentials', 'ready')
            })
            .catch((e: Error) => {
              state.login = false
              // Use enhanced error handling for V1 bot operations
              handleV1BotError(e, 'Discord bot login', extractDiscordContext(client))
              addLog(`Login error: ${e.message}`, client, 'error')
              ipc.server.emit(socket, 'credentials', 'error')
            })
        }
      } else if (state.login) {
        ipc.server.emit(socket, 'credentials', 'different')
      } else {
        addLog(`already logged in, ready: ${state.ready}`, client, 'debug')
        ipc.server.emit(socket, 'credentials', 'already')
      }
    } catch (e) {
      state.login = false
      // Use enhanced error handling for V1 bot operations
      handleV1BotError(e, 'Discord credentials handling', extractDiscordContext(client))
      addLog(`Error: ${e instanceof Error ? e.message : String(e)}`, client, 'error')
      ipc.server.emit(socket, 'credentials', 'error')
    }
  })
}
