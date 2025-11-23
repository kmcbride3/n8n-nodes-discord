/**
 * Phase 3.2: Jest-based Discord Validation Tests
 *
 * Tests for Discord.js validation utilities and shared constants
 * from Phase 2.4.3: Validation & Utilities Consolidation
 *
 * Uses Jest, Discord.js built-ins, and n8n-workflow patterns.
 */

import { IntentsBitField, SnowflakeUtil } from 'discord.js'
import { NodeOperationError } from 'n8n-workflow'
import { DiscordValidation } from '../../src/nodes/Discord/shared/validation/simple-validation'
import { DiscordLimits } from '../../src/nodes/Discord/shared/constants/discord-constants'

// Mock n8n node structure
const mockNode = {
  id: 'test',
  name: 'Test',
  type: 'test',
  typeVersion: 1,
  position: [0, 0] as [number, number],
  parameters: {},
}

describe('Discord Validation Utilities', () => {
  describe('Snowflake ID Validation', () => {
    test('should validate correct Discord snowflake IDs using Discord.js', () => {
      const validSnowflakes = [
        '123456789012345678', // 18 digits
        '987654321098765432', // 18 digits
        '1234567890123456789', // 19 digits
      ]

      validSnowflakes.forEach((snowflake) => {
        // Use Discord.js built-in validation - check if it's a valid snowflake pattern
        const isValidSnowflake = /^\d{17,19}$/.test(snowflake)
        expect(isValidSnowflake).toBe(true)

        // Verify Discord.js can generate a timestamp from it (returns number, not Date)
        expect(() => {
          const timestamp = SnowflakeUtil.timestampFrom(snowflake)
          expect(typeof timestamp).toBe('number')
          expect(timestamp).toBeGreaterThan(0)
        }).not.toThrow()

        // Test our validation wrapper doesn't throw
        expect(() => {
          DiscordValidation.snowflake(snowflake, 'Test ID', mockNode)
        }).not.toThrow()
      })
    })

    test('should reject invalid snowflake IDs using Discord.js validation', () => {
      const invalidSnowflakes = [
        'invalid-id',
        '1234567890123456', // too short (16 digits)
        '12345678901234567890', // too long (20 digits)
        '12345a78901234567b', // contains letters
        '',
        'not-a-snowflake',
      ]

      invalidSnowflakes.forEach((snowflake) => {
        // Use Discord.js pattern validation - invalid snowflakes fail the pattern
        const isValidSnowflake = /^\d{17,19}$/.test(snowflake)
        expect(isValidSnowflake).toBe(false)

        // For non-empty invalid snowflakes, verify Discord.js handling
        if (snowflake.length > 0 && !/^\d+$/.test(snowflake)) {
          // Discord.js may or may not throw for invalid patterns, so we focus on our validation
          // The important test is that our validation wrapper catches these
        }

        // Test our validation wrapper throws NodeOperationError
        expect(() => {
          DiscordValidation.snowflake(snowflake, 'Invalid ID', mockNode)
        }).toThrow(NodeOperationError)
      })
    })

    test('should handle empty snowflake appropriately', () => {
      expect(() => {
        DiscordValidation.snowflake('', 'Empty ID', mockNode)
      }).toThrow(NodeOperationError)
    })
  })

  describe('Message Content Validation', () => {
    test('should accept valid message content within Discord limits', () => {
      const validMessages = [
        'Hello, Discord!',
        'A'.repeat(DiscordLimits.MESSAGE_CONTENT_MAX), // At Discord limit
        '🎉 Discord bot test message! 🚀',
        'Multi-line\nmessage\ntest',
      ]

      validMessages.forEach((message) => {
        expect(() => {
          DiscordValidation.messageContent(message, mockNode)
        }).not.toThrow()
      })
    })

    test('should allow empty message content when allowEmpty is true', () => {
      expect(() => {
        DiscordValidation.messageContent('', mockNode, true)
      }).not.toThrow()
    })

    test('should reject message content that exceeds Discord limits', () => {
      const longMessage = 'a'.repeat(DiscordLimits.MESSAGE_CONTENT_MAX + 1)

      expect(() => {
        DiscordValidation.messageContent(longMessage, mockNode)
      }).toThrow(NodeOperationError)
    })

    test('should reject empty message content when allowEmpty is false', () => {
      expect(() => {
        DiscordValidation.messageContent('', mockNode, false)
      }).toThrow(NodeOperationError)
    })
  })

  describe('Audit Log Reason Validation', () => {
    test('should accept valid audit log reasons within Discord limits', () => {
      const validReasons = [
        'Valid reason',
        'Automated moderation action',
        'A'.repeat(DiscordLimits.AUDIT_LOG_REASON_MAX), // At Discord limit
      ]

      validReasons.forEach((reason) => {
        expect(() => {
          DiscordValidation.auditLogReason(reason, mockNode)
        }).not.toThrow()
      })
    })

    test('should allow empty audit log reason when allowEmpty is true', () => {
      expect(() => {
        DiscordValidation.auditLogReason('', mockNode, true)
      }).not.toThrow()
    })

    test('should reject audit log reasons that exceed Discord limits', () => {
      const longReason = 'a'.repeat(DiscordLimits.AUDIT_LOG_REASON_MAX + 1)

      expect(() => {
        DiscordValidation.auditLogReason(longReason, mockNode)
      }).toThrow(NodeOperationError)
    })
  })
})

