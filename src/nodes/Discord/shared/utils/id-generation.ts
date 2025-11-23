/**
 * ID generation utilities using Node.js built-in crypto
 *
 * This module provides unique ID generation using Node.js crypto.randomUUID()
 * instead of external dependencies, ensuring better security and performance.
 */

import { randomUUID } from 'crypto'

/**
 * Generates a unique ID using Node.js built-in crypto.randomUUID
 *
 * Replaces hexoid dependency with Node.js built-in functionality.
 * UUID v4 provides high entropy and cryptographically secure randomness.
 *
 * @param length - Optional length for the ID (default: 32 chars without hyphens)
 * @returns A unique ID string (hex characters)
 *
 * @example
 * generateUniqueId()     // Returns 32-char hex string (full UUID without hyphens)
 * generateUniqueId(8)    // Returns 8-char hex string
 * generateUniqueId(16)   // Returns 16-char hex string
 */
export function generateUniqueId(length?: number): string {
  const uuid = randomUUID().replace(/-/g, '') // 32 hex chars

  if (length && length > 0 && length <= uuid.length) {
    return uuid.substring(0, length)
  }

  return uuid
}

/**
 * Generates a unique ID for Discord components (buttons, selects, etc.)
 *
 * Uses 8-character IDs by default for readability in Discord UI
 * while maintaining sufficient uniqueness for component interactions.
 *
 * @returns An 8-character unique ID
 *
 * @example
 * const buttonId = generateComponentId(); // e.g., 'a3f7b2c9'
 */
export function generateComponentId(): string {
  return generateUniqueId(8)
}
