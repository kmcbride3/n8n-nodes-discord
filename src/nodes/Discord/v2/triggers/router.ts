import type { IExecuteFunctions, INodeExecutionData, ITriggerFunctions, ITriggerResponse } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { createDiscordTrigger } from './triggerFactory'
import { TRIGGER_REGISTRY } from './triggerRegistry'

/**
 * Route trigger requests to the appropriate trigger configuration
 * Uses the trigger factory pattern for all triggers
 */
export async function router(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {
  const type = this.getNodeParameter('type', 0) as string

  try {
    // Validate trigger type exists in registry
    if (!TRIGGER_REGISTRY[type]) {
      throw new NodeOperationError(this.getNode(), `Unknown trigger type: ${type}`, {
        description: 'This trigger type is not supported. Please check the node configuration.',
      })
    }

    // Use factory to create trigger
    return await createDiscordTrigger.call(this, type)
  } catch (error) {
    if (error instanceof NodeOperationError) {
      throw error
    }
    throw new NodeOperationError(this.getNode(), `Discord trigger failed: ${error.message}`, {
      description: 'An unexpected error occurred while setting up the Discord trigger',
    })
  }
}

export async function executeRouter(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const type = this.getNodeParameter('type', 0) as string

  try {
    switch (type) {
      case 'message':
      case 'message_update':
        // Message triggers use pure Discord.js event listeners and don't have execute methods
        throw new NodeOperationError(
          this.getNode(),
          `Message triggers are handled through Discord.js event listeners and don't support manual execution`,
        )
      case 'thread':
      case 'thread_update':
        // Thread triggers use pure Discord.js event listeners and don't have execute methods
        throw new NodeOperationError(
          this.getNode(),
          `Thread triggers are handled through Discord.js event listeners and don't support manual execution`,
        )
      case 'command':
      case 'interaction':
        // Command/interaction triggers use pure Discord.js event listeners and don't have execute methods
        throw new NodeOperationError(
          this.getNode(),
          `Command and interaction triggers are handled through Discord.js event listeners and don't support manual execution`,
        )
      case 'userJoins':
      case 'userLeaves':
      case 'userUpdate':
      case 'presenceUpdate':
      case 'userNickUpdated':
      case 'userRoleAdded':
      case 'userRoleRemoved':
        // User triggers use pure Discord.js event listeners and don't have execute methods
        throw new NodeOperationError(
          this.getNode(),
          `User triggers are handled through Discord.js event listeners and don't support manual execution`,
        )
      default:
        throw new NodeOperationError(this.getNode(), `Unknown trigger type: ${type}`)
    }
  } catch (error) {
    if (error instanceof NodeOperationError) {
      throw error
    }
    throw new NodeOperationError(this.getNode(), `Discord trigger execution failed: ${error.message}`, {
      description: 'An unexpected error occurred while executing the Discord trigger',
    })
  }
}
