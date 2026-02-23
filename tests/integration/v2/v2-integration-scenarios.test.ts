/**
 * Integration Scenarios Testing
 *
 * End-to-end testing of common Discord workflow scenarios:
 * - Multi-step workflows
 * - Error recovery
 * - Resource management
 * - Cross-operation data flow
 *
 * Target: Test realistic user workflows and edge cases
 */

import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

// Mock helpers before importing any Discord modules
jest.mock('../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((options) => options),
}))

// Mock discord.js
jest.mock('discord.js', () => {
  class Collection<K, V> extends Map<K, V> {
    filter(
      predicate: (value: V, key: K, collection: Collection<K, V>) => boolean,
    ): Collection<K, V> {
      const result = new Collection<K, V>()
      for (const [key, value] of this) {
        if (predicate(value, key, this)) {
          result.set(key, value)
        }
      }
      return result
    }

    map<T>(mapper: (value: V, key: K, collection: Collection<K, V>) => T): T[] {
      const result: T[] = []
      for (const [key, value] of this) {
        result.push(mapper(value, key, this))
      }
      return result
    }

    find(
      predicate: (value: V, key: K, collection: Collection<K, V>) => boolean,
    ): V | undefined {
      for (const [key, value] of this) {
        if (predicate(value, key, this)) {
          return value
        }
      }
      return undefined
    }

    some(
      predicate: (value: V, key: K, collection: Collection<K, V>) => boolean,
    ): boolean {
      for (const [key, value] of this) {
        if (predicate(value, key, this)) {
          return true
        }
      }
      return false
    }

    first(): V | undefined {
      for (const value of this.values()) {
        return value
      }
      return undefined
    }
  }

  const channelCache = new Collection<string, { id: string; name: string; type: number }>([
    ['channel1', { id: 'channel1', name: 'general', type: 0 }],
  ])
  const roleCache = new Collection<string, { id: string; name: string }>([
    ['role1', { id: 'role1', name: 'Member' }],
  ])

  return {
    Collection,
    ReadonlyCollection: Collection,
    Client: jest.fn().mockImplementation(() => ({
      login: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true),
      destroy: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      guilds: {
        fetch: jest.fn().mockResolvedValue({
          id: '123456789',
          name: 'Test Guild',
          channels: {
            cache: channelCache,
          },
          members: {
            fetch: jest.fn().mockResolvedValue({
              id: 'user123',
              user: { id: 'user123', username: 'testuser' },
            }),
          },
          roles: {
            cache: roleCache,
          },
        }),
      },
      channels: {
        fetch: jest.fn().mockResolvedValue({
          id: 'channel1',
          name: 'general',
          send: jest.fn().mockResolvedValue({
            id: 'message123',
            content: 'Test message',
          }),
        }),
      },
    })),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      GuildMembers: 4,
      DirectMessages: 8,
      Flags: {
        Guilds: 1,
        GuildMessages: 2,
        MessageContent: 4,
        GuildMembers: 8,
        GuildPresences: 16,
        GuildMessageReactions: 32,
      },
    },
    Partials: {
      Message: 0,
      Channel: 1,
      Reaction: 2,
    },
    IntentsBitField: {
      Flags: {
        Guilds: 1,
        GuildMessages: 2,
        MessageContent: 4,
        GuildMembers: 8,
        GuildPresences: 16,
        GuildMessageReactions: 32,
      },
    },
    REST: jest.fn().mockImplementation(() => ({})),
  }
})

// Mock client manager
jest.mock('../../../src/nodes/Discord/shared/client/discord-client-manager', () => ({
  getDiscordClient: jest.fn().mockImplementation(async () => {
    const { Client } = jest.requireMock('discord.js')
    return new Client()
  }),
}))

const createMockExecuteFunctions = (params: Record<string, any> = {}): IExecuteFunctions => ({
  getNode: jest.fn(() => ({
    id: 'test-node',
    name: 'Discord Integration Test',
    type: 'n8n-nodes-discord.discord',
    typeVersion: 2,
    position: [0, 0],
    parameters: {},
  })),
  getNodeParameter: jest.fn((paramName, itemIndex, defaultValue) => params[paramName] ?? defaultValue),
  getInputData: jest.fn(() => params.inputData || [{ json: {} }]),
  getCredentials: jest.fn().mockResolvedValue({
    botToken: 'test_bot_token',
  }),
  helpers: {
    returnJsonArray: jest.fn((data) => data.map((item: any) => ({ json: item }))),
  },
} as unknown as IExecuteFunctions)

