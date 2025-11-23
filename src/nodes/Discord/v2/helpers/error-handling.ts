import { DiscordAPIError, HTTPError, RateLimitError } from 'discord.js'
import {
  type IExecuteFunctions,
  type IWebhookFunctions,
  LoggerProxy,
  NodeOperationError,
  NodeSslError,
} from 'n8n-workflow'

import { DISCORD_ERROR_MESSAGES } from '../../shared/constants/discord-constants'
import { isValidSnowflake } from './utils'

/**
 * Enhanced error context for Discord operations
 */
export interface IDiscordErrorContext {
  operation: string
  guildId?: string
  channelId?: string
  userId?: string
  messageId?: string
  workflowId?: string
  nodeId?: string
  requestId?: string
  rateLimit?: {
    limit: number
    remaining: number
    resetAfter: number
    bucket?: string
  }
}

/**
 * Enhanced Discord.js error handler with comprehensive context and user-friendly messages
 * Phase 2.3: Enhanced error handling with Discord.js native error types and context mapping
 */
export function handleDiscordError(
  error: unknown,
  context: IExecuteFunctions | IWebhookFunctions,
  operation: string,
  errorContext?: Partial<IDiscordErrorContext>,
  itemIndex?: number,
): never {
  const node = context.getNode()
  const workflowId = 'getWorkflow' in context ? context.getWorkflow().id : 'unknown'

  // Build comprehensive error context
  const fullContext: IDiscordErrorContext = {
    operation,
    workflowId,
    nodeId: node.id,
    ...errorContext,
  }

  // Log error context for debugging
  LoggerProxy.error('Discord operation error', {
    operation: fullContext.operation,
    workflowId: fullContext.workflowId,
    nodeId: fullContext.nodeId,
    guildId: fullContext.guildId,
    channelId: fullContext.channelId,
    errorType: error?.constructor.name,
    errorMessage: error instanceof Error ? error.message : String(error),
  })

  // Handle Discord.js native error types first (following built-ins first approach)
  if (error instanceof DiscordAPIError) {
    const userMessage = DISCORD_ERROR_MESSAGES[error.code as keyof typeof DISCORD_ERROR_MESSAGES] || error.message
    const context_description = [
      `Discord API Error ${error.code}: ${userMessage}`,
      fullContext.guildId ? `Server ID: ${fullContext.guildId}` : null,
      fullContext.channelId ? `Channel ID: ${fullContext.channelId}` : null,
      fullContext.userId ? `User ID: ${fullContext.userId}` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    // Use NodeOperationError for Discord API errors with enhanced context
    throw new NodeOperationError(node, `${operation} failed: ${userMessage}`, {
      description: context_description,
      itemIndex,
    })
  }

  if (error instanceof RateLimitError) {
    // Rate limit error - Discord.js handles retries automatically, but if we hit this, it's exhausted
    const rateContext = [
      `Discord rate limit exceeded after automatic retries`,
      `Limit: ${error.limit} requests`,
      `Retry after: ${error.retryAfter}ms`,
      error.hash ? `Route: ${error.hash}` : null,
      fullContext.guildId ? `Server: ${fullContext.guildId}` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    throw new NodeOperationError(node, `Rate limit exceeded in ${operation}`, {
      description: rateContext,
      itemIndex,
    })
  }

  if (error instanceof HTTPError) {
    // HTTP error from Discord.js REST operations
    throw new NodeOperationError(node, `HTTP Error in ${operation}: ${error.message}`, {
      description: `Discord.js encountered HTTP ${error.status}: ${error.message}`,
      itemIndex,
    })
  }

  // Handle SSL/TLS errors
  if (error instanceof Error) {
    if (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('certificate') ||
      error.message.includes('SSL') ||
      error.message.includes('TLS')
    ) {
      throw new NodeSslError(error)
    }

    // Handle other Error types as NodeOperationError
    throw new NodeOperationError(node, error.message, {
      description: `Error in ${operation}: ${error.message}`,
      itemIndex,
    })
  }

  // Fallback for unknown error types
  throw new NodeOperationError(node, `Unknown error in ${operation}`, {
    description: 'An unexpected error occurred during Discord operation',
    itemIndex,
  })
}

/**
 * Wrapper for Discord.js operations that provides consistent error handling
 * Leverages Discord.js automatic retry and rate limiting
 * Following Phase 2 architecture: let Discord.js handle retries and rate limiting automatically
 */
export async function executeDiscordOperation<T>(
  context: IExecuteFunctions | IWebhookFunctions,
  operation: string,
  discordOperation: () => Promise<T>,
  itemIndex?: number,
): Promise<T> {
  try {
    // Let Discord.js handle retries, rate limiting, and timeouts automatically
    // Discord.js provides 15s timeout, 3 retries automatically
    return await discordOperation()
  } catch (error) {
    // Convert to appropriate n8n error type
    handleDiscordError(error, context, operation, undefined, itemIndex)
  }
}

/**
 * Enhanced error handling for V1 bot operations
 * Replaces generic Error logging with proper n8n error types and Discord.js context
 */
export function handleV1BotError(error: unknown, operation: string, context?: Partial<IDiscordErrorContext>): void {
  // Log using n8n LoggerProxy instead of console.log/addLog
  const errorMessage = error instanceof Error ? error.message : String(error)

  LoggerProxy.error(`V1 Bot ${operation} error`, {
    operation,
    errorType: error?.constructor.name,
    message: errorMessage,
    guildId: context?.guildId,
    channelId: context?.channelId,
    userId: context?.userId,
  })
}

/**
 * Convert V1 bot errors to proper n8n error types for workflow execution
 *
 * @param error - The error to convert
 * @param operation - The operation that failed
 * @param context - Optional Discord context (guild, channel, user IDs)
 * @returns Converted error with enhanced context
 *
 * @example
 * const convertedError = convertV1BotError(error, 'sendMessage', { channelId: '123' });
 */
export function convertV1BotError(error: unknown, operation: string, context?: Partial<IDiscordErrorContext>): Error {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Handle Discord.js specific errors
  if (error instanceof DiscordAPIError) {
    const userMessage = DISCORD_ERROR_MESSAGES[error.code as keyof typeof DISCORD_ERROR_MESSAGES] || error.message
    return new Error(`Discord API Error in ${operation}: ${userMessage}`)
  }

  if (error instanceof RateLimitError) {
    return new Error(`Rate limit exceeded in ${operation}. Retry after ${error.retryAfter}ms`)
  }

  if (error instanceof HTTPError) {
    return new Error(`HTTP Error in ${operation}: ${error.message}`)
  }

  // Return enhanced error with context
  const contextStr = context?.guildId ? ` (Guild: ${context.guildId})` : ''
  return new Error(`${operation} failed: ${errorMessage}${contextStr}`)
}

/**
 * Extract Discord.js error context from various Discord.js objects
 *
 * @param discordObject - Any Discord.js object (Message, Channel, Guild, Interaction, etc.)
 * @returns Extracted context with guild, channel, user, and message IDs
 *
 * @example
 * const context = extractDiscordContext(message);
 * // Returns: { guildId: '...', channelId: '...', userId: '...', messageId: '...' }
 */
export function extractDiscordContext(discordObject: unknown): Partial<IDiscordErrorContext> {
  const context: Partial<IDiscordErrorContext> = {}

  try {
    const obj = discordObject as Record<string, unknown>

    // Safely extract common Discord.js properties with proper type guards
    if (typeof obj?.guildId === 'string') context.guildId = obj.guildId
    if (typeof obj?.channelId === 'string') context.channelId = obj.channelId
    if (
      typeof obj?.user === 'object' &&
      obj.user !== null &&
      typeof (obj.user as Record<string, unknown>).id === 'string'
    ) {
      context.userId = (obj.user as Record<string, unknown>).id as string
    }
    if (typeof obj?.id === 'string' && isValidSnowflake(obj.id)) {
      context.messageId = obj.id
    }
    if (
      typeof obj?.guild === 'object' &&
      obj.guild !== null &&
      typeof (obj.guild as Record<string, unknown>).id === 'string'
    ) {
      context.guildId = (obj.guild as Record<string, unknown>).id as string
    }
    if (typeof obj?.channel === 'object' && obj.channel !== null) {
      const channel = obj.channel as Record<string, unknown>
      if (typeof channel.id === 'string') context.channelId = channel.id
      if (typeof channel.guildId === 'string') context.guildId = channel.guildId
    }
    if (
      typeof obj?.author === 'object' &&
      obj.author !== null &&
      typeof (obj.author as Record<string, unknown>).id === 'string'
    ) {
      context.userId = (obj.author as Record<string, unknown>).id as string
    }
  } catch {
    // Ignore extraction errors
  }

  return context
}

/**
 * Create user-friendly error messages with progressive disclosure
 * Maps Discord API error codes to helpful, actionable messages for users
 *
 * @param error - The Discord API error
 * @param operation - The operation that failed
 * @param context - Optional Discord context
 * @returns User-friendly error message with guidance
 *
 * @example
 * const message = createUserFriendlyError(apiError, 'sendMessage', { channelId: '123' });
 */
export function createUserFriendlyError(
  error: DiscordAPIError,
  operation: string,
): { summary: string; details: string; suggestions: string[] } {
  const userMessage = DISCORD_ERROR_MESSAGES[error.code as keyof typeof DISCORD_ERROR_MESSAGES] || error.message

  const suggestions: string[] = []

  // Add operation-specific suggestions based on error code
  switch (error.code) {
    case 50013: // Missing permissions
      suggestions.push('Check bot permissions in server and channel settings')
      suggestions.push('Ensure the bot role is positioned above target roles')
      break
    case 10003: // Unknown channel
    case 10008: // Unknown message
      suggestions.push('Verify the channel/message still exists')
      suggestions.push('Check if the bot has access to the channel')
      break
    case 50001: // Missing access
      suggestions.push('Grant the bot necessary permissions for this action')
      break
    case 50035: // Invalid form body
      suggestions.push('Check message content, embeds, and component formatting')
      suggestions.push('Ensure all required fields are properly filled')
      break
  }

  return {
    summary: `${operation} failed: ${userMessage}`,
    details: `Discord API Error ${error.code} (${error.status}): ${error.message}`,
    suggestions,
  }
}

/**
 * Validates Discord snowflake IDs using Discord.js built-in utilities
 * Following Phase 2 architecture: use Discord.js native validation methods
 *
 * @param id - The Discord snowflake ID to validate
 * @param type - The type of ID for error messaging (channel, guild, user, message, role)
 * @param context - n8n execution context for proper error handling
 * @param itemIndex - Optional item index for error context
 * @throws NodeOperationError when ID format is invalid or missing
 *
 * @example
 * validateDiscordId('123456789012345678', 'channel', this, 0);
 */
export function validateDiscordId(
  id: string,
  type: 'channel' | 'guild' | 'user' | 'message' | 'role',
  context: IExecuteFunctions | IWebhookFunctions,
  itemIndex?: number,
): void {
  if (!id || typeof id !== 'string') {
    throw new NodeOperationError(context.getNode(), `Invalid ${type} ID: ID is required and must be a string`, {
      itemIndex,
    })
  }

  // Use Discord.js built-in validation via SnowflakeUtil.decode
  if (!isValidSnowflake(id)) {
    throw new NodeOperationError(context.getNode(), `Invalid ${type} ID: "${id}" is not a valid Discord snowflake ID`, {
      itemIndex,
    })
  }
}

/**
 * Enhanced error handler for array operations (multiple items)
 * Continues processing other items even if one fails
 * Attaches error to specific item for partial success scenarios
 *
 * @param this - n8n execution context
 * @param error - The error that occurred during item processing
 * @param itemIndex - Index of the item that failed
 * @param returnData - Array of results to append error to
 *
 * @example
 * handleExecutionError.call(this, error, i, returnData);
 */
export function handleExecutionError(
  this: IExecuteFunctions,
  error: Error | NodeOperationError,
  itemIndex: number,
  returnData: Array<{ json: Record<string, unknown>; error?: Error }>,
): void {
  // Add error to the specific item while allowing other items to process
  returnData[itemIndex] = {
    json: {},
    error: error instanceof Error ? error : new Error(String(error)),
  }
}
