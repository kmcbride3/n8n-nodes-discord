import type { INodeProperties } from 'n8n-workflow'

// Import V2 action properties
import { versionDescription as actionVersionDescription } from './actions/versionDescription'
// Import V2 trigger properties
import { getAllProperties as getV2TriggerProperties } from './triggers/properties'

/**
 * Get properties for Discord V2 regular node
 */
export function getNodeProperties(): INodeProperties[] {
  return actionVersionDescription.properties
}

/**
 * Get properties for Discord V2 trigger node (pure V2 implementation)
 */
export function getTriggerProperties(): INodeProperties[] {
  return getV2TriggerProperties()
}

/**
 * Default export for regular node (backward compatibility)
 */
export function getAllProperties(): INodeProperties[] {
  return getNodeProperties()
}