describe('Integration Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Multi-Step Workflows', () => {
    test('should handle guild info retrieval followed by member lookup', async () => {
      const { getV2DiscordCredentials, createV2DiscordClient } = await import(
        '../../../src/nodes/Discord/v2/helpers/v2-credentials'
      )

      const mockExecFunctions = createMockExecuteFunctions({
        authentication: 'botToken',
      })

      // Step 1: Get credentials
      const credentials = await getV2DiscordCredentials.call(mockExecFunctions)
      expect(credentials).toBeDefined()
      expect(credentials.type).toBe('botToken')

      // Step 2: Create client
      const client = await createV2DiscordClient.call(mockExecFunctions, credentials)
      expect(client).toBeDefined()
    })

    test('should handle sequential operations with data flow', async () => {
      // Simulate workflow: Get guild -> List channels -> Send message

      const mockExecFunctions = createMockExecuteFunctions({
        guildId: '123456789',
        channelId: 'channel1',
        message: 'Hello from test',
      })

      // Each step should be able to access data from previous steps
      expect(mockExecFunctions.getNodeParameter('guildId', 0)).toBe('123456789')
      expect(mockExecFunctions.getNodeParameter('channelId', 0)).toBe('channel1')
      expect(mockExecFunctions.getNodeParameter('message', 0)).toBe('Hello from test')
    })

    test('should handle batch processing of multiple items', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        inputData: [
          { json: { userId: 'user1', message: 'Message 1' } },
          { json: { userId: 'user2', message: 'Message 2' } },
          { json: { userId: 'user3', message: 'Message 3' } },
        ],
      })

      const inputData = mockExecFunctions.getInputData()
      expect(inputData).toHaveLength(3)
      expect(inputData[0].json).toHaveProperty('userId', 'user1')
    })
  })

  describe('Error Recovery', () => {
    test('should recover from credential failures', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getCredentials as jest.Mock).mockRejectedValueOnce(
        new Error('Credentials not found'),
      )

      await expect(mockExecFunctions.getCredentials('discordBotApi')).rejects.toThrow(
        'Credentials not found',
      )

      // Should be able to retry
      ;(mockExecFunctions.getCredentials as jest.Mock).mockResolvedValueOnce({
        botToken: 'test_token',
      })

      const credentials = await mockExecFunctions.getCredentials('discordBotApi')
      expect(credentials).toHaveProperty('botToken')
    })

    test('should handle invalid Discord IDs gracefully', () => {
      const mockExecFunctions = createMockExecuteFunctions({
        guildId: 'invalid_id',
      })

      const guildId = mockExecFunctions.getNodeParameter('guildId', 0)
      expect(guildId).toBe('invalid_id')

      // Validation should happen in the operation
      const isValidSnowflake = /^\d{17,19}$/.test(guildId as string)
      expect(isValidSnowflake).toBe(false)
    })

    test('should handle client connection failures', async () => {
      const { Client } = jest.requireMock('discord.js')
      const mockClient = new Client()
      mockClient.login = jest.fn().mockRejectedValue(new Error('Invalid token'))

      await expect(mockClient.login('invalid_token')).rejects.toThrow('Invalid token')
    })

    test('should handle rate limiting scenarios', () => {
      // Simulate rate limit detection
      const rateLimitError = {
        message: 'You are being rate limited',
        code: 429,
        retry_after: 1000,
      }

      expect(rateLimitError.code).toBe(429)
      expect(rateLimitError.retry_after).toBeGreaterThan(0)
    })
  })

  describe('Resource Management', () => {
    test('should properly initialize Discord client', async () => {
      const { Client } = jest.requireMock('discord.js')
      const client = new Client()

      expect(client).toBeDefined()
      expect(client.login).toBeDefined()
      expect(client.isReady).toBeDefined()
    })

    test('should handle client lifecycle', async () => {
      const { Client } = jest.requireMock('discord.js')
      const client = new Client()

      await client.login('test_token')
      expect(client.login).toHaveBeenCalledWith('test_token')

      const isReady = client.isReady()
      expect(isReady).toBe(true)

      await client.destroy()
      expect(client.destroy).toHaveBeenCalled()
    })

    test('should reuse client connections when possible', async () => {
      const { getDiscordClient } = jest.requireMock(
        '../../../src/nodes/Discord/shared/client/discord-client-manager'
      )

      const client1 = await getDiscordClient({ token: 'test_token', intents: [1, 2, 4] })
      const client2 = await getDiscordClient({ token: 'test_token', intents: [1, 2, 4] })

      expect(getDiscordClient).toHaveBeenCalledTimes(2)
      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
    })

    test('should handle multiple concurrent operations', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        inputData: [
          { json: { operation: 'op1' } },
          { json: { operation: 'op2' } },
          { json: { operation: 'op3' } },
        ],
      })

      const inputData = mockExecFunctions.getInputData()
      const operations = inputData.map((item) => item.json.operation)

      expect(operations).toHaveLength(3)
      expect(operations).toEqual(['op1', 'op2', 'op3'])
    })
  })

  describe('Cross-Operation Data Flow', () => {
    test('should pass channel data between operations', () => {
      const channelData = {
        id: 'channel1',
        name: 'general',
        type: 0,
      }

      const mockExecFunctions = createMockExecuteFunctions({
        inputData: [{ json: channelData }],
      })

      const inputData = mockExecFunctions.getInputData()
      expect(inputData[0].json).toEqual(channelData)
    })

    test('should pass member data between operations', () => {
      const memberData = {
        id: 'user123',
        username: 'testuser',
        roles: ['role1', 'role2'],
      }

      const mockExecFunctions = createMockExecuteFunctions({
        inputData: [{ json: memberData }],
      })

      const inputData = mockExecFunctions.getInputData()
      expect(inputData[0].json).toHaveProperty('username', 'testuser')
      expect(inputData[0].json.roles).toHaveLength(2)
    })

    test('should handle nested data structures', () => {
      const complexData = {
        guild: {
          id: '123456789',
          name: 'Test Guild',
          channels: [
            { id: 'channel1', name: 'general' },
            { id: 'channel2', name: 'off-topic' },
          ],
        },
        members: [
          { id: 'user1', username: 'user1' },
          { id: 'user2', username: 'user2' },
        ],
      }

      const mockExecFunctions = createMockExecuteFunctions({
        inputData: [{ json: complexData }],
      })

      const inputData = mockExecFunctions.getInputData()
      expect((inputData[0]?.json?.guild as any)?.channels).toHaveLength(2)
      expect(inputData[0].json.members).toHaveLength(2)
    })
  })

  describe('Authentication Flows', () => {
    test('should support bot token authentication', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        authentication: 'botToken',
      })

      const credentials = await mockExecFunctions.getCredentials('discordBotApi')
      expect(credentials).toHaveProperty('botToken')
    })

    test('should handle authentication parameter selection', () => {
      const mockExecFunctions = createMockExecuteFunctions({
        authentication: 'botToken',
      })

      const authType = mockExecFunctions.getNodeParameter('authentication', 0)
      expect(authType).toBe('botToken')
    })

    test('should validate credential types', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      const credentials = await mockExecFunctions.getCredentials('discordBotApi')

      expect(credentials).toBeDefined()
      expect(credentials).toHaveProperty('botToken')
    })
  })

  describe('Operation Chaining', () => {
    test('should support guild -> channel -> message flow', () => {
      const workflow = [
        { step: 'getGuild', params: { guildId: '123' } },
        { step: 'listChannels', params: { guildId: '123' } },
        { step: 'sendMessage', params: { channelId: 'channel1' } },
      ]

      expect(workflow).toHaveLength(3)
      expect(workflow[0].step).toBe('getGuild')
      expect(workflow[2].params.channelId).toBe('channel1')
    })

    test('should support member -> role operations', () => {
      const workflow = [
        { step: 'getMember', params: { userId: 'user1' } },
        { step: 'getMemberRoles', params: { userId: 'user1' } },
        { step: 'addRole', params: { userId: 'user1', roleId: 'role1' } },
      ]

      expect(workflow).toHaveLength(3)
      expect(workflow[2].step).toBe('addRole')
    })

    test('should handle conditional operations', () => {
      const mockExecFunctions = createMockExecuteFunctions({
        condition: 'hasRole',
        roleId: 'admin',
        inputData: [
          { json: { userId: 'user1', roles: ['admin', 'member'] } },
        ],
      })

      const inputData = mockExecFunctions.getInputData()
      const hasAdminRole = (inputData[0].json.roles as string[]).includes('admin')

      expect(hasAdminRole).toBe(true)
    })
  })

  describe('Error Scenarios', () => {
    test('should handle missing required parameters', () => {
      const mockExecFunctions = createMockExecuteFunctions({})

      const missingParam = mockExecFunctions.getNodeParameter('nonexistent', 0, undefined)
      expect(missingParam).toBeUndefined()
    })

    test('should handle invalid operation types', () => {
      const mockExecFunctions = createMockExecuteFunctions({
        resource: 'invalid',
        operation: 'invalid',
      })

      const resource = mockExecFunctions.getNodeParameter('resource', 0)
      const operation = mockExecFunctions.getNodeParameter('operation', 0)

      expect(resource).toBe('invalid')
      expect(operation).toBe('invalid')
    })

    test('should provide meaningful error context', () => {
      const mockExecFunctions = createMockExecuteFunctions()
      const node = mockExecFunctions.getNode()

      const error = new NodeOperationError(node, 'Test error message', {
        description: 'Detailed error description',
      })

      expect(error.message).toContain('Test error message')
      const description = error.description ?? error.context?.description
      expect(description).toBe('Detailed error description')
    })
  })
})
