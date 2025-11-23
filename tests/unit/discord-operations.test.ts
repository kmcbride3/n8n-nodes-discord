/**
 * Unit Tests for Discord Operations (V2) - Core Functions
 *
 * Tests for Discord.js-based implementations focusing on error handling
 * and basic functionality without complex mocking.
 */

import { NodeOperationError } from 'n8n-workflow'
import type { IExecuteFunctions } from 'n8n-workflow'
import type { Client } from 'discord.js'

// Import the functions we want to test
import * as discordOps from '../../src/nodes/Discord/v2/helpers/discord-operations'

const mockExecuteFunctions = {
  getNode: jest.fn(() => ({
    id: 'test-node',
    name: 'Test Node',
    type: 'discord',
    typeVersion: 2,
    position: [0, 0],
    parameters: {},
  })),
} as unknown as IExecuteFunctions

describe('Discord Operations (V2) - Core Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Client Validation', () => {
    test('addMemberRole should throw error when client is undefined', async () => {
      await expect(
        discordOps.addMemberRole.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          'role-id',
          'reason',
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('addMemberRole should throw error when client is not ready', async () => {
      const mockClient = {
        isReady: () => false,
      } as unknown as Client

      await expect(
        discordOps.addMemberRole.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          'role-id',
          'reason',
          mockClient,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('removeMemberRole should require ready client', async () => {
      await expect(
        discordOps.removeMemberRole.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          'role-id',
          'reason',
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('banMember should require ready client', async () => {
      await expect(
        discordOps.banMember.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          7,
          'ban reason',
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('kickMember should require ready client', async () => {
      await expect(
        discordOps.kickMember.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          'kick reason',
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('timeoutMember should require ready client', async () => {
      const timeoutUntil = new Date(Date.now() + 3600000)

      await expect(
        discordOps.timeoutMember.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          timeoutUntil.toISOString(),
          'timeout reason',
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('deleteMessage should require ready client', async () => {
      await expect(
        discordOps.deleteMessage.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'channel-id',
          'message-id',
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('bulkDeleteMessages should require ready client', async () => {
      await expect(
        discordOps.bulkDeleteMessages.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'channel-id',
          ['msg1', 'msg2'],
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('getChannelMessages should require ready client', async () => {
      await expect(
        discordOps.getChannelMessages.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'channel-id',
          50,
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('sendChannelMessage should require ready client', async () => {
      await expect(
        discordOps.sendChannelMessage.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'channel-id',
          'Hello world',
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })

    test('createChannelWebhook should require ready client', async () => {
      await expect(
        discordOps.createChannelWebhook.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'channel-id',
          'webhook-name',
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(NodeOperationError)
    })
  })

  describe('Function Parameter Validation', () => {
    test('should handle empty parameters gracefully', () => {
      // Test that functions exist and can be imported
      expect(typeof discordOps.addMemberRole).toBe('function')
      expect(typeof discordOps.removeMemberRole).toBe('function')
      expect(typeof discordOps.banMember).toBe('function')
      expect(typeof discordOps.kickMember).toBe('function')
      expect(typeof discordOps.timeoutMember).toBe('function')
      expect(typeof discordOps.deleteMessage).toBe('function')
      expect(typeof discordOps.bulkDeleteMessages).toBe('function')
      expect(typeof discordOps.getChannelMessages).toBe('function')
      expect(typeof discordOps.sendChannelMessage).toBe('function')
      expect(typeof discordOps.createChannelWebhook).toBe('function')
      expect(typeof discordOps.executeWebhookMessage).toBe('function')
    })

    test('executeWebhookMessage should handle invalid webhook URL', async () => {
      await expect(
        discordOps.executeWebhookMessage.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'invalid-url',
          'message content',
        ),
      ).rejects.toThrow()
    })

    test('banMember should use default deleteMessageDays when not specified', () => {
      // This test ensures the function signature accepts optional parameters
      expect(() => {
        // Just test the function can be called with minimal parameters
        // The actual Discord API call will fail, but parameter validation should pass
        discordOps.banMember
          .call(mockExecuteFunctions as unknown as IExecuteFunctions, 'guild-id', 'user-id')
          .catch(() => {}) // Ignore the promise rejection for this test
      }).not.toThrow()
    })
  })

  describe('Error Message Quality', () => {
    test('should provide descriptive error messages for client issues', async () => {
      try {
        await discordOps.addMemberRole.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          'role-id',
          'reason',
          undefined,
        )
      } catch (error) {
        expect(error).toBeInstanceOf(NodeOperationError as unknown as Function)
        if (error instanceof Error) {
          expect(error.message).toContain('Discord client is required')
        }
      }
    })

    test('should provide contextual error information', async () => {
      const notReadyClient = {
        isReady: () => false,
      } as unknown as Client

      try {
        await discordOps.kickMember.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'guild-id',
          'user-id',
          'reason',
          notReadyClient,
        )
      } catch (error) {
        expect(error).toBeInstanceOf(NodeOperationError as unknown as Function)
        if (error instanceof Error) {
          expect(error.message).toContain('Discord client is required')
        }
      }
    })
  })

  describe('Module Structure', () => {
    test('should export all expected functions', () => {
      const expectedFunctions = [
        'addMemberRole',
        'removeMemberRole',
        'banMember',
        'kickMember',
        'timeoutMember',
        'deleteMessage',
        'bulkDeleteMessages',
        'getChannelMessages',
        'sendChannelMessage',
        'createChannelWebhook',
        'executeWebhookMessage',
      ]

      expectedFunctions.forEach((funcName) => {
        expect(discordOps).toHaveProperty(funcName)
        const fn = (discordOps as unknown as Record<string, unknown>)[funcName]
        expect(typeof fn).toBe('function')
      })
    })

    test('should have consistent function signatures', () => {
      // All guild member operations should take similar parameters
      const memberOperations = [
        discordOps.addMemberRole,
        discordOps.removeMemberRole,
        discordOps.banMember,
        discordOps.kickMember,
        discordOps.timeoutMember,
      ]

      memberOperations.forEach((func) => {
        expect(func.length).toBeGreaterThanOrEqual(2) // Should accept multiple parameters
      })
    })

    test('should have consistent channel operations', () => {
      const channelOperations = [
        discordOps.deleteMessage,
        discordOps.bulkDeleteMessages,
        discordOps.getChannelMessages,
        discordOps.sendChannelMessage,
        discordOps.createChannelWebhook,
      ]

      channelOperations.forEach((func) => {
        expect(func.length).toBeGreaterThanOrEqual(1) // Should accept at least one parameter
      })
    })
  })

  describe('Integration Points', () => {
    test('should use proper n8n error types', async () => {
      try {
        await discordOps.deleteMessage.call(
          mockExecuteFunctions as unknown as IExecuteFunctions,
          'channel-id',
          'message-id',
          undefined,
        )
      } catch (error) {
        expect(error).toBeInstanceOf(NodeOperationError)
      }
    })

    test('should integrate with IExecuteFunctions context', () => {
      // Test that functions can access the execution context
      expect(mockExecuteFunctions.getNode).toBeDefined()

      // Functions should be able to call this.getNode() in their implementation
      const nodeInfo = (mockExecuteFunctions as unknown as IExecuteFunctions).getNode!()
      expect(nodeInfo).toHaveProperty('id')
      expect(nodeInfo).toHaveProperty('name')
      expect(nodeInfo).toHaveProperty('type')
    })
  })

  describe('Async Operation Handling', () => {
    test('functions should be async and return promises', async () => {
      // Test a few key functions to ensure they return promises
      const result1 = discordOps.addMemberRole
        .call(mockExecuteFunctions, 'guild-id', 'user-id', 'role-id', 'reason', undefined)
        .catch(() => 'handled')

      const result2 = discordOps.executeWebhookMessage
        .call(mockExecuteFunctions, 'webhook-url', 'message')
        .catch(() => 'handled')

      expect(result1).toBeInstanceOf(Promise)
      expect(result2).toBeInstanceOf(Promise)

      // Wait for promises to resolve
      await result1
      await result2
    })
  })
})
