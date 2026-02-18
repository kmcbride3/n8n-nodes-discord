import { Client } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { extractDiscordContext, handleV1BotError } from '../../../v2/helpers/error-handling'
import commandsHandle from '../commands'
import { addLog, ICredentials } from '../helpers'
import state from '../state'

interface PendingCredentialRequest {
  data: ICredentials
  socket: Socket
}

// Queue for pending credential requests to prevent race conditions
const credentialQueue: PendingCredentialRequest[] = []
let isProcessingQueue = false

/**
 * Process queued credential requests sequentially
 */
function processCredentialQueue(ipc: typeof Ipc, client: Client): void {
  if (isProcessingQueue || credentialQueue.length === 0) return

  isProcessingQueue = true
  const { data, socket } = credentialQueue.shift()!

  handleCredentialRequest(ipc, client, data, socket, () => {
    isProcessingQueue = false
    processCredentialQueue(ipc, client)
  })
}

/**
 * Handle a single credential request
 */
function handleCredentialRequest(
  ipc: typeof Ipc,
  client: Client,
  data: ICredentials,
  socket: Socket,
  callback: () => void,
): void {
  try {
    addLog(`credentials state login ${state.login}, ready ${state.ready}`, client, 'debug')

    if (
      (!state.login && !state.ready) ||
      (state.ready && (state.clientId !== data.clientId || state.token !== data.token))
    ) {
      if (!data.token || !data.clientId) {
        ipc.server.emit(socket, 'credentials', 'missing')
        callback()
      } else {
        state.login = true
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
            callback()
          })
          .catch((e: Error) => {
            state.login = false
            // Use enhanced error handling for V1 bot operations
            handleV1BotError(e, 'Discord bot login', extractDiscordContext(client))
            addLog(`Login error: ${e.message}`, client, 'error')
            ipc.server.emit(socket, 'credentials', 'error')
            callback()
          })
      }
    } else if (state.login) {
      // Connection in progress - queue this request instead of rejecting
      addLog('Connection in progress, queueing credential request', client, 'debug')
      credentialQueue.push({ data, socket })
      callback()
    } else {
      addLog(`already logged in, ready: ${state.ready}`, client, 'debug')
      ipc.server.emit(socket, 'credentials', 'already')
      callback()
    }
  } catch (e) {
    state.login = false
    // Use enhanced error handling for V1 bot operations
    handleV1BotError(e, 'Discord credentials handling', extractDiscordContext(client))
    addLog(`Error: ${e instanceof Error ? e.message : String(e)}`, client, 'error')
    ipc.server.emit(socket, 'credentials', 'error')
    callback()
  }
}

export default function (ipc: typeof Ipc, client: Client): void {
  ipc.server.on('credentials', (data: ICredentials, socket: Socket) => {
    // Queue the request instead of processing immediately
    credentialQueue.push({ data, socket })
    processCredentialQueue(ipc, client)
  })
}
