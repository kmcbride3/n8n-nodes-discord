/**
 * Simple Consolidated Discord Validation
 *
 * This module provides essential Discord validation functions with consistent
 * error handling and Discord.js integration, replacing scattered validations.
 */

import { SnowflakeUtil, verifyString } from 'discord.js'
import type { INode } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { DiscordLimits, DiscordValidationPatterns } from '../constants/discord-constants'

/**
 * Enhanced snowflake validation using Discord.js SnowflakeUtil
 */
export function validateSnowflake(id: string, fieldName: string, node: INode, allowEmpty = false): string {
  if (!id || id.trim() === '') {
    if (allowEmpty) return ''
    throw new NodeOperationError(node, `${fieldName} is required`)
  }

  const trimmedId = id.trim()

  if (!DiscordValidationPatterns.SNOWFLAKE.test(trimmedId)) {
    throw new NodeOperationError(node, `Invalid ${fieldName} format. Must be a valid Discord ID (17-19 digits)`)
  }

  try {
    const timestamp = SnowflakeUtil.timestampFrom(trimmedId)
    const discordEpoch = 1420070400000 // Discord epoch: 2015-01-01
    if (timestamp < discordEpoch) {
      throw new NodeOperationError(node, `Invalid ${fieldName}: ID timestamp is before Discord epoch`)
    }
    return trimmedId
  } catch (error) {
    throw new NodeOperationError(
      node,
      `Invalid ${fieldName}: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
    )
  }
}

/**
 * Enhanced hex color validation using Discord.js verifyString
 */
export function validateColorHex(color: string, node: INode, allowEmpty = false): number {
  if (!color || color.trim() === '') {
    if (allowEmpty) return 0
    throw new NodeOperationError(node, 'Color is required')
  }

  const trimmedColor = color.trim()
  const hexMatch = trimmedColor.match(DiscordValidationPatterns.HEX_COLOR)
  if (!hexMatch) {
    throw new NodeOperationError(node, 'Invalid color format. Use hex format (#RRGGBB or RRGGBB)')
  }

  const hexValue = parseInt(hexMatch[1], 16)

  if (hexValue < DiscordLimits.COLOR_MIN || hexValue > DiscordLimits.COLOR_MAX) {
    throw new NodeOperationError(
      node,
      `Color value must be between ${DiscordLimits.COLOR_MIN} and ${DiscordLimits.COLOR_MAX}`,
    )
  }

  try {
    const colorString = `#${hexMatch[1]}`
    verifyString(colorString)
    return hexValue
  } catch (error) {
    throw new NodeOperationError(
      node,
      `Invalid color value: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
    )
  }
}

/**
 * Validate message content length
 */
export function validateMessageContent(content: string, node: INode, allowEmpty = false): string {
  if (!content || content.trim() === '') {
    if (allowEmpty) return ''
    throw new NodeOperationError(node, 'Message content is required')
  }

  if (content.length > DiscordLimits.MESSAGE_CONTENT_MAX) {
    throw new NodeOperationError(
      node,
      `Message content exceeds maximum length of ${DiscordLimits.MESSAGE_CONTENT_MAX} characters`,
    )
  }

  return content
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, node: INode, allowEmpty = false): string {
  if (!url || url.trim() === '') {
    if (allowEmpty) return ''
    throw new NodeOperationError(node, 'URL is required')
  }

  const trimmedUrl = url.trim()

  try {
    const urlObj = new URL(trimmedUrl)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new NodeOperationError(node, 'URL must use HTTP or HTTPS protocol')
    }
    return trimmedUrl
  } catch (error) {
    throw new NodeOperationError(
      node,
      `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Validate audit log reason length
 */
export function validateAuditLogReason(reason: string, node: INode, allowEmpty = true): string {
  if (!reason || reason.trim() === '') {
    if (allowEmpty) return ''
    throw new NodeOperationError(node, 'Audit log reason is required')
  }

  if (reason.length > DiscordLimits.AUDIT_LOG_REASON_MAX) {
    throw new NodeOperationError(
      node,
      `Audit log reason exceeds maximum length of ${DiscordLimits.AUDIT_LOG_REASON_MAX} characters`,
    )
  }

  return reason.trim()
}

// Re-export from shared location for backward compatibility
export { isValidSnowflake } from './snowflake'

// Import for use in DiscordValidation object
import { isValidSnowflake as isValidSnowflakeImport } from './snowflake'

/**
 * Consolidated validation object for easy access
 */
export const DiscordValidation = {
  snowflake: validateSnowflake,
  colorHex: validateColorHex,
  messageContent: validateMessageContent,
  url: validateUrl,
  auditLogReason: validateAuditLogReason,
  isValidSnowflake: isValidSnowflakeImport,
}
