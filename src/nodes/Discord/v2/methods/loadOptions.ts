import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import {
  getChannelsForLoadOptions,
  getGuildsForLoadOptions,
  getRolesForLoadOptions,
} from '../../helpers/loadOptions'

/**
 * Load channel options for Discord V2 nodes
 *
 * Fetches available Discord channels from the bot's guilds and formats them
 * as n8n option properties for dropdowns in the node UI. Requires valid Discord
 * credentials and an active bot connection.
 *
 * @param this - n8n load options context with credential access
 * @returns Promise resolving to array of channel options (name and value pairs)
 * @throws NodeOperationError if credentials are invalid or Discord API fails
 *
 * @example
 * // Used automatically by n8n for channel selection dropdowns
 * // in node parameters with: typeOptions: { loadOptionsMethod: 'getChannels' }
 */
export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  try {
    return await getChannelsForLoadOptions.call(this)
  } catch (error: unknown) {
    throw new NodeOperationError(this.getNode(), error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Load role options for Discord V2 nodes
 *
 * Fetches available Discord roles from the bot's guilds and formats them
 * as n8n option properties for dropdowns in the node UI. Requires valid Discord
 * credentials and an active bot connection.
 *
 * @param this - n8n load options context with credential access
 * @returns Promise resolving to array of role options (name and value pairs)
 * @throws NodeOperationError if credentials are invalid or Discord API fails
 *
 * @example
 * // Used automatically by n8n for role selection dropdowns
 * // in node parameters with: typeOptions: { loadOptionsMethod: 'getRoles' }
 */
export async function getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  try {
    return await getRolesForLoadOptions.call(this)
  } catch (error: unknown) {
    throw new NodeOperationError(this.getNode(), error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Load guild options for Discord V2 nodes
 *
 * Fetches available Discord guilds (servers) that the bot is a member of and formats them
 * as n8n option properties for dropdowns in the node UI. Requires valid Discord
 * credentials and an active bot connection.
 *
 * @param this - n8n load options context with credential access
 * @returns Promise resolving to array of guild options (name and value pairs)
 * @throws NodeOperationError if credentials are invalid or Discord API fails
 *
 * @example
 * // Used automatically by n8n for guild selection dropdowns
 * // in node parameters with: typeOptions: { loadOptionsMethod: 'getGuilds' }
 */
export async function getGuilds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  try {
    return await getGuildsForLoadOptions.call(this)
  } catch (error: unknown) {
    throw new NodeOperationError(this.getNode(), error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Get all load options for Discord V2 nodes (shared between regular and trigger nodes)
 */
export function getAllLoadOptions() {
  return {
    getChannels,
    getRoles,
    getGuilds,
  }
}