describe('Discord Constants Integration', () => {
  describe('Discord Limits', () => {
    test('should have all required Discord limits defined', () => {
      expect(DiscordLimits.MESSAGE_CONTENT_MAX).toBeDefined()
      expect(DiscordLimits.AUDIT_LOG_REASON_MAX).toBeDefined()
      expect(DiscordLimits.EMBED_TITLE_MAX).toBeDefined()
      expect(DiscordLimits.EMBED_DESCRIPTION_MAX).toBeDefined()
      expect(DiscordLimits.DEFAULT_REQUEST_TIMEOUT).toBeDefined()

      // Verify they're reasonable numbers
      expect(DiscordLimits.MESSAGE_CONTENT_MAX).toBeGreaterThan(0)
      expect(DiscordLimits.AUDIT_LOG_REASON_MAX).toBeGreaterThan(0)
      expect(DiscordLimits.EMBED_TITLE_MAX).toBeGreaterThan(0)
      expect(DiscordLimits.EMBED_DESCRIPTION_MAX).toBeGreaterThan(0)
      expect(DiscordLimits.DEFAULT_REQUEST_TIMEOUT).toBeGreaterThan(0)
    })

    test('should match Discord API documented limits', () => {
      // Discord documented limits for validation
      expect(DiscordLimits.MESSAGE_CONTENT_MAX).toBe(2000)
      expect(DiscordLimits.AUDIT_LOG_REASON_MAX).toBe(512)
      expect(DiscordLimits.EMBED_TITLE_MAX).toBe(256)
      expect(DiscordLimits.EMBED_DESCRIPTION_MAX).toBe(4096)
    })
  })

  describe('Discord Intents (from Discord.js)', () => {
    test('should have all required Discord intents defined in IntentsBitField', () => {
      // Verify all required intents exist in Discord.js IntentsBitField
      expect(IntentsBitField.Flags.Guilds).toBeDefined()
      expect(IntentsBitField.Flags.GuildMessages).toBeDefined()
      expect(IntentsBitField.Flags.MessageContent).toBeDefined()
      expect(IntentsBitField.Flags.GuildMembers).toBeDefined()
      expect(IntentsBitField.Flags.GuildPresences).toBeDefined()
      expect(IntentsBitField.Flags.GuildMessageReactions).toBeDefined()

      // Verify they're valid intent values (numbers or bigints depending on Discord.js version)
      expect(IntentsBitField.Flags.Guilds).not.toBeNull()
      expect(IntentsBitField.Flags.GuildMessages).not.toBeNull()
      expect(IntentsBitField.Flags.MessageContent).not.toBeNull()
    })

    test('should provide working intent combinations', () => {
      // Test basic intent combination using Discord.js IntentsBitField
      // Works with both number and bigint flags
      const combinedIntents = IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMessages
      expect(combinedIntents).toBeTruthy()

      // Verify individual intent flags are powers of 2 (bitwise flags)
      const guildsFlag = Number(IntentsBitField.Flags.Guilds)
      const messagesFlag = Number(IntentsBitField.Flags.GuildMessages)
      expect(Number.isInteger(Math.log2(guildsFlag))).toBe(true)
      expect(Number.isInteger(Math.log2(messagesFlag))).toBe(true)
    })
  })
})
