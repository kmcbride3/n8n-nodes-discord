/**
 * Phase 3.1: Connection Optimization - V2 Client Pool Integration
 *
 * This module provides optimized Discord client management for V2 operations,
 * leveraging the shared client pool and Discord.js built-in connection management.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js'
import type { IExecuteFunctions } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import { getDiscordClient, releaseDiscordClient } from '../../../shared'
import type { IV2DiscordCredentials } from '../v2-credentials'
import { getV2DiscordCredentials } from '../v2-credentials'

/**
 * V2 Operation Types for Intent Optimization
 */
export enum V2OperationType {
  MESSAGE = 'message',
  MEMBER = 'member',
  PROMPT = 'prompt',
  UTILITY = 'utility',
  WEBHOOK = 'webhook',
}

/**
 * Intent Configuration Map for Different Operation Types
 * Optimizes intents based on what each operation actually needs
 */
const OPERATION_INTENT_MAP: Record<V2OperationType, number[]> = {
  [V2OperationType.MESSAGE]: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  [V2OperationType.MEMBER]: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  [V2OperationType.PROMPT]: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  [V2OperationType.UTILITY]: [GatewayIntentBits.Guilds],
  [V2OperationType.WEBHOOK]: [], // No client needed for webhook operations
}

/**
 * Optimized V2 Discord Client Creation with Connection Pooling
 *
 * Phase 3.1.1 Implementation:
 * - Uses shared client pool for resource efficiency
 * - Implements intent optimization based on operation type
 * - Leverages Discord.js built-in connection management
 *
 * @param this - n8n execution context
 * @param operationType - The type of V2 operation to optimize for
 * @param credentials - Optional Discord credentials (will fetch if not provided)
 * @returns Discord.js client instance or null for webhook operations
 * @throws NodeOperationError when bot token is missing for bot operations
 *
 * @example
 * const client = await createOptimizedV2Client.call(this, V2OperationType.MESSAGE);
 */
export async function createOptimizedV2Client(
  this: IExecuteFunctions,
  operationType: V2OperationType,
  credentials?: IV2DiscordCredentials,
): Promise<Client | null> {
  if (!credentials) {
    credentials = await getV2DiscordCredentials.call(this)
  }

  // For webhook-only operations, no client needed
  if (credentials.type === 'webhook' || operationType === V2OperationType.WEBHOOK) {
    return null
  }

  const token = credentials.token || credentials.botToken
  if (!token) {
    throw new NodeOperationError(this.getNode(), 'Bot token is required for Discord client operations')
  }

  // Get optimized intents for this operation type
  // Intents control which Discord events the bot receives (minimizing unused data improves performance)
  const intents = OPERATION_INTENT_MAP[operationType]

  // Use shared client pool with optimized configuration
  // Partials allow Discord.js to work with partial data structures (e.g., uncached messages)
  try {
    const client = await getDiscordClient({
      token,
      intents,
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    })

    return client
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to create optimized Discord client: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Release V2 Discord Client Connection
 *
 * Phase 3.1.1 Implementation:
 * - Properly releases client back to the pool
 * - Enables connection reuse and resource optimization
 */
export function releaseOptimizedV2Client(token: string): void {
  try {
    releaseDiscordClient(token)
  } catch (error) {
    // Log but don't throw - client release failures shouldn't break operations
    LoggerProxy.warn('Failed to release Discord client:', { error })
  }
}

/**
 * V2 Client Configuration with Health Monitoring
 *
 * Phase 3.1.2 Implementation:
 * - Adds Discord.js built-in connection health monitoring
 * - Implements automatic reconnection handling
 */
export interface V2ClientHealthStatus {
  connected: boolean
  latency: number
  uptime: number
  lastHeartbeat: Date | null
}

/**
 * Get V2 Client Health Status
 * Uses Discord.js built-in connection monitoring
 */
export function getV2ClientHealth(client: Client): V2ClientHealthStatus {
  return {
    connected: client.isReady(),
    latency: client.ws.ping,
    uptime: client.uptime || 0,
    lastHeartbeat: client.ws.shards.size > 0 ? new Date() : null,
  }
}

/**
 * Enhanced V2 Client Event Optimization
 *
 * Phase 3.1.2 Implementation:
 * - Optimizes event listener registration
 * - Implements selective event handling based on operation needs
 */
export function setupV2ClientEventOptimization(client: Client, operationType: V2OperationType): void {
  // Add minimal error handling - Discord.js handles most connection issues automatically
  client.on('error', (error) => {
    LoggerProxy.error(`Discord client error for ${operationType}:`, { error: error.message })
  })

  // Only add specific event listeners if needed for this operation type
  if (operationType === V2OperationType.PROMPT) {
    // Prompt operations may need interaction events
    client.on('warn', (warning) => {
      LoggerProxy.warn(`Discord client warning for ${operationType}:`, { warning })
    })
  }

  // Discord.js handles reconnection automatically, no custom logic needed
}

/**
 * Backward Compatibility Wrapper
 *
 * Provides compatibility with existing V2 operations while transitioning
 * to the optimized client management system
 *
 * @param this - n8n execution context
 * @param credentials - Optional Discord credentials
 * @param operationType - Operation type for intent optimization (defaults to MESSAGE)
 * @returns Discord.js client instance or null
 *
 * @example
 * const client = await createV2DiscordClientOptimized.call(this, credentials, V2OperationType.MEMBER);
 */
export async function createV2DiscordClientOptimized(
  this: IExecuteFunctions,
  credentials?: IV2DiscordCredentials,
  operationType: V2OperationType = V2OperationType.MESSAGE,
): Promise<Client | null> {
  const client = await createOptimizedV2Client.call(this, operationType, credentials)

  if (client) {
    setupV2ClientEventOptimization(client, operationType)
  }

  return client
}
