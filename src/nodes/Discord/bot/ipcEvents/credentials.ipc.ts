import { registerCommands } from '../commands'
import { addLog, ICredentials, withTimeout } from '../helpers'
import state from '../state'

let commandsRegistered = false

export default async function credentialsIpc(credentials: ICredentials) {
  console.log('credentialsIpc triggered with credentials:', credentials)
  return new Promise<void>((resolve, reject) => {
    try {
      addLog(`credentials state login ${state.login}, ready ${state.ready}`, state.client)
      if (
        (!state.login && !state.ready) ||
        (state.ready && (state.clientId !== credentials.clientId || state.token !== credentials.token))
      ) {
        if (credentials.token && credentials.clientId) {
          addLog(`credentials login authenticating`, state.client)
          state.login = true
          state.clientId = credentials.clientId
          state.token = credentials.token
          if (!commandsRegistered) {
            registerCommands().catch((e) => {
              addLog(`${e}`, state.client)
            })
            commandsRegistered = true
          }
          withTimeout(state.client.login(credentials.token), 3000)
            .then(() => {
              state.ready = true
              state.login = false
              addLog(`credentials ready`, state.client)
              resolve()
            })
            .catch((e) => {
              state.login = false
              addLog(`credentials error`, state.client)
              reject(e)
            })
        } else {
          addLog(`credentials missing`, state.client)
          reject('credentials missing')
        }
      } else if (state.login) {
        addLog(`credentials login`, state.client)
        reject('credentials login')
      } else {
        resolve()
      }
    } catch (e) {
      state.login = false
      addLog(`${e}`, state.client!)
      reject(e)
    }
  })
}
