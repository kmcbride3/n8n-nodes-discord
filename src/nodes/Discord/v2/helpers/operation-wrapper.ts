/**
 * V2 Operation Execution Wrapper
 *
 * Provides a standardized wrapper for V2 operations to eliminate boilerplate code
 * and ensure consistent error handling, credential management, and data flow.
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Operation function type for V2 operations
 */
export type V2OperationFunction<TCredentials = unknown> = (
  context: IExecuteFunctions,
  credentials: TCredentials,
  itemIndex: number,
) => Promise<INodeExecutionData>

/**
 * Configuration for operation execution
 */
export interface IV2OperationConfig<TCredentials = unknown> {
  /** Function to retrieve and type credentials */
  getCredentials: (context: IExecuteFunctions) => Promise<TCredentials>
  /** Operation function to execute for each item */
  operation: V2OperationFunction<TCredentials>
  /** Optional cleanup function called after all items processed */
  cleanup?: (context: IExecuteFunctions, credentials: TCredentials) => Promise<void>
}

/**
 * Execute a V2 operation with standardized boilerplate handling
 *
 * This wrapper eliminates the need for repeated boilerplate code in operations by:
 * - Getting input data
 * - Initializing return data array
 * - Fetching credentials once
 * - Looping through items
 * - Handling errors with continue-on-fail support
 * - Ensuring proper pairedItem relationships
 * - Running cleanup if provided
 *
 * @param context - n8n execution context
 * @param config - Operation configuration
 * @returns Promise resolving to execution data array
 *
 * @example
 * export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
 *   return executeV2Operation(this, {
 *     getCredentials: async (ctx) => await getV2DiscordCredentials.call(ctx),
 *     operation: async (ctx, credentials, itemIndex) => {
 *       const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
 *       // ... operation logic ...
 *       return {
 *         json: { success: true, channelId },
 *         pairedItem: { item: itemIndex }
 *       }
 *     }
 *   })
 * }
 */
export async function executeV2Operation<TCredentials = unknown>(
  context: IExecuteFunctions,
  config: IV2OperationConfig<TCredentials>,
): Promise<INodeExecutionData[][]> {
  const items = context.getInputData()
  const returnData: INodeExecutionData[] = []

  // Fetch credentials once for all items
  const credentials = await config.getCredentials(context)

  // Process each item
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    try {
      // Execute operation for this item
      const result = await config.operation(context, credentials, itemIndex)

      // Ensure pairedItem is set
      if (!result.pairedItem) {
        result.pairedItem = { item: itemIndex }
      }

      returnData.push(result)
    } catch (error) {
      // Handle error with continue-on-fail support
      if (context.continueOnFail()) {
        returnData.push({
          json: {
            error: error.message,
            errorDetails: error.description || undefined,
            itemIndex,
          },
          pairedItem: { item: itemIndex },
        })
      } else {
        // Re-throw as NodeOperationError if not already
        if (error instanceof NodeOperationError) {
          throw error
        }
        throw new NodeOperationError(context.getNode(), error.message, {
          itemIndex,
          description: error.description,
        })
      }
    }
  }

  // Run cleanup if provided
  if (config.cleanup) {
    try {
      await config.cleanup(context, credentials)
    } catch (error) {
      // Log cleanup errors but don't fail the operation
      console.warn('Operation cleanup failed:', error.message)
    }
  }

  return [returnData]
}

/**
 * Execute an operation with client cleanup
 *
 * Specialized wrapper for operations that use Discord.js clients and need
 * automatic cleanup after execution.
 *
 * @param context - n8n execution context
 * @param config - Operation configuration with client-based credentials
 * @returns Promise resolving to execution data array
 *
 * @example
 * export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
 *   return executeV2OperationWithClient(this, {
 *     getCredentials: async (ctx) => {
 *       const creds = await getV2DiscordCredentials.call(ctx)
 *       const client = await createV2DiscordClient.call(ctx, creds)
 *       return { credentials: creds, client }
 *     },
 *     operation: async (ctx, { credentials, client }, itemIndex) => {
 *       // ... use client ...
 *     },
 *     cleanup: async (ctx, { client }) => {
 *       await releaseV2DiscordClientByInstance(client)
 *     }
 *   })
 * }
 */
export async function executeV2OperationWithClient<TCredentials extends { client?: unknown }>(
  context: IExecuteFunctions,
  config: IV2OperationConfig<TCredentials>,
): Promise<INodeExecutionData[][]> {
  return executeV2Operation(context, config)
}
