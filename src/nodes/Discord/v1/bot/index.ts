import { Client, IntentsBitField, Partials } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'
import Ipc from 'node-ipc'

import guildMemberAdd from './discordClientEvents/guildMemberAdd.event'
import guildMemberRemove from './discordClientEvents/guildMemberRemove.event'
import guildMemberUpdate from './discordClientEvents/guildMemberUpdate.event'
import interactionCreateCmd from './discordClientEvents/interactionCreateCmd.event'
import interactionCreateUI from './discordClientEvents/interactionCreateUI.event'
import messageCreate from './discordClientEvents/messageCreate.event'
import messageUpdate from './discordClientEvents/messageUpdate.event'
import presenceUpdate from './discordClientEvents/presenceUpdate.event'
import threadCreate from './discordClientEvents/threadCreate.event'
import threadUpdate from './discordClientEvents/threadUpdate.event'
import botStatus from './ipcEvents/botStatus.ipc'
import credentials from './ipcEvents/credentials.ipc'
import execution from './ipcEvents/execution.ipc'
import listChannels from './ipcEvents/listChannels.ipc'
import listRoles from './ipcEvents/listRoles.ipc'
import sendAction from './ipcEvents/sendAction.ipc'
import sendMessage from './ipcEvents/sendMessage.ipc'
import sendPrompt from './ipcEvents/sendPrompt.ipc'
import trigger from './ipcEvents/trigger.ipc'

export default function bot() {
  try {
    // Configure IPC
    Ipc.config.id = 'bot'
    Ipc.config.retry = 1500
    Ipc.config.silent = true

    // Create a new Discord client with required intents for modern Discord API
    const client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    })

    // Enhanced Discord.js v14 websocket connection monitoring using proper events
    client.on('shardReady', (shardId) => {
      LoggerProxy.info('Discord websocket shard ready', {
        shardId,
        ping: client.ws.shards.get(shardId)?.ping || 'unknown',
        status: 'ready',
        gateway: 'Discord Gateway v10',
      })
    })

    client.on('shardResume', (shardId, replayedEvents) => {
      LoggerProxy.info('Discord websocket shard resumed', {
        shardId,
        replayedEvents,
        ping: client.ws.shards.get(shardId)?.ping || 'unknown',
        status: 'resumed',
      })
    })

    client.on('shardReconnecting', (shardId) => {
      LoggerProxy.warn('Discord websocket shard reconnecting', {
        shardId,
        reason: 'connection lost',
        status: 'reconnecting',
      })
    })

    client.on('shardDisconnect', (closeEvent, shardId) => {
      LoggerProxy.error('Discord websocket shard disconnected', {
        shardId,
        code: closeEvent.code,
        reason: closeEvent.reason,
        wasClean: closeEvent.wasClean,
        status: 'disconnected',
      })
    })

    client.on('shardError', (error, shardId) => {
      LoggerProxy.error('Discord websocket shard error', {
        shardId,
        error: error.message,
        stack: error.stack,
        status: 'error',
      })
    })

    // Monitor websocket ping for connection health
    setInterval(() => {
      if (client.isReady()) {
        const ping = client.ws.ping
        LoggerProxy.debug('Discord websocket health check', {
          ping,
          status: ping < 100 ? 'excellent' : ping < 200 ? 'good' : ping < 500 ? 'fair' : 'poor',
          shards: client.ws.shards.size,
          guilds: client.guilds.cache.size,
        })
      }
    }, 30000) // Check every 30 seconds

    // Enhanced Discord.js v14 rate limiting integration with n8n logging
    client.rest.on('rateLimited', (rateLimitData) => {
      const { timeToReset, limit, method, hash, url, route, majorParameter, global } = rateLimitData

      LoggerProxy.warn('Discord API rate limit hit', {
        timeToReset,
        limit,
        method: method?.toUpperCase(),
        route,
        majorParameter,
        global,
        url: url ? url.split('?')[0] : 'unknown', // Remove query parameters for cleaner logging
        hash,
        timestamp: new Date().toISOString(),
      })

      // For global rate limits, log at error level
      if (global) {
        LoggerProxy.error('Discord global rate limit exceeded', {
          timeToReset,
          limit,
          route,
          message: 'Bot has hit Discord global rate limit. All API requests will be delayed.',
        })
      }
    })

    // Enhanced response logging for debugging rate limit patterns
    client.rest.on('response', (request, response) => {
      // Only log if there are rate limit headers or non-2xx responses
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
      const rateLimitReset = response.headers.get('x-ratelimit-reset')
      const statusCode = response.status

      if (rateLimitRemaining !== null || statusCode >= 400) {
        LoggerProxy.debug('Discord API response', {
          method: request.method,
          url: request.path?.split('?')[0] || 'unknown', // Use path instead of url
          status: statusCode,
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
          rateLimitReset: rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toISOString() : null,
          rateLimitGlobal: response.headers.get('x-ratelimit-global'),
          rateLimitScope: response.headers.get('x-ratelimit-scope'),
        })
      }
    })

    // Log when the client is ready with websocket and rate limiting context
    client.once('ready', () => {
      LoggerProxy.info('Discord bot ready with enhanced websocket and rate limiting', {
        user: client.user?.tag,
        guilds: client.guilds.cache.size,
        websocketPing: client.ws.ping,
        shards: client.ws.shards.size,
        gatewayVersion: 'Discord Gateway v10',
        features: [
          'websocket connection monitoring',
          'automatic retry',
          'enhanced logging',
          'global rate limit detection',
          'shard health monitoring',
        ],
      })
    })

    // Initialize IPC server
    Ipc.serve(() => {
      // Register Discord client events
      guildMemberAdd(client)
      guildMemberRemove(client)
      guildMemberUpdate(client)
      interactionCreateCmd(client)
      interactionCreateUI(client)
      messageCreate(client)
      messageUpdate(client)
      presenceUpdate(client)
      threadCreate(client)
      threadUpdate(client)

      // Register IPC server events
      botStatus(Ipc, client)
      credentials(Ipc, client)
      execution(Ipc, client)
      listChannels(Ipc, client)
      listRoles(Ipc, client)
      sendAction(Ipc, client)
      sendMessage(Ipc, client)
      sendPrompt(Ipc, client)
      trigger(Ipc, client)
    })

    Ipc.server.start()
  } catch (e) {
    LoggerProxy.error('Discord bot startup failed', { error: e instanceof Error ? e.message : String(e) })
  }
}
