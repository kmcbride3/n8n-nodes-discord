/**
 * Discord V2 Trigger Factory
 *
 * Generic factory function that creates Discord.js event-based triggers using
 * declarative configuration from the trigger registry.
 *
 * This eliminates the need for separate trigger implementations by using a
 * single factory pattern that handles:
 * - Credential retrieval
 * - Client creation with error handling
 * - Event listener setup
 * - Data transformation
 * - Optional filtering
 * - Cleanup on trigger close
 */

import type { IDataObject, ITriggerFunctions, ITriggerResponse } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import { createTriggerResponse, getDiscordClientWithErrorHandling, getDiscordCredentials } from '../triggerHelpers'
import { TRIGGER_REGISTRY, type TriggerConfig } from './triggerRegistry'

/**
 * Generic trigger factory that creates Discord.js event-based triggers
 *
 * This factory eliminates the need for separate trigger implementations
 * by using declarative configuration from the trigger registry.
 *
 * @param triggerKey - Key from TRIGGER_REGISTRY to use
 * @returns ITriggerResponse with Discord.js event listener setup
 */
export async function createDiscordTrigger(this: ITriggerFunctions, triggerKey: string): Promise<ITriggerResponse> {
  // Get trigger configuration
  const config: TriggerConfig | undefined = TRIGGER_REGISTRY[triggerKey]

  if (!config) {
    throw new NodeOperationError(this.getNode(), `Unknown trigger type: ${triggerKey}`, {
      description: `Trigger type "${triggerKey}" is not defined in the trigger registry`,
    })
  }

  // Standard setup (same for all triggers)
  const credentials = await getDiscordCredentials(this)
  const client = await getDiscordClientWithErrorHandling.call(this, credentials, config.triggerType)

  // Create event handler using configuration (supports async filters for partial data fetching)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = async (...eventArgs: any[]) => {
    try {
      // Apply filter if defined (supports both sync and async filters)
      if (config.filter) {
        const shouldSkip = await config.filter.call(this, ...eventArgs)
        if (!shouldSkip) {
          return // Skip this event
        }
      }

      // Transform event data using configuration
      const transformedData = config.transformEvent.call(this, ...eventArgs)

      if (transformedData === null) {
        return // Skip if transformation returns null
      }

      // Emit to n8n workflow - use this.emit directly to maintain proper context
      this.emit([[{ json: transformedData as IDataObject }]])
    } catch (error) {
      // Log transformation errors AND emit to n8n for visibility in execution log
      LoggerProxy.error(`Error in ${triggerKey} event handler`, {
        error: error instanceof Error ? error.message : String(error),
        triggerKey,
      })

      // Emit error to n8n so it appears in the execution log
      this.emitError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  // Attach handler to Discord.js client
  client.on(config.discordEvent, handler)

  // Return trigger response with cleanup and cache key for reference counting
  return createTriggerResponse(
    client,
    () => {
      client.off(config.discordEvent, handler)
    },
    credentials.botToken, // Pass cache key for reference counting
  )
}
