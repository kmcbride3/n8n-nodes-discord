/**
 * Shared Discord operation execution utilities
 * Following Phase 2.4: Code Deduplication with Discord.js-first architecture
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { createV2DiscordClient, getV2DiscordCredentials, handleDiscordError } from '../../v2/helpers'
import type {
  DiscordOperationExecutor,
  IDiscordOperationConfig,
  IDiscordOperationContext,
  IDiscordOperationResult,
} from '../types/shared-interfaces'

/**
 * Generic Discord operation executor that handles common patterns:
 * - Client setup and validation
 * - Parameter extraction and validation
 * - Error handling with Discord context
 * - Response formatting
 *
 * Following Discord.js-first architecture principles
 */
export async function executeDiscordOperation<TParams, TResult extends IDiscordOperationResult>(
  executeFunctions: IExecuteFunctions,
  config: IDiscordOperationConfig<TParams>,
  executor: DiscordOperationExecutor<TParams, TResult>,
): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = []
  const items: INodeExecutionData[] = executeFunctions.getInputData()

  // Get credentials and create Discord client using V2 helpers
  const credentials = await getV2DiscordCredentials.call(executeFunctions)
  const client = await createV2DiscordClient.call(executeFunctions, credentials)

  if (!client) {
    throw new NodeOperationError(
      executeFunctions.getNode(),
      `Discord client is required for ${config.operationName} operations`,
    )
  }

  // Process each input item
  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        // Extract parameters using config
        const params = config.parameterExtractor(executeFunctions, itemIndex)

        // Validate parameters if validator provided
        if (config.validator && !config.validator(params)) {
          returnData.push({
            json: {
              success: false,
              error: `Invalid parameters for ${config.operationName}`,
              action: config.operationName,
              timestamp: new Date().toISOString(),
            },
          })
          continue
        }

        // Create operation context
        const context: IDiscordOperationContext = {
          executeFunctions,
          client,
          itemIndex,
        }

        // Execute the Discord operation
        const result = await executor(params, context)

        // Add successful result to return data
        // Use centralized helper for converting result to IDataObject
        const { toIDataObject } = await import('../../v2/helpers/type-helpers')
        returnData.push({
          json: toIDataObject(result),
        })
      } catch (error) {
        // Use enhanced Discord error handling from Phase 2.3
        handleDiscordError(
          error,
          executeFunctions,
          config.operationName,
          { operation: config.operationName },
          itemIndex,
        )
      }
    }
  } finally {
    // Ensure client is released back to pool
    try {
      const { releaseV2DiscordClientByInstance } = await import('../../v2/helpers/v2-credentials')
      await releaseV2DiscordClientByInstance.call(executeFunctions, client)
    } catch (err) {
      // Don't fail the whole operation if releasing the client fails

      handleDiscordError(err, executeFunctions, 'release-client', { operation: 'release-client' }, -1)
    }
  }

  return [returnData]
}

/**
 * Validate Discord member operation parameters
 */
export function validateMemberOperationParams(params: { guildId?: string; userId?: string }): boolean {
  return Boolean(params.guildId && params.userId)
}

/**
 * Create standard Discord operation response
 */
export function createDiscordOperationResponse(
  baseParams: { guildId: string; userId: string },
  action: string,
  additionalData?: Record<string, unknown>,
): IDiscordOperationResult {
  return {
    success: true,
    guildId: baseParams.guildId,
    userId: baseParams.userId,
    action,
    timestamp: new Date().toISOString(),
    ...additionalData,
  }
}
