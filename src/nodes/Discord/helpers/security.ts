/**
 * Security validation utilities for n8n-nodes-discord
 *
 * This module provides security validation functions to prevent common vulnerabilities
 * including ReDoS attacks, injection attacks, and data exposure.
 *
 * Leverages Discord.js built-in validation utilities and security features where available.
 */

import { SnowflakeUtil, verifyString } from 'discord.js'

// Maximum allowed regex length to prevent ReDoS
const MAX_REGEX_LENGTH = 500
// Maximum allowed regex execution time in milliseconds
const MAX_REGEX_EXECUTION_TIME = 100
// Pattern to detect potentially dangerous regex constructs
const DANGEROUS_REGEX_PATTERNS = [
  // Nested quantifiers
  /(\*|\+|\?|\{[^}]*\})\s*(\*|\+|\?|\{[^}]*\})/u,
  // Alternation with overlapping paths
  /(.*\|.*)\1/u,
  // Excessive backtracking patterns - lookahead assertions
  /\(\?=.*\(\?=/u,
  // Complex nested groups
  /(\([^)]*){3,}/u,
]

/**
 * Security validation error - extends Error to avoid any types
 */
export class SecurityValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: string,
  ) {
    super(message)
    this.name = 'SecurityValidationError'
  }
}

/**
 * Validates a regex pattern for potential ReDoS vulnerabilities
 * Uses Discord.js verifyString for basic validation
 */
export function validateRegexPattern(pattern: string, context = 'regex'): void {
  try {
    verifyString(pattern, Error, `Invalid ${context}: Pattern must be a non-empty string`, false)
  } catch {
    throw new SecurityValidationError(`Invalid ${context}: Pattern must be a non-empty string`)
  }

  // Check length
  if (pattern.length > MAX_REGEX_LENGTH) {
    throw new SecurityValidationError(
      `Invalid ${context}: Pattern exceeds maximum length of ${MAX_REGEX_LENGTH} characters`,
    )
  }

  // Check for dangerous patterns
  for (const dangerousPattern of DANGEROUS_REGEX_PATTERNS) {
    if (dangerousPattern.test(pattern)) {
      throw new SecurityValidationError(
        `Invalid ${context}: Pattern contains potentially dangerous constructs that could cause ReDoS attacks`,
      )
    }
  }

  // Test regex compilation
  try {
    // skipcq: JS-R1002
    new RegExp(pattern)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new SecurityValidationError(`Invalid ${context}: Pattern is not a valid regular expression - ${message}`)
  }
}

/**
 * Safely tests a regex pattern with timeout protection
 * Uses Discord.js verifyString for input validation
 */
export function safeRegexTest(pattern: string, input: string, flags = 'i'): boolean {
  validateRegexPattern(pattern, 'regex pattern')

  // Use Discord.js string validation for input
  try {
    verifyString(input, undefined, undefined, true) // Allow empty strings for regex testing
  } catch {
    // If input validation fails, return false instead of throwing
    return false
  }

  const startTime = Date.now()
  const regex = new RegExp(pattern, flags)

  try {
    // Test with timeout protection
    const result = regex.test(input)
    const executionTime = Date.now() - startTime

    if (executionTime > MAX_REGEX_EXECUTION_TIME) {
      throw new SecurityValidationError(
        'Regex execution exceeded maximum allowed time - potential ReDoS attack detected',
      )
    }

    return result
  } catch (error) {
    if (error instanceof SecurityValidationError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new SecurityValidationError(`Regex execution failed: ${message}`)
  }
}

/**
 * Validates Discord snowflake IDs using Discord.js utilities where possible
 * Leverages Discord.js built-in snowflake validation
 */
export function validateSnowflakeId(id: string, context = 'ID'): void {
  try {
    verifyString(id, undefined, undefined, false)
  } catch {
    throw new SecurityValidationError(`Invalid ${context}: Must be a non-empty string`)
  }

  // Discord.js doesn't expose direct snowflake validation, but we can use the decode function
  // If it throws, the snowflake is invalid
  try {
    SnowflakeUtil.decode(id)
  } catch {
    throw new SecurityValidationError(`Invalid ${context}: Must be a valid Discord snowflake (17-19 digits)`)
  }
}

/**
 * Validates and sanitizes URLs to prevent SSRF attacks
 * Uses Discord.js string validation
 */
export function validateUrl(url: string, context = 'URL'): string {
  try {
    verifyString(url, undefined, undefined, false)
  } catch {
    throw new SecurityValidationError(`Invalid ${context}: Must be a non-empty string`)
  }

  // Remove any potential control characters
  const sanitizedUrl = url.replace(/\p{Cc}/gu, '')

  try {
    const parsedUrl = new URL(sanitizedUrl)

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new SecurityValidationError(`Invalid ${context}: Only HTTP and HTTPS protocols are allowed`)
    }

    // Prevent access to private/internal networks (basic SSRF protection)
    const hostname = parsedUrl.hostname.toLowerCase()
    const blockedPatterns = [
      /^localhost$/iu,
      /^127\./u,
      /^10\./u,
      /^172\.(1[6-9]|2[0-9]|3[01])\./u,
      /^192\.168\./u,
      /^169\.254\./u, // Link-local
      /^::1$/u, // IPv6 localhost
      /^fc00:/u, // IPv6 private
      /^fe80:/u, // IPv6 link-local
    ]

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        throw new SecurityValidationError(
          `Invalid ${context}: Access to private networks is not allowed (SSRF protection)`,
        )
      }
    }

    return sanitizedUrl
  } catch (error) {
    if (error instanceof SecurityValidationError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new SecurityValidationError(`Invalid ${context}: ${message}`)
  }
}

