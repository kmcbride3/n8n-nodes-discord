/**
 * Shared Validation Utilities using Discord.js
 *
 * This module provides validation utilities using Discord.js built-in patterns
 * for consistent validation across V1/V2 implementations.
 */

import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { isValidSnowflake } from '../../v2/helpers/utils'

/**
 * Validates a Discord snowflake ID using Discord.js built-in validation
 */
export function validateDiscordSnowflake(
  this: IExecuteFunctions | undefined,
  snowflake: string,
  type: 'user' | 'guild' | 'channel' | 'message' | 'role' = 'user',
): string {
  if (!snowflake || typeof snowflake !== 'string') {
    const error = new Error(`${type} ID is required and must be a string`)
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  if (!isValidSnowflake(snowflake)) {
    const error = new Error(`Invalid ${type} ID: "${snowflake}" is not a valid Discord snowflake ID`)
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  return snowflake
}

/**
 * Validates a Discord channel ID
 */
export function validateChannelId(this: IExecuteFunctions | undefined, channelId: string): string {
  return validateDiscordSnowflake.call(this, channelId, 'channel')
}

/**
 * Validates a Discord user ID
 */
export function validateUserId(this: IExecuteFunctions | undefined, userId: string): string {
  return validateDiscordSnowflake.call(this, userId, 'user')
}

/**
 * Validates a Discord guild ID
 */
export function validateGuildId(this: IExecuteFunctions | undefined, guildId: string): string {
  return validateDiscordSnowflake.call(this, guildId, 'guild')
}

/**
 * Validates a Discord message ID
 */
export function validateMessageId(this: IExecuteFunctions | undefined, messageId: string): string {
  return validateDiscordSnowflake.call(this, messageId, 'message')
}

/**
 * Validates a Discord role ID
 */
export function validateRoleId(this: IExecuteFunctions | undefined, roleId: string): string {
  return validateDiscordSnowflake.call(this, roleId, 'role')
}

/**
 * Validates an array of Discord snowflake IDs
 */
export function validateDiscordSnowflakeArray(
  this: IExecuteFunctions | undefined,
  snowflakes: string[],
  type: 'user' | 'guild' | 'channel' | 'message' | 'role' = 'user',
): string[] {
  if (!Array.isArray(snowflakes)) {
    const error = new Error(`${type} IDs must be an array`)
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  return snowflakes.map((snowflake) => validateDiscordSnowflake.call(this, snowflake, type))
}

/**
 * Validates a timeout duration for Discord member timeouts
 */
export function validateTimeoutDuration(this: IExecuteFunctions | undefined, duration: number): number {
  if (typeof duration !== 'number' || duration < 0) {
    const error = new Error('Timeout duration must be a positive number')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  // Discord API limits: max timeout is 28 days (2419200 seconds)
  const maxTimeout = 28 * 24 * 60 * 60 // 28 days in seconds
  if (duration > maxTimeout) {
    const error = new Error(`Timeout duration cannot exceed 28 days (${maxTimeout} seconds)`)
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  return duration
}

/**
 * Validates a message count for bulk operations
 */
export function validateMessageCount(this: IExecuteFunctions | undefined, count: number): number {
  if (typeof count !== 'number' || count < 1 || count > 100) {
    const error = new Error('Message count must be between 1 and 100')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  return count
}

/**
 * Validates a delete message days parameter for bans
 */
export function validateDeleteMessageDays(this: IExecuteFunctions | undefined, days: number): number {
  if (typeof days !== 'number' || days < 0 || days > 7) {
    const error = new Error('Delete message days must be between 0 and 7')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  return days
}

/**
 * Validates and sanitizes an audit log reason
 */
export function validateAuditLogReason(this: IExecuteFunctions | undefined, reason?: string): string | undefined {
  if (!reason) return undefined

  if (typeof reason !== 'string') {
    const error = new Error('Audit log reason must be a string')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  // Discord API limit: audit log reasons are limited to 512 characters
  if (reason.length > 512) {
    const error = new Error('Audit log reason cannot exceed 512 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  return reason.trim()
}

/**
 * Validates a Discord embed field
 */
export function validateEmbedField(
  this: IExecuteFunctions | undefined,
  field: { name: string; value: string; inline?: boolean },
): { name: string; value: string; inline?: boolean } {
  if (!field.name || typeof field.name !== 'string') {
    const error = new Error('Embed field name is required and must be a string')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  if (!field.value || typeof field.value !== 'string') {
    const error = new Error('Embed field value is required and must be a string')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  // Discord API limits
  if (field.name.length > 256) {
    const error = new Error('Embed field name cannot exceed 256 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  if (field.value.length > 1024) {
    const error = new Error('Embed field value cannot exceed 1024 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  return {
    name: field.name.trim(),
    value: field.value.trim(),
    inline: field.inline ?? false,
  }
}

/**
 * Validates Discord embed limits
 */
export function validateEmbedLimits(
  this: IExecuteFunctions | undefined,
  embed: {
    title?: string
    description?: string
    fields?: Array<{ name: string; value: string; inline?: boolean }>
    footer?: { text: string }
    author?: { name: string }
  },
): void {
  // Discord embed limits
  if (embed.title && embed.title.length > 256) {
    const error = new Error('Embed title cannot exceed 256 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  if (embed.description && embed.description.length > 4096) {
    const error = new Error('Embed description cannot exceed 4096 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  if (embed.fields && embed.fields.length > 25) {
    const error = new Error('Embed cannot have more than 25 fields')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  if (embed.footer?.text && embed.footer.text.length > 2048) {
    const error = new Error('Embed footer text cannot exceed 2048 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  if (embed.author?.name && embed.author.name.length > 256) {
    const error = new Error('Embed author name cannot exceed 256 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }

  // Calculate total character count
  const totalLength =
    (embed.title?.length || 0) +
    (embed.description?.length || 0) +
    (embed.fields?.reduce((acc, field) => acc + field.name.length + field.value.length, 0) || 0) +
    (embed.footer?.text?.length || 0) +
    (embed.author?.name?.length || 0)

  if (totalLength > 6000) {
    const error = new Error('Total embed character count cannot exceed 6000 characters')
    if (this) {
      throw new NodeOperationError(this.getNode(), error.message)
    }
    throw error
  }
}
