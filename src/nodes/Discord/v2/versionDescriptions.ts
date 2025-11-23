import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow'
import { NodeConnectionTypes } from 'n8n-workflow'

/**
 * Base version description shared between Discord V2 nodes
 * V2 uses official n8n built-in discordBotApi credentials
 */
const baseVersionDescription = {
  version: 2 as const,
  credentials: [
    {
      name: 'discordBotApi',
      required: true,
    },
  ],
  properties: [] as INodeProperties[], // Will be populated by getAllProperties()
}

/**
 * Version description for the main Discord V2 node
 */
export const nodeVersionDescription: Partial<INodeTypeDescription> = {
  ...baseVersionDescription,
  defaults: {
    name: 'Discord',
  },
  usableAsTool: true as const,
  inputs: [NodeConnectionTypes.Main],
  outputs: [NodeConnectionTypes.Main],
}

/**
 * Version description for the Discord V2 trigger node
 * Pure WebSocket-based triggers - no webhook configuration needed
 */
export const triggerVersionDescription: Partial<INodeTypeDescription> = {
  ...baseVersionDescription,
  eventTriggerDescription: '',
  mockManualExecution: true as const,
  activationMessage: 'Your workflow will now trigger executions on the event you have defined.',
  defaults: {
    name: 'Discord Trigger',
  },
  inputs: [],
  outputs: [NodeConnectionTypes.Main],
}

// Export the original for backward compatibility
export const versionDescription = nodeVersionDescription
