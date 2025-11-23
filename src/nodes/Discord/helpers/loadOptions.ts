/**
 * Discord LoadOptions Helper Functions
 *
 * This file contains n8n-specific helper functions for Discord integration.
 * These functions are used to populate dropdown options in the n8n UI.
 */

import { ChannelType, type Client } from 'discord.js'
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Check if a Discord client is available and ready
 */
function isClientReady(client?: Client): client is Client {
  return client !== undefined && client.isReady()
}

/**
 * Gets channels for loadOptions using Discord.js client when available
 * This is an n8n-specific helper for populating dropdown options
 * Fetches guild channels and formats them for n8n dropdown selection
 *
 * @param this - n8n load options execution context
 * @param client - Optional pre-initialized Discord.js client
 * @returns Array of channel options for n8n dropdown
 *
 * @example
 * const channels = await getChannelsForLoadOptions.call(this, discordClient);
 */
export async function getChannelsForLoadOptions(
  this: ILoadOptionsFunctions,
  client?: Client,
): Promise<INodePropertyOptions[]> {
  const credentials = await this.getCredentials('discordApi')
  const guildId = credentials.guildId as string

  if (!guildId) {
    return [
      {
        name: 'Guild ID is required in Discord API credentials',
        value: 'error',
      },
    ]
  }

  try {
    if (isClientReady(client)) {
      // Use Discord.js client for better performance and caching
      const guild = await client.guilds.fetch(guildId)
      const channels = await guild.channels.fetch()

      // Filter to text channels and announcement channels
      const textChannels = channels.filter(
        (channel) => channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement,
      )

      return textChannels.map((channel) => ({
        name: channel?.name || 'Unknown Channel',
        value: channel?.id || 'unknown',
      }))
    } else {
      // Fallback: This should not be used in pure Discord.js architecture
      throw new NodeOperationError(
        this.getNode(),
        'Discord client is required for channel operations. Please ensure the Discord client is connected and ready.',
      )
    }
  } catch (error) {
    return [
      {
        name: `Error loading channels: ${error}`,
        value: 'error',
      },
    ]
  }
}

/**
 * Gets roles for loadOptions using Discord.js client when available
 * This is an n8n-specific helper for populating dropdown options
 * Fetches guild roles and formats them for n8n dropdown selection
 *
 * @param this - n8n load options execution context
 * @param client - Optional pre-initialized Discord.js client
 * @returns Array of role options for n8n dropdown
 *
 * @example
 * const roles = await getRolesForLoadOptions.call(this, discordClient);
 */
export async function getRolesForLoadOptions(
  this: ILoadOptionsFunctions,
  client?: Client,
): Promise<INodePropertyOptions[]> {
  const credentials = await this.getCredentials('discordApi')
  const guildId = credentials.guildId as string

  if (!guildId) {
    return [
      {
        name: 'Guild ID is required in Discord API credentials',
        value: 'error',
      },
    ]
  }

  try {
    if (isClientReady(client)) {
      // Use Discord.js client for better performance and caching
      const guild = await client.guilds.fetch(guildId)
      const roles = await guild.roles.fetch()

      return roles.map((role) => ({
        name: role.name || 'Unknown Role',
        value: role.id,
      }))
    } else {
      // Fallback: This should not be used in pure Discord.js architecture
      throw new NodeOperationError(
        this.getNode(),
        'Discord client is required for role operations. Please ensure the Discord client is connected and ready.',
      )
    }
  } catch (error) {
    return [
      {
        name: `Error loading roles: ${error}`,
        value: 'error',
      },
    ]
  }
}
