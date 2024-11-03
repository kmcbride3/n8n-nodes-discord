import { fork } from 'child_process'
import path from 'path'

import guildMemberAddEvent from './discordClientEvents/guildMemberAdd.event'
import guildMemberRemoveEvent from './discordClientEvents/guildMemberRemove.event'
import guildMemberUpdateEvent from './discordClientEvents/guildMemberUpdate.event'
import interactionCreateEventCmd from './discordClientEvents/interactionCreateCmd.event'
import interactionCreateEventUI from './discordClientEvents/interactionCreateUI.event'
import messageCreateEvent from './discordClientEvents/messageCreate.event'
import presenceUpdateEvent from './discordClientEvents/presenceUpdate.event'
import threadCreateEvent from './discordClientEvents/threadCreate.event'
import { addLog } from './helpers'
import state from './state'

let ipcListenerAdded = false

export default async function () {
  const client = state.client

  client.on('ready', () => {
    addLog(`Logged in as ${client.user?.tag}`, client)
  })

  // listen to users changing their status events
  presenceUpdateEvent(client)

  // listen to users updates (roles/nickname)
  guildMemberUpdateEvent(client)

  // user joined a server
  guildMemberAddEvent(client)

  // user leaving a server
  guildMemberRemoveEvent(client)

  // the bot listen to all messages and check if it matches a referenced trigger
  messageCreateEvent(client)

  // the bot listen to all threads and check if it matches a referenced trigger
  threadCreateEvent(client)

  // the bot listen to all interactions (button/select) and check if it matches a waiting prompt
  interactionCreateEventUI(client)

  // the bot listen to all interactions (slash commands) and check if it matches a referenced trigger
  interactionCreateEventCmd(client)

  // Simulate the IPC server start
  process.send?.({ type: 'ipc:ready' })

  // Fork the generic handler script with stdio set to include 'ipc'
  const child = fork(path.resolve(__dirname, './ipcEvents/ipcHandler.js'), [], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  })

  // Initialize the child process with the client options
  child.send({ type: 'init', clientOptions: client.options })

  if (!ipcListenerAdded) {
    // Serve IPC events
    process.on('message', async (message: { type: string; data: any }) => {
      console.log('Index: IPC message received:', message.type)
      child.send(message)
    })

    // Handle responses from the child process
    child.on('message', (message: { type: string; data: any }) => {
      console.log('Child process received message:', message.type)
      process.send?.(message)
    })

    ipcListenerAdded = true
  }

  // Send a message to request credentials
  console.log('Requesting credentials')
  process.send?.({ type: 'request:credentials' })
}
