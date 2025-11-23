import { DiscordAPIError, HTTPError, RateLimitError } from 'discord.js'
import type { IExecuteFunctions, JsonObject } from 'n8n-workflow'
import { jsonParse, NodeOperationError, updateDisplayOptions } from 'n8n-workflow'

import type { IDiscordPerformanceMetrics } from './types'

// Define error interface for better type safety
type DiscordError = Error | DiscordAPIError | HTTPError | RateLimitError

interface DiscordApiError {
  message?: string
  errors?: {
    embeds?: Array<Record<string, unknown>>
    message_reference?: unknown
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * Creates performance metrics for Discord API operations
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds
 * @param method - HTTP method used
 * @param endpoint - API endpoint called
 * @param operation - Operation name (default: 'discord-api')
 * @param success - Whether the operation was successful
 * @param statusCode - HTTP status code
 * @param errorMessage - Error message if operation failed
 * @returns Performance metrics object
 */
export function createPerformanceMetrics(
  startTime: number,
  endTime: number,
  method: string,
  endpoint: string,
  operation = 'discord-api',
  success = true,
  statusCode?: number,
  errorMessage?: string,
): IDiscordPerformanceMetrics {
  return {
    operation,
    startTime,
    endTime,
    duration: endTime - startTime,
    method,
    endpoint,
    success,
    statusCode,
    errorMessage,
  }
}

/**
 * Measure Discord API performance
 */
export function measureDiscordApiPerformance(
  startTime: number,
  endTime: number,
  method: string,
  endpoint: string,
  operation = 'discord-api',
  success = true,
  statusCode?: number,
  errorMessage?: string,
): IDiscordPerformanceMetrics {
  return {
    operation,
    startTime,
    endTime,
    duration: endTime - startTime,
    method,
    endpoint,
    success,
    statusCode,
    errorMessage,
  }
}

// Re-export from shared location to maintain backward compatibility
export { generateUniqueId } from '../../shared/utils/id-generation'
export { isValidSnowflake } from '../../shared/validation/snowflake'

/**
 * Parse Discord API errors and convert to n8n NodeOperationError
 * Based on official n8n Discord node error handling patterns
 */
export function parseDiscordError(this: IExecuteFunctions, error: DiscordError, itemIndex = 0) {
  const errorOptions: Record<string, unknown> = { itemIndex }

  // Handle Discord.js specific errors
  if (error instanceof DiscordAPIError) {
    let errorData: DiscordApiError | undefined

    // Try to extract error data from the DiscordAPIError
    if (error.cause && typeof error.cause === 'object' && 'error' in error.cause) {
      errorData = (error.cause as { error?: unknown }).error as DiscordApiError
    }

    if (!errorData && error.message) {
      try {
        const errorString = error.message.split(' - ')[1]
        if (errorString) {
          errorData = jsonParse(errorString) as DiscordApiError
        }
      } catch {
        // Ignore parsing errors
      }
    }

    if (errorData?.message) {
      errorOptions.message = errorData.message
    }

    if (error.message?.toLowerCase()?.includes('bad request') && errorData) {
      if (errorData?.message) {
        errorOptions.message = errorData.message
      }

      // Parse embed validation errors from Discord API
      // Extract field names from nested error object and format them as readable parameter names
      if (errorData?.errors?.embeds) {
        const embedErrors = errorData.errors.embeds?.[0]
        const embedErrorsKeys = Object.keys(embedErrors || {}).map((key) => capitalize(key))

        if (embedErrorsKeys.length) {
          const message =
            embedErrorsKeys.length === 1
              ? `The parameter ${embedErrorsKeys[0]} is not properly formatted`
              : `The parameters ${embedErrorsKeys.join(', ')} are not properly formatted`
          errorOptions.message = message
          errorOptions.description = 'Review the formatting or clear it'
        }
      }

      if (errorData?.errors?.message_reference) {
        errorOptions.message = "The message to reply to ID can't be found"
        errorOptions.description =
          'Check the "Message to Reply to" parameter and remove it if you don\'t want to reply to an existing message'
      }

      return new NodeOperationError(this.getNode(), (errorData.errors as JsonObject) || 'Unknown error', errorOptions)
    }

    if (errorOptions.message === 'Cannot send an empty message') {
      errorOptions.description =
        'Provide content in the "Content" field, or add an embed, or both. At least one of them must be provided.'
    }

    if (errorData?.message) {
      return new NodeOperationError(this.getNode(), errorData.message, errorOptions)
    }
  }

  // Handle other error types
  return new NodeOperationError(this.getNode(), error.message || 'Unknown Discord API error', errorOptions)
}

/**
 * Prepare error data for n8n execution context
 * Based on official n8n Discord node error data preparation
 */
export function prepareErrorData(this: IExecuteFunctions, error: DiscordError, i: number) {
  let description = error.message

  // Try to extract more detailed error information
  if (error instanceof DiscordAPIError && error.cause && typeof error.cause === 'object') {
    try {
      const cause = error.cause as { error?: unknown }
      if (cause.error) {
        description = jsonParse(JSON.stringify(cause.error)) as string
      }
    } catch {
      // Ignore parsing errors
    }
  }

  return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message, description }), {
    itemData: { item: i },
  })
}

/**
 * Capitalize first letter of a string
 * Utility function for error message formatting
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Returns all items or a limited subset based on the limit parameter
 * @template T - The type of items in the array
 * @param items - Array of items to limit
 * @param limit - Maximum number of items to return (optional)
 * @returns Limited array of items
 */
export function returnAllOrLimit<T>(items: T[], limit?: number): T[] {
  if (!limit || limit <= 0) {
    return items
  }
  return items.slice(0, limit)
}

// Re-export n8n utilities for convenience
export { updateDisplayOptions }
