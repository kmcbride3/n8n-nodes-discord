import { Client } from 'discord.js'

import state from '../state'

process.on('message', async (message: { type: string; clientOptions?: any }) => {
  if (message.type === 'init') {
    state.client = new Client(message.clientOptions)
    if (process.send) {
      process.send({ type: 'ready' })
    }
  } else {
    try {
      console.log(`ipcHandler received message: ${message.type}`)
      const handler = await import(`./${message.type}.ipc`)
      await handler.default(process)
    } catch (error) {
      console.error(`Failed to handle message type: ${message.type}`, error)
    }
  }
})