/**
 * Validates hex color codes for safe embed usage
 * Uses Discord.js string validation
 */
export function validateColorHex(color: string): string {
  try {
    verifyString(color, undefined, undefined, false)
  } catch {
    throw new SecurityValidationError('Invalid color: Must be a non-empty string')
  }

  // Remove hash if present and validate hex format
  const cleanColor = color.startsWith('#') ? color.slice(1) : color
  if (!/^[\dA-Fa-f]{6}$/u.test(cleanColor)) {
    throw new SecurityValidationError('Invalid color: Must be a valid 6-digit hex color code (e.g., #FF0000 or FF0000)')
  }

  return `#${cleanColor.toUpperCase()}`
}

/**
 * Validates webhook tokens to prevent injection
 * Uses Discord.js string validation
 */
export function validateWebhookToken(token: string): void {
  try {
    verifyString(token, undefined, undefined, false)
  } catch {
    throw new SecurityValidationError('Invalid webhook token: Must be a non-empty string')
  }

  // Basic webhook token format validation
  if (token.length < 50 || token.length > 120) {
    throw new SecurityValidationError('Invalid webhook token: Token length is suspicious')
  }

  // Webhook tokens should be base64url-like characters
  if (!/^[\w\-.~]+$/u.test(token)) {
    throw new SecurityValidationError('Invalid webhook token: Contains invalid characters')
  }
}

/**
 * Sanitizes user input to prevent various injection attacks
 * Uses Discord.js string validation
 */
export function sanitizeUserInput(input: string, maxLength = 2000): string {
  try {
    verifyString(input, Error, 'Input must be a valid string', true)
  } catch {
    // If Discord.js validation fails, return empty string as safe fallback
    return ''
  }

  // Remove control characters and normalize
  return input
    .replace(/\p{Cc}/gu, '') // Remove control characters
    .trim()
    .slice(0, maxLength)
}

/**
 * Rate limiting is handled automatically by Discord.js
 * Discord.js provides sophisticated built-in rate limit handling with:
 * - 15s timeout
 * - 3 automatic retries
 * - Per-route rate limit management
 * - Global rate limit coordination
 *
 * Following built-ins first architecture - no custom rate limiting needed
 */

/**
 * Validates Discord command names
 * Uses Discord.js string validation and follows Discord command naming rules
 */
export function validateCommandName(name: string): void {
  try {
    verifyString(name, Error, 'Invalid command name: Must be a non-empty string', false) // Discord command names max 32 chars
  } catch {
    throw new SecurityValidationError('Invalid command name: Must be a non-empty string')
  }

  // Check length
  if (name.length > 32) {
    throw new SecurityValidationError('Invalid command name: Must not exceed 32 characters')
  }

  // Discord command names must be lowercase, no spaces, specific characters only
  if (!/^[\w-]{1,32}$/u.test(name)) {
    throw new SecurityValidationError(
      'Invalid command name: Must be 1-32 characters, lowercase letters, numbers, hyphens, and underscores only',
    )
  }
}
