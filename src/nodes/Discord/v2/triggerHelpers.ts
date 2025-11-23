/**
 * Discord V2 Trigger Helpers
 *
 * Pure Discord.js trigger system for V2 - no IPC dependencies
 *
 * IMPROVEMENTS IMPLEMENTED:
 * 1. ✅ Event listener memory leak prevention (WeakSet tracking)
 * 2. ✅ Cache key security (SHA256 hashing of bot tokens)
 * 3. ✅ Periodic idle cleanup (timer-based instead of per-call)
 * 4. ✅ Intent validation before login (fail-fast behavior)
 * 5. ✅ Enhanced documentation
 */

import { createHash } from 'crypto'
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js'
import type { ITriggerFunctions, ITriggerResponse } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

export interface IDiscordCredentials {
  botToken: string
}

/**
 * Valid trigger types for Discord V2
 */
export type TriggerType =
  | 'message'
  | 'message_update'
  | 'thread'
  | 'thread_update'
  | 'command'
  | 'interaction'
  | 'userJoins'
  | 'userLeaves'
  | 'userUpdate'
  | 'presenceUpdate'
  | 'userNickUpdated'
  | 'userRoleAdded'
  | 'userRoleRemoved'

/**
 * Required intents for each trigger type
 * Uses Discord.js GatewayIntentBits for type safety
 */
export const TRIGGER_INTENT_REQUIREMENTS: Record<TriggerType, number[]> = {
  message: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  message_update: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  thread: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  thread_update: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  command: [GatewayIntentBits.Guilds],
  interaction: [GatewayIntentBits.Guilds],
  userJoins: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  userLeaves: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  userUpdate: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  presenceUpdate: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
  userNickUpdated: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  userRoleAdded: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  userRoleRemoved: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
}

/**
 * Cached Discord clients to avoid creating multiple instances
 */
const clientCache = new Map<string, Client>()

/**
 * Track last usage time for each cached client for cleanup
 */
const clientLastUsed = new Map<string, number>()

/**
 * Track reference count for each client to know when it's safe to destroy
 */
const clientRefCount = new Map<string, number>()

/**
 * Track which clients already have error handling setup to prevent duplicate listeners
 * Uses WeakSet for automatic garbage collection
 */
const clientsWithErrorHandling = new WeakSet<Client>()

/**
 * Maximum idle time before a client is considered for cleanup (30 minutes)
 */
const CLIENT_MAX_IDLE_TIME = 30 * 60 * 1000

/**
 * Idle cleanup interval (5 minutes)
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000

/**
 * Cleanup interval timer
 */
let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Generate a secure cache key from bot token
 * Uses SHA256 hash to prevent token exposure in logs or debugging tools
 *
 * @param botToken - Discord bot token
 * @returns 16-character hash for cache key
 */
function generateCacheKey(botToken: string): string {
  return createHash('sha256').update(botToken).digest('hex').substring(0, 16)
}

/**
 * Get Discord bot credentials from n8n credential system
 * @param context - The n8n trigger context
 * @returns Discord bot credentials
 * @throws NodeOperationError if credentials cannot be retrieved
 */
export async function getDiscordCredentials(context: ITriggerFunctions): Promise<IDiscordCredentials> {
  return (await context.getCredentials('discordBotApi').catch((e) => {
    throw new NodeOperationError(context.getNode(), e)
  })) as unknown as IDiscordCredentials
}

/**
 * Validate that the bot has required intents for a trigger type
 * Uses Discord.js IntentsBitField for intent checking
 */
export function validateTriggerIntents(
  this: ITriggerFunctions,
  triggerType: TriggerType,
  clientIntents: IntentsBitField,
): void {
  const requiredIntents = TRIGGER_INTENT_REQUIREMENTS[triggerType]

  if (!requiredIntents) {
    LoggerProxy.warn(`Unknown trigger type: ${triggerType}. Skipping intent validation.`)
    return
  }

  const missingIntents: string[] = []

  for (const intent of requiredIntents) {
    if (!clientIntents.has(intent)) {
      // Use Discord.js to get intent name for better error messages
      const intentName = Object.keys(GatewayIntentBits).find(
        (key) => GatewayIntentBits[key as keyof typeof GatewayIntentBits] === intent,
      )
      missingIntents.push(intentName || `Intent(${intent})`)
    }
  }

  if (missingIntents.length > 0) {
    throw new NodeOperationError(
      this.getNode(),
      `Bot is missing required Discord Gateway intents for trigger type "${triggerType}": ${missingIntents.join(', ')}`,
      {
        description:
          'Enable these intents in the Discord Developer Portal (https://discord.com/developers/applications) under "Bot" → "Privileged Gateway Intents"',
      },
    )
  }
}

/**
 * Clean up idle Discord clients from cache
 * Removes clients that haven't been used for CLIENT_MAX_IDLE_TIME
 */
function cleanupIdleClients(): void {
  const now = Date.now()
  const entriesToDelete: string[] = []

  clientLastUsed.forEach((lastUsed, key) => {
    if (now - lastUsed > CLIENT_MAX_IDLE_TIME) {
      entriesToDelete.push(key)
    }
  })

  entriesToDelete.forEach((key) => {
    const client = clientCache.get(key)
    if (client) {
      client.destroy()
      clientCache.delete(key)
      clientLastUsed.delete(key)
      clientRefCount.delete(key)
      LoggerProxy.info(`Cleaned up idle Discord client: ${key.substring(0, 10)}...`)
    }
  })
}

/**
 * Start periodic idle client cleanup timer
 * Uses setInterval with unref() to allow proper process exit
 */
