/**
 * Snowflake validation utilities using Discord.js built-in functionality
 *
 * This module provides snowflake validation using Discord.js SnowflakeUtil
 * instead of custom regex patterns, ensuring compatibility and accuracy.
 */

import { SnowflakeUtil } from 'discord.js'
import type { INode } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Validates a Discord snowflake ID using Discord.js built-in validation
 *
 * Combines length check (17-19 digits) with Discord.js SnowflakeUtil.decode()
 * for comprehensive validation. Discord snowflakes must be numeric strings
 * of 17-19 characters representing a valid Discord timestamp.
 *
 * @param id - The snowflake ID to validate (string or number)
 * @returns True if valid snowflake, false otherwise
 *
 * @example
 * isValidSnowflake('123456789012345678'); // true
 * isValidSnowflake('invalid'); // false
 * isValidSnowflake(''); // false
 * isValidSnowflake('12345'); // false (too short)
 */
export function isValidSnowflake(id: string | number): boolean {
  if (!id) return false

  const idStr = String(id)

  // Discord snowflakes are 17-19 digits (length check for DoS protection)
  if (idStr.length < 17 || idStr.length > 19) {
    return false
  }

  // Must be numeric only
  if (!/^\d+$/.test(idStr)) {
    return false
  }

  try {
    // Verify it's a valid Discord snowflake using Discord.js
    SnowflakeUtil.decode(idStr)
    return true
  } catch {
    return false
  }
}

/**
 * Validates a snowflake ID and throws a detailed error if invalid
 *
 * @param id - The snowflake ID to validate
 * @param fieldName - Name of the field for error messages
 * @param node - The n8n node for error context
 * @returns The validated snowflake ID
 * @throws NodeOperationError if invalid
 *
 * @example
 * validateSnowflake('123456789012345678', 'Channel ID', this.getNode());
 */
export function validateSnowflake(id: string, fieldName: string, node: INode): string {
  if (!isValidSnowflake(id)) {
    throw new NodeOperationError(node, `Invalid ${fieldName}: Must be a valid Discord snowflake ID (17-19 digits)`)
  }
  return id
}

/**
 * Gets the timestamp from a Discord snowflake ID
 *
 * Uses Discord.js SnowflakeUtil to extract the timestamp embedded in the snowflake.
 * This is useful for determining when a Discord resource (message, channel, etc.) was created.
 *
 * @param id - The snowflake ID to decode
 * @param node - The n8n node for error context (optional for utility functions)
 * @returns Unix timestamp in milliseconds
 * @throws NodeOperationError if snowflake is invalid
 *
 * @example
 * const timestamp = getSnowflakeTimestamp('123456789012345678', this.getNode());
 * const date = new Date(timestamp);
 * console.log(`Resource created at: ${date.toISOString()}`);
 */
export function getSnowflakeTimestamp(id: string, node?: INode): number {
  if (!isValidSnowflake(id)) {
    const error = new NodeOperationError(
      node || ({ type: 'n8n-nodes-discord.snowflake' } as INode),
      'Invalid snowflake ID',
      {
        description: 'Must be a valid Discord snowflake (17-19 digits)',
      },
    )
    throw error
  }
  return SnowflakeUtil.timestampFrom(id)
}

/**
 * Decodes a snowflake ID into its components
 *
 * Uses Discord.js SnowflakeUtil to extract all components of a Discord snowflake,
 * including timestamp, worker ID, process ID, and increment. This provides deep
 * insight into the snowflake's structure for debugging and analysis purposes.
 *
 * @param id - The snowflake ID to decode
 * @param node - The n8n node for error context (optional for utility functions)
 * @returns Decoded snowflake components (timestamp, workerId, processId, increment)
 * @throws NodeOperationError if snowflake is invalid
 *
 * @example
 * const decoded = decodeSnowflake('123456789012345678', this.getNode());
 * console.log(`Timestamp: ${decoded.timestamp}`);
 * console.log(`Worker ID: ${decoded.workerId}, Process ID: ${decoded.processId}`);
 */
export function decodeSnowflake(id: string, node?: INode) {
  if (!isValidSnowflake(id)) {
    const error = new NodeOperationError(
      node || ({ type: 'n8n-nodes-discord.snowflake' } as INode),
      'Invalid snowflake ID',
      {
        description: 'Must be a valid Discord snowflake (17-19 digits)',
      },
    )
    throw error
  }
  return SnowflakeUtil.decode(id)
}
