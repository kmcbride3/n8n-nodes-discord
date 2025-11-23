/**
 * Phase 3.1: Connection Optimization Integration Examples
 *
 * This module demonstrates how to integrate the connection optimization
 * features into existing V2 operations for better performance and stability.
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../v2-credentials'
import {
  createWebSocketEnhancement,
  type WebSocketEnhancementManager,
  type WebSocketHealthMetrics,
} from '../websocket/websocket-enhancement'
import { createOptimizedV2Client, releaseOptimizedV2Client, V2OperationType } from './connection-optimization'

/**
 * Enhanced V2 Operation Execution Context
 *
 * Provides optimized client management with health monitoring
 * for V2 operations following Phase 3.1 patterns
 */
export class V2OperationContext {
  private client: Client | null = null
  private wsEnhancement: WebSocketEnhancementManager | null = null
  private credentials: IV2DiscordCredentials
  private operationType: V2OperationType

  constructor(
    private executeFunctions: IExecuteFunctions,
    operationType: V2OperationType,
    credentials?: IV2DiscordCredentials,
  ) {
    this.operationType = operationType
    this.credentials = credentials || ({} as IV2DiscordCredentials)
  }

  /**
   * Initialize Optimized Discord Client
   *
   * Phase 3.1.1: Uses connection pooling and intent optimization
   */
  async initializeClient(): Promise<Client | null> {
    if (this.client) {
      return this.client
    }

    this.client = await createOptimizedV2Client.call(this.executeFunctions, this.operationType, this.credentials)

    if (this.client) {
      // Phase 3.1.2: Add WebSocket enhancement monitoring
      this.wsEnhancement = createWebSocketEnhancement(this.client)
    }

    return this.client
  }

  /**
   * Get Client Health Status
   *
   * Returns comprehensive health metrics for monitoring
   */
  getClientHealth(): WebSocketHealthMetrics | null {
    if (!this.wsEnhancement) {
      return null
    }

    return this.wsEnhancement.getHealthMetrics()
  }

  /**
   * Execute Operation with Optimized Client
   *
   * Template for executing operations with connection optimization.
   * Provides automatic client initialization, error handling, and cleanup.
   *
   * @param operation - The Discord operation to execute with the client
   * @returns The result of the operation
   * @throws NodeOperationError if no client is available for the operation type
   *
   * @example
   * const result = await context.executeWithOptimizedClient(async (client) => {
   *   const channel = await client.channels.fetch(channelId);
   *   return channel.send('Hello!');
   * });
   */
  async executeWithOptimizedClient<T>(operation: (client: Client) => Promise<T>): Promise<T> {
    const client = await this.initializeClient()

    if (!client) {
      throw new NodeOperationError(
        this.executeFunctions.getNode(),
        'No Discord client available for this operation type',
        {
          description:
            'This operation requires a Discord client connection. Ensure credentials are configured correctly and the operation type is supported.',
        },
      )
    }

    try {
      return await operation(client)
    } finally {
      // Client cleanup is handled automatically by the connection pool
      // Just release our reference
      this.cleanup()
    }
  }

  /**
   * Cleanup Resources
   *
   * Properly releases client connection back to the pool
   */
  cleanup(): void {
    if (this.client && this.credentials.token) {
      releaseOptimizedV2Client(this.credentials.token)
    }

    if (this.wsEnhancement) {
      this.wsEnhancement.cleanup()
      this.wsEnhancement = null
    }

    this.client = null
  }
}

/**
 * Create V2 Operation Context
 *
 * Factory function for creating optimized operation contexts
 * Encapsulates Discord client lifecycle and n8n context
 *
 * @param executeFunctions - n8n execution context
 * @param operationType - Type of Discord operation (MESSAGE, MEMBER, etc.)
 * @param credentials - Optional Discord credentials
 * @returns Configured operation context for Discord operations
 *
 * @example
 * const context = createV2OperationContext(this, V2OperationType.MESSAGE);
 */
export function createV2OperationContext(
  executeFunctions: IExecuteFunctions,
  operationType: V2OperationType,
  credentials?: IV2DiscordCredentials,
): V2OperationContext {
  return new V2OperationContext(executeFunctions, operationType, credentials)
}

/**
 * Enhanced Message Operation Example
 *
 * Demonstrates how to use Phase 3.1 optimization in message operations
 * Wraps operation in optimized client lifecycle management
 *
 * @param executeFunctions - n8n execution context
 * @param operation - Async function that performs Discord operation with client
 * @param credentials - Optional Discord credentials
 * @returns Result of the operation
 *
 * @example
 * const message = await executeOptimizedMessageOperation(this, async (client) => {
 *   return await client.channels.cache.get(channelId).send(content);
 * });
 */
export async function executeOptimizedMessageOperation<T>(
  executeFunctions: IExecuteFunctions,
  operation: (client: Client) => Promise<T>,
  credentials?: IV2DiscordCredentials,
): Promise<T> {
  const context = createV2OperationContext(executeFunctions, V2OperationType.MESSAGE, credentials)

  return context.executeWithOptimizedClient(operation)
}

/**
 * Enhanced Member Operation Example
 *
 * Demonstrates how to use Phase 3.1 optimization in member operations
 * Wraps operation in optimized client lifecycle management
 *
 * @param executeFunctions - n8n execution context
 * @param operation - Async function that performs Discord operation with client
 * @param credentials - Optional Discord credentials
 * @returns Result of the operation
 *
 * @example
 * const member = await executeOptimizedMemberOperation(this, async (client) => {
 *   return await guild.members.fetch(userId);
 * });
 */
export async function executeOptimizedMemberOperation<T>(
  executeFunctions: IExecuteFunctions,
  operation: (client: Client) => Promise<T>,
  credentials?: IV2DiscordCredentials,
): Promise<T> {
  const context = createV2OperationContext(executeFunctions, V2OperationType.MEMBER, credentials)

  return context.executeWithOptimizedClient(operation)
}

/**
 * Enhanced Prompt Operation Example
 *
 * Demonstrates how to use Phase 3.1 optimization in prompt operations
 * Wraps operation in optimized client lifecycle management
 *
 * @param executeFunctions - n8n execution context
 * @param operation - Async function that performs Discord operation with client
 * @param credentials - Optional Discord credentials
 * @returns Result of the operation
 *
 * @example
 * const response = await executeOptimizedPromptOperation(this, async (client) => {
 *   return await interaction.reply(content);
 * });
 */
export async function executeOptimizedPromptOperation<T>(
  executeFunctions: IExecuteFunctions,
  operation: (client: Client) => Promise<T>,
  credentials?: IV2DiscordCredentials,
): Promise<T> {
  const context = createV2OperationContext(executeFunctions, V2OperationType.PROMPT, credentials)

  return context.executeWithOptimizedClient(operation)
}