function startIdleCleanupTimer(): void {
  if (cleanupInterval) return // Already started

  cleanupInterval = setInterval(() => {
    cleanupIdleClients()
  }, CLEANUP_INTERVAL)

  // Allow Node.js to exit even if timer is active
  cleanupInterval.unref()
}

/**
 * Get or create a Discord.js client for triggers
 */
export async function getDiscordClient(
  this: ITriggerFunctions,
  credentials: IDiscordCredentials,
  triggerType?: TriggerType,
): Promise<Client> {
  // Start cleanup timer on first call
  startIdleCleanupTimer()

  const cacheKey = generateCacheKey(credentials.botToken)

  // Check if client already exists in cache and is still connected
  if (clientCache.has(cacheKey)) {
    const cachedClient = clientCache.get(cacheKey)
    if (cachedClient?.isReady()) {
      // Update last used time
      clientLastUsed.set(cacheKey, Date.now())

      // Increment reference count for reused client
      const currentRefCount = clientRefCount.get(cacheKey) || 0
      clientRefCount.set(cacheKey, currentRefCount + 1)

      LoggerProxy.info(`Reusing cached Discord client (ref count: ${currentRefCount + 1})`)
      return cachedClient
    } else {
      // Client exists but not ready, remove from cache
      clientCache.delete(cacheKey)
      clientLastUsed.delete(cacheKey)
      clientRefCount.delete(cacheKey)
    }
  }

  // Create new client with all intents
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
    ],
  })

  // Validate intents BEFORE login for fail-fast behavior (IMPROVEMENT #4)
  if (triggerType && client.options.intents) {
    const intents = new IntentsBitField(client.options.intents)
    validateTriggerIntents.call(this, triggerType, intents)
  }

  try {
    await client.login(credentials.botToken)

    // Wait for Discord.js client to be ready before proceeding
    if (!client.isReady()) {
      await new Promise<void>((resolve) => {
        client.once('ready', () => resolve())
      })
    }

    clientCache.set(cacheKey, client)
    clientLastUsed.set(cacheKey, Date.now())

    // Initialize reference count for new client
    clientRefCount.set(cacheKey, 1)

    LoggerProxy.info('Discord client connected for triggers')
    return client
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to connect Discord client: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Get or create a Discord.js client with error handling setup
 * Combines getDiscordClient and setupClientErrorHandling into one call
 * @param context - The n8n trigger context
 * @param credentials - Discord bot credentials
 * @param triggerType - Type of trigger for intent validation
 * @returns Discord client with error handling configured
 */
export async function getDiscordClientWithErrorHandling(
  this: ITriggerFunctions,
  credentials: IDiscordCredentials,
  triggerType: TriggerType,
): Promise<Client> {
  const client = await getDiscordClient.call(this, credentials, triggerType)
  setupClientErrorHandling(client, triggerType)
  return client
}

/**
 * Create a trigger response for Discord.js event-based triggers
 * Event listeners should be set up before calling this function
 *
 * @param client - Discord.js client instance
 * @param cleanupFn - Optional cleanup function to call when trigger closes
 * @param cacheKey - Bot token for reference counting (will be hashed)
 */
export function createTriggerResponse(client: Client, cleanupFn?: () => void, cacheKey?: string): ITriggerResponse {
  return {
    closeFunction: async () => {
      // Run custom cleanup (e.g., remove event listeners)
      if (cleanupFn) {
        cleanupFn()
      }

      // Decrement reference count and destroy client if no more references
      if (cacheKey) {
        const hashedKey = generateCacheKey(cacheKey)
        const refCount = (clientRefCount.get(hashedKey) || 1) - 1
        clientRefCount.set(hashedKey, refCount)

        LoggerProxy.info(`Discord trigger closed (remaining ref count: ${refCount})`)

        if (refCount <= 0) {
          // No more triggers using this client, safe to destroy
          client.destroy()
          clientCache.delete(hashedKey)
          clientLastUsed.delete(hashedKey)
          clientRefCount.delete(hashedKey)
          LoggerProxy.info('Discord client destroyed (no more active triggers)')
        }
      } else {
        LoggerProxy.info('Discord trigger closed')
      }
    },
    /**
     * Manual trigger function waits indefinitely for Discord events.
     * This allows users to test triggers in the workflow editor by triggering events in Discord.
     *
     * Intentionally returns a never-resolving promise.
     * n8n will call closeFunction() when the user clicks "Stop",
     * which properly cleans up the Discord client and resolves the workflow.
     *
     * @see closeFunction for cleanup logic
     */
    manualTriggerFunction: async () => {
      LoggerProxy.info('Manual trigger test - waiting for Discord events (trigger an event in Discord to continue)')
      // Wait indefinitely - n8n will call closeFunction when user stops the test
      // Empty promise intentionally never resolves until closeFunction is called
      await new Promise<void>(() => {
        // Empty executor - waits indefinitely for closeFunction
      })
    },
  }
}

/**
 * Setup error handling for Discord client
 * Uses WeakSet to prevent duplicate listener registration on client reuse (IMPROVEMENT #1)
 */
export function setupClientErrorHandling(client: Client, nodeType: string): void {
  // Only setup once per client instance to prevent duplicate listeners
  if (clientsWithErrorHandling.has(client)) {
    return
  }

  clientsWithErrorHandling.add(client)

  client.on('error', (error) => {
    LoggerProxy.error(`Discord client error in ${nodeType}`, {
      error: error.message,
    })
  })

  client.on('warn', (warning) => {
    LoggerProxy.warn(`Discord client warning in ${nodeType}`, {
      warning,
    })
  })

  client.on('disconnect', () => {
    LoggerProxy.info(`Discord client disconnected in ${nodeType}`)
  })

  client.on('reconnecting', () => {
    LoggerProxy.info(`Discord client reconnecting in ${nodeType}`)
  })
}
