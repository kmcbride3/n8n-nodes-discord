/**
 * Shared Discord Client Manager
 *
 * This module provides unified Discord client management for both V1 bot operations
 * and V2 webhook operations, ensuring efficient resource utilization and consistent
 * Discord.js integration patterns.
 */

import crypto from 'crypto'
import { Client, IntentsBitField, Partials } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'

/**
 * Discord Client Configuration Options
 */
export interface DiscordClientOptions {
  token: string
  intents?: number[]
  partials?: number[]
}

/**
 * Discord Client Connection State
 */
interface DiscordClientState {
  client: Client
  connected: boolean
  lastActivity: number
  referenceCount: number
}

/**
 * Client Pool Management
 */
class DiscordClientManager {
  private static instance: DiscordClientManager
  private clientPool = new Map<string, DiscordClientState>()
  // Map client instances to tokens without mutating client objects
  private clientTokenMap = new WeakMap<Client, string>()
  private readonly cleanupInterval: NodeJS.Timeout
  private readonly maxIdleTime = 30 * 60 * 1000 // 30 minutes

  private constructor() {
    // Cleanup idle clients every 10 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupIdleClients()
      },
      10 * 60 * 1000,
    )
    // Allow Node to exit even if this interval is running (helps tests/short-lived processes)
    if (typeof this.cleanupInterval?.unref === 'function') {
      // @ts-ignore - NodeJS.Timeout has unref in Node
      this.cleanupInterval.unref()
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DiscordClientManager {
    if (!DiscordClientManager.instance) {
      DiscordClientManager.instance = new DiscordClientManager()
    }
    return DiscordClientManager.instance
  }

  /**
   * Get or create a Discord client for the given token
   */
  public async getClient(options: DiscordClientOptions): Promise<Client> {
    const clientKey = this.getClientKey(options.token)
    const existingState = this.clientPool.get(clientKey)

    if (existingState && existingState.connected) {
      existingState.lastActivity = Date.now()
      existingState.referenceCount++
      return existingState.client
    }

    // Create new client
    const client = this.createClient(options)
    // associate client instance with token in WeakMap for later release
    this.clientTokenMap.set(client, options.token)
    const clientState: DiscordClientState = {
      client,
      connected: false,
      lastActivity: Date.now(),
      referenceCount: 1,
    }

    this.clientPool.set(clientKey, clientState)

    try {
      await client.login(options.token)
      clientState.connected = true
      return client
    } catch (error) {
      this.clientPool.delete(clientKey)
      throw error
    }
  }

  /**
   * Create a new Discord client with optimal configuration
   */
  private createClient(options: DiscordClientOptions): Client {
    const intents = options.intents || [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildPresences,
      IntentsBitField.Flags.GuildMessageReactions,
    ]

    const partials = options.partials || [Partials.Message, Partials.Channel, Partials.Reaction]

    const client = new Client({
      intents,
      partials,
      // Let Discord.js handle timeouts and retries automatically
      // No custom timeout/retry configuration needed
    })

    // Add error handlers
    client.on('error', (error) => {
      LoggerProxy.error('Discord client error:', { error })
    })

    client.on('disconnect', () => {
      const clientKey = this.getClientKey(options.token)
      const state = this.clientPool.get(clientKey)
      if (state) {
        state.connected = false
      }
    })

    client.on('ready', () => {
      const clientKey = this.getClientKey(options.token)
      const state = this.clientPool.get(clientKey)
      if (state) {
        state.connected = true
        state.lastActivity = Date.now()
      }
    })

    return client
  }

  /**
   * Release a client connection (decrease reference count)
   */
  public releaseClient(token: string): void {
    const clientKey = this.getClientKey(token)
    const state = this.clientPool.get(clientKey)

    if (state) {
      state.referenceCount = Math.max(0, state.referenceCount - 1)
      state.lastActivity = Date.now()
    }
  }

  /**
   * Force disconnect a client
   */
  public async disconnectClient(token: string): Promise<void> {
    const clientKey = this.getClientKey(token)
    const state = this.clientPool.get(clientKey)

    if (state && state.client) {
      try {
        await state.client.destroy()
      } catch {
        // Ignore disconnect errors
      }
      this.clientPool.delete(clientKey)
    }
  }

  /**
   * Cleanup idle clients that haven't been used recently
   */
  private cleanupIdleClients(): void {
    const now = Date.now()
    const clientsToRemove: string[] = []

    for (const [key, state] of this.clientPool.entries()) {
      const idleTime = now - state.lastActivity
      const isIdle = idleTime > this.maxIdleTime
      const hasNoActiveConnections = state.referenceCount === 0

      if (isIdle && hasNoActiveConnections) {
        clientsToRemove.push(key)
      }
    }

    // Disconnect and remove idle clients
    for (const key of clientsToRemove) {
      const state = this.clientPool.get(key)
      if (state) {
        state.client.destroy().catch(() => {
          // Ignore cleanup errors
        })
        this.clientPool.delete(key)
      }
    }
  }

  /**
   * Generate a client key from token (hashed for security)
   */
  private getClientKey(token: string): string {
    // Use stable SHA-256-based key for client identification
    const digest = crypto.createHash('sha256').update(token).digest('hex')
    return `client_${digest.slice(0, 16)}`
  }

  /**
   * Get the token associated with a Client instance (if known)
   */
  public getTokenForClient(client: Client): string | undefined {
    return this.clientTokenMap.get(client)
  }

  /**
   * Cleanup on process exit
   */
  public async cleanup(): Promise<void> {
    clearInterval(this.cleanupInterval)

    const disconnectPromises: Promise<void>[] = []
    for (const state of this.clientPool.values()) {
      disconnectPromises.push(
        state.client.destroy().catch(() => {
          // Ignore cleanup errors
        }),
      )
    }

    await Promise.all(disconnectPromises)
    this.clientPool.clear()
  }
}

/**
 * Convenience function to get a Discord client
 */
export async function getDiscordClient(options: DiscordClientOptions): Promise<Client> {
  const manager = DiscordClientManager.getInstance()
  return manager.getClient(options)
}

/**
 * Convenience function to release a Discord client
 */
export function releaseDiscordClient(token: string): void {
  const manager = DiscordClientManager.getInstance()
  manager.releaseClient(token)
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', async () => {
  const manager = DiscordClientManager.getInstance()
  await manager.cleanup()
})

process.on('SIGINT', async () => {
  const manager = DiscordClientManager.getInstance()
  await manager.cleanup()
})

export default DiscordClientManager
