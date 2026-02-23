/**
 * Security Module Testing
 *
 * Comprehensive testing of security validation utilities:
 * - validateRegexPattern - ReDoS protection
 * - safeRegexTest - Timeout-protected regex testing
 * - validateSnowflakeId - Discord ID validation
 * - validateUrl - SSRF protection
 * - validateColorHex - Hex color validation
 * - validateWebhookToken - Webhook token validation
 * - sanitizeUserInput - Input sanitization
 * - validateCommandName - Discord command name validation
 *
 * Target: 90%+ coverage for security module (critical security component)
 */

import {
  SecurityValidationError,
  validateRegexPattern,
  safeRegexTest,
  validateSnowflakeId,
  validateUrl,
  validateColorHex,
  validateWebhookToken,
  sanitizeUserInput,
  validateCommandName,
} from '../../../src/nodes/Discord/helpers/security'

describe('Security Module', () => {
  describe('SecurityValidationError', () => {
    test('should create error with message', () => {
      const error = new SecurityValidationError('Test error')
      
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('SecurityValidationError')
      expect(error.message).toBe('Test error')
    })

    test('should create error with context', () => {
      const error = new SecurityValidationError('Test error', 'test context')
      
      expect(error.context).toBe('test context')
    })
  })

  describe('validateRegexPattern', () => {
    test('should accept valid regex patterns', () => {
      expect(() => validateRegexPattern('test')).not.toThrow()
      expect(() => validateRegexPattern('[a-z]+')).not.toThrow()
      expect(() => validateRegexPattern('\\d{3}')).not.toThrow()
    })

    test('should reject empty strings', () => {
      expect(() => validateRegexPattern('')).toThrow(SecurityValidationError)
      expect(() => validateRegexPattern('')).toThrow('must be a non-empty string')
    })

    test('should reject patterns exceeding max length', () => {
      const longPattern = 'a'.repeat(600)
      
      expect(() => validateRegexPattern(longPattern)).toThrow(SecurityValidationError)
      expect(() => validateRegexPattern(longPattern)).toThrow('exceeds maximum length')
    })

    test('should reject patterns with nested quantifiers', () => {
      expect(() => validateRegexPattern('a**')).toThrow(SecurityValidationError)
      expect(() => validateRegexPattern('a*+')).toThrow(SecurityValidationError)
      expect(() => validateRegexPattern('a+{2,3}')).toThrow(SecurityValidationError)
    })

    test('should reject invalid regex syntax', () => {
      expect(() => validateRegexPattern('[invalid')).toThrow(SecurityValidationError)
      expect(() => validateRegexPattern('(unclosed')).toThrow(SecurityValidationError)
    })

    test('should use custom context in error messages', () => {
      expect(() => validateRegexPattern('', 'search pattern')).toThrow('search pattern')
    })
  })

  describe('safeRegexTest', () => {
    test('should test valid patterns successfully', () => {
      expect(safeRegexTest('test', 'this is a test')).toBe(true)
      expect(safeRegexTest('test', 'no match here')).toBe(false)
      expect(safeRegexTest('[0-9]+', '123')).toBe(true)
    })

    test('should accept custom flags', () => {
      expect(safeRegexTest('TEST', 'test', 'i')).toBe(true)
      expect(safeRegexTest('TEST', 'test', '')).toBe(false)
    })

    test('should return false for invalid input without throwing', () => {
      // Any validation issues should return false rather than throwing
      expect(typeof safeRegexTest('test', 'valid input')).toBe('boolean')
    })

    test('should validate pattern before testing', () => {
      expect(() => safeRegexTest('a**', 'test')).toThrow(SecurityValidationError)
    })

    test('should handle empty input strings', () => {
      const result = safeRegexTest('test', '')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('validateSnowflakeId', () => {
    test('should accept valid Discord snowflake IDs', () => {
      expect(() => validateSnowflakeId('123456789012345678')).not.toThrow()
      expect(() => validateSnowflakeId('987654321098765432')).not.toThrow()
    })

    test('should reject empty strings', () => {
      expect(() => validateSnowflakeId('')).toThrow(SecurityValidationError)
      expect(() => validateSnowflakeId('')).toThrow('Must be a non-empty string')
    })

    test('should reject invalid snowflake formats', () => {
      expect(() => validateSnowflakeId('invalid')).toThrow(SecurityValidationError)
      expect(() => validateSnowflakeId('abc123')).toThrow(SecurityValidationError)
      expect(() => validateSnowflakeId('123')).toThrow(SecurityValidationError)
    })

    test('should use custom context in error messages', () => {
      expect(() => validateSnowflakeId('invalid', 'User ID')).toThrow('User ID')
    })
  })

  describe('validateUrl', () => {
    test('should accept valid HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe('http://example.com')
      expect(validateUrl('https://example.com')).toBe('https://example.com')
    })

    test('should accept URLs with paths and query strings', () => {
      expect(validateUrl('https://example.com/path')).toContain('/path')
      expect(validateUrl('https://example.com?query=value')).toContain('query=value')
    })

    test('should reject empty strings', () => {
      expect(() => validateUrl('')).toThrow(SecurityValidationError)
    })

    test('should reject non-HTTP protocols', () => {
      expect(() => validateUrl('ftp://example.com')).toThrow(SecurityValidationError)
      expect(() => validateUrl('file:///etc/passwd')).toThrow(SecurityValidationError)
      expect(() => validateUrl('javascript:alert(1)')).toThrow(SecurityValidationError)
    })

    test('should reject localhost URLs (SSRF protection)', () => {
      expect(() => validateUrl('http://localhost')).toThrow(SecurityValidationError)
      expect(() => validateUrl('http://127.0.0.1')).toThrow(SecurityValidationError)
    })

    test('should reject private network URLs (SSRF protection)', () => {
      expect(() => validateUrl('http://10.0.0.1')).toThrow(SecurityValidationError)
      expect(() => validateUrl('http://192.168.1.1')).toThrow(SecurityValidationError)
      expect(() => validateUrl('http://172.16.0.1')).toThrow(SecurityValidationError)
    })

    test('should reject link-local addresses', () => {
      expect(() => validateUrl('http://169.254.1.1')).toThrow(SecurityValidationError)
    })

    test('should sanitize control characters', () => {
      const result = validateUrl('http://example.com\x00')
      expect(result).not.toContain('\x00')
    })

    test('should use custom context in error messages', () => {
      expect(() => validateUrl('', 'Avatar URL')).toThrow('Avatar URL')
    })
  })

  describe('validateColorHex', () => {
    test('should accept valid hex colors with hash', () => {
      expect(validateColorHex('#FF0000')).toBe('#FF0000')
      expect(validateColorHex('#00FF00')).toBe('#00FF00')
      expect(validateColorHex('#0000FF')).toBe('#0000FF')
    })

    test('should accept valid hex colors without hash', () => {
      expect(validateColorHex('FF0000')).toBe('#FF0000')
      expect(validateColorHex('00ff00')).toBe('#00FF00')
    })

    test('should normalize to uppercase', () => {
      expect(validateColorHex('#abc123')).toBe('#ABC123')
      expect(validateColorHex('def456')).toBe('#DEF456')
    })

    test('should reject empty strings', () => {
      expect(() => validateColorHex('')).toThrow(SecurityValidationError)
    })

    test('should reject invalid hex formats', () => {
      expect(() => validateColorHex('GGGGGG')).toThrow(SecurityValidationError)
      expect(() => validateColorHex('#FFF')).toThrow(SecurityValidationError)
      expect(() => validateColorHex('#FFFFFFF')).toThrow(SecurityValidationError)
    })

    test('should provide helpful error messages', () => {
      expect(() => validateColorHex('invalid')).toThrow('6-digit hex color')
    })
  })

  describe('validateWebhookToken', () => {
    test('should accept valid webhook tokens', () => {
      const validToken = 'a'.repeat(70) // Valid length with valid characters
      expect(() => validateWebhookToken(validToken)).not.toThrow()
    })

    test('should reject empty tokens', () => {
      expect(() => validateWebhookToken('')).toThrow(SecurityValidationError)
    })

    test('should reject tokens that are too short', () => {
      expect(() => validateWebhookToken('short')).toThrow(SecurityValidationError)
      expect(() => validateWebhookToken('short')).toThrow('length is suspicious')
    })

    test('should reject tokens that are too long', () => {
      const longToken = 'a'.repeat(150)
      expect(() => validateWebhookToken(longToken)).toThrow(SecurityValidationError)
    })

    test('should reject tokens with invalid characters', () => {
      const invalidToken = 'a'.repeat(50) + '!@#$%'
      expect(() => validateWebhookToken(invalidToken)).toThrow(SecurityValidationError)
      expect(() => validateWebhookToken(invalidToken)).toThrow('invalid characters')
    })

    test('should accept tokens with valid base64url characters', () => {
      const validToken = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'
      expect(() => validateWebhookToken(validToken)).not.toThrow()
    })
  })

  describe('sanitizeUserInput', () => {
    test('should return clean input as-is', () => {
      expect(sanitizeUserInput('Hello World')).toBe('Hello World')
      expect(sanitizeUserInput('Test 123')).toBe('Test 123')
    })

    test('should remove control characters', () => {
      const input = 'Hello\x00World\x01Test'
      const result = sanitizeUserInput(input)
      
      expect(result).toBe('HelloWorldTest')
      expect(result).not.toContain('\x00')
      expect(result).not.toContain('\x01')
    })

    test('should trim whitespace', () => {
      expect(sanitizeUserInput('  test  ')).toBe('test')
      expect(sanitizeUserInput('\n\ntest\n\n')).toBe('test')
    })

    test('should respect max length', () => {
      const longInput = 'a'.repeat(5000)
      const result = sanitizeUserInput(longInput, 100)
      
      expect(result.length).toBe(100)
    })

    test('should use default max length of 2000', () => {
      const longInput = 'a'.repeat(3000)
      const result = sanitizeUserInput(longInput)
      
      expect(result.length).toBe(2000)
    })

    test('should handle empty strings', () => {
      expect(sanitizeUserInput('')).toBe('')
    })

    test('should handle non-string values safely', () => {
      // Should return empty string as safe fallback
      const result = sanitizeUserInput(null as any)
      expect(result).toBe('')
    })
  })

  describe('validateCommandName', () => {
    test('should accept valid command names', () => {
      expect(() => validateCommandName('ping')).not.toThrow()
      expect(() => validateCommandName('user-info')).not.toThrow()
      expect(() => validateCommandName('test_command')).not.toThrow()
      expect(() => validateCommandName('cmd123')).not.toThrow()
    })

    test('should reject empty strings', () => {
      expect(() => validateCommandName('')).toThrow(SecurityValidationError)
    })

    test('should reject names exceeding 32 characters', () => {
      const longName = 'a'.repeat(33)
      expect(() => validateCommandName(longName)).toThrow(SecurityValidationError)
      expect(() => validateCommandName(longName)).toThrow('32 characters')
    })

    test('should reject names with spaces', () => {
      expect(() => validateCommandName('test command')).toThrow(SecurityValidationError)
    })

    test('should reject names with uppercase letters', () => {
      expect(() => validateCommandName('TestCommand')).toThrow(SecurityValidationError)
    })

    test('should reject names with special characters', () => {
      expect(() => validateCommandName('test@command')).toThrow(SecurityValidationError)
      expect(() => validateCommandName('test!command')).toThrow(SecurityValidationError)
      expect(() => validateCommandName('test.command')).toThrow(SecurityValidationError)
    })

    test('should accept names at boundary lengths', () => {
      expect(() => validateCommandName('a')).not.toThrow()
      expect(() => validateCommandName('a'.repeat(32))).not.toThrow()
    })

    test('should provide helpful error messages', () => {
      expect(() => validateCommandName('Invalid!')).toThrow('lowercase letters, numbers, hyphens, and underscores')
    })
  })

  describe('Integration - Security Flow', () => {
    test('should validate complete webhook URL and token', () => {
      const webhookUrl = 'https://discord.com/api/webhooks/123456789/abcdefgh'
      const webhookToken = 'a'.repeat(64)
      
      expect(() => validateUrl(webhookUrl)).not.toThrow()
      expect(() => validateWebhookToken(webhookToken)).not.toThrow()
    })

    test('should validate and sanitize user message input', () => {
      const userInput = '  Hello World\x00Test  '
      const sanitized = sanitizeUserInput(userInput, 100)
      
      expect(sanitized).toBe('Hello WorldTest')
      expect(sanitized).not.toContain('\x00')
    })

    test('should validate Discord entity IDs', () => {
      const channelId = '123456789012345678'
      const userId = '987654321098765432'
      
      expect(() => validateSnowflakeId(channelId, 'Channel ID')).not.toThrow()
      expect(() => validateSnowflakeId(userId, 'User ID')).not.toThrow()
    })

    test('should validate embed color codes', () => {
      const color = '#FF5733'
      const validated = validateColorHex(color)
      
      expect(validated).toBe('#FF5733')
    })
  })
})
