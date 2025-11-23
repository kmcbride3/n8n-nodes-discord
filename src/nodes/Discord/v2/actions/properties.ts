import type { INodeProperties } from 'n8n-workflow'

import { versionDescription } from './versionDescription'

export function getAllProperties(): INodeProperties[] {
  // Use the V2 resource/operation pattern instead of V1 properties
  return versionDescription.properties
}
