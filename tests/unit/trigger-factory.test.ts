/**
 * Unit Tests for Trigger Factory and Registry
 *
 * Tests the consolidated trigger factory pattern including:
 * - Trigger registry configuration
 * - Generic trigger factory function
 * - Event filtering and transformation
 * - Error handling in factory
 */

import type { ITriggerFunctions } from 'n8n-workflow'
import { NodeOperationError, LoggerProxy } from 'n8n-workflow'

import { createDiscordTrigger } from '../../src/nodes/Discord/v2/triggers/triggerFactory'
import { TRIGGER_REGISTRY } from '../../src/nodes/Discord/v2/triggers/triggerRegistry'

// Mock Discord.js
jest.mock('discord.js', () => {
  const mockClient = {
    login: jest.fn().mockResolvedValue('token'),
    isReady: jest.fn().mockReturnValue(true),
    destroy: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn((event: string, callback: () => void) => {
      if (event === 'ready') callback()
    }),
    options: {
      intents: new Set([1, 512, 32768, 2, 256]), // Mock intents
    },
  }

  return {
    Client: jest.fn(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMembers: 2,
      GuildMessages: 512,
      MessageContent: 32768,
      GuildPresences: 256,
    },
    IntentsBitField: jest.fn().mockImplementation(() => ({
      has: jest.fn().mockReturnValue(true),
    })),
  }
})

// Mock n8n-workflow
jest.mock('n8n-workflow', () => ({
  ...jest.requireActual('n8n-workflow'),
  LoggerProxy: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Trigger Factory and Registry', () => {
  let mockContext: ITriggerFunctions

  beforeEach(() => {
    jest.clearAllMocks()

    mockContext = {
      getNode: jest.fn(() => ({
        id: 'test-node',
        name: 'Discord Trigger Test',
        type: '@kmcbride3/n8n-nodes-discord.discordTriggerV2',
        typeVersion: 2,
        position: [0, 0] as [number, number],
        parameters: {},
      })),
      getCredentials: jest.fn().mockResolvedValue({
        botToken: 'test.bot.token123456789',
      }),
      getNodeParameter: jest.fn((param: string) => {
        if (param === 'type') return 'message'
        if (param === 'guildId') return ''
        if (param === 'name') return 'testCommand'
        if (param === 'channelIds') return []
        return undefined
      }),
      emit: jest.fn(),
      emitError: jest.fn(),
      getWorkflow: jest.fn(() => ({
        id: 'test-workflow',
        name: 'Test Workflow',
        active: true,
      })),
    } as unknown as ITriggerFunctions
  })

  describe('Trigger Registry', () => {
    test('should define all 13 trigger types', () => {
      const expectedTriggers = [
        'message',
        'message_update',
        'thread',
        'thread_update',
        'command',
        'interaction',
        'userJoins',
        'userLeaves',
        'userUpdate',
        'presenceUpdate',
        'userNickUpdated',
        'userRoleAdded',
        'userRoleRemoved',
      ]

      expectedTriggers.forEach((trigger) => {
        expect(TRIGGER_REGISTRY).toHaveProperty(trigger)
        expect(TRIGGER_REGISTRY[trigger]).toBeDefined()
      })

      // Verify we have exactly 13 triggers
      expect(Object.keys(TRIGGER_REGISTRY)).toHaveLength(13)
    })

    test('each trigger should have required configuration', () => {
      Object.entries(TRIGGER_REGISTRY).forEach(([, config]) => {
        expect(config).toHaveProperty('triggerType')
        expect(config).toHaveProperty('discordEvent')
        expect(config).toHaveProperty('transformEvent')

        expect(typeof config.triggerType).toBe('string')
        expect(typeof config.discordEvent).toBe('string')
        expect(typeof config.transformEvent).toBe('function')

        // Filter is optional
        if (config.filter) {
          expect(typeof config.filter).toBe('function')
        }
      })
    })

    test('message triggers should use correct Discord events', () => {
      expect(TRIGGER_REGISTRY['message'].discordEvent).toBe('messageCreate')
      expect(TRIGGER_REGISTRY['message_update'].discordEvent).toBe('messageUpdate')
    })

    test('thread triggers should use correct Discord events', () => {
      expect(TRIGGER_REGISTRY['thread'].discordEvent).toBe('threadCreate')
      expect(TRIGGER_REGISTRY['thread_update'].discordEvent).toBe('threadUpdate')
    })

    test('command triggers should use correct Discord events', () => {
      expect(TRIGGER_REGISTRY['command'].discordEvent).toBe('interactionCreate')
      expect(TRIGGER_REGISTRY['interaction'].discordEvent).toBe('interactionCreate')
    })

    test('user triggers should use correct Discord events', () => {
      expect(TRIGGER_REGISTRY['userJoins'].discordEvent).toBe('guildMemberAdd')
      expect(TRIGGER_REGISTRY['userLeaves'].discordEvent).toBe('guildMemberRemove')
      expect(TRIGGER_REGISTRY['userUpdate'].discordEvent).toBe('guildMemberUpdate')
      expect(TRIGGER_REGISTRY['presenceUpdate'].discordEvent).toBe('presenceUpdate')
      expect(TRIGGER_REGISTRY['userNickUpdated'].discordEvent).toBe('guildMemberUpdate')
      expect(TRIGGER_REGISTRY['userRoleAdded'].discordEvent).toBe('guildMemberUpdate')
      expect(TRIGGER_REGISTRY['userRoleRemoved'].discordEvent).toBe('guildMemberUpdate')
    })
  })

  describe('Trigger Factory', () => {
    test('should create trigger for valid trigger type', async () => {
      const response = await createDiscordTrigger.call(mockContext, 'message')

      expect(response).toBeDefined()
      expect(response).toHaveProperty('closeFunction')
      expect(response).toHaveProperty('manualTriggerFunction')
    })

    test('should throw error for unknown trigger type', async () => {
      await expect(createDiscordTrigger.call(mockContext, 'invalidTrigger')).rejects.toThrow(NodeOperationError)
    })

    test('should retrieve credentials for trigger', async () => {
      await createDiscordTrigger.call(mockContext, 'message')

      expect(mockContext.getCredentials).toHaveBeenCalledWith('discordBotApi')
    })

    test('should setup cleanup function', async () => {
      // Get the mocked client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    //   skipcq: JS-0359
      const { Client } = require('discord.js')
      const mockClient = Client()

      const response = await createDiscordTrigger.call(mockContext, 'message')

      // Call the cleanup function
      expect(response.closeFunction).toBeDefined()
      if (response.closeFunction) {
        await response.closeFunction()
      }

      // Verify event listener was removed
      expect(mockClient.off).toHaveBeenCalledWith('messageCreate', expect.any(Function))
    })

    test('should handle different trigger types', async () => {
      const triggerTypes = ['message', 'thread', 'command', 'userJoins']

      for (const type of triggerTypes) {
        jest.clearAllMocks()
        const response = await createDiscordTrigger.call(mockContext, type)
        expect(response).toBeDefined()
      }
    })
  })

  describe('Event Filtering', () => {
    test('message trigger should filter bot messages', () => {
      const config = TRIGGER_REGISTRY['message']

      // Mock bot message
      const botMessage = {
        author: { bot: true },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shouldProcess = config.filter?.call(mockContext, botMessage as any)

      expect(shouldProcess).toBe(false)
    })

    test('message trigger should allow user messages', () => {
      const config = TRIGGER_REGISTRY['message']

      // Mock user message
      const userMessage = {
        author: { bot: false },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shouldProcess = config.filter?.call(mockContext, userMessage as any)

      expect(shouldProcess).toBe(true)
    })

    test('userJoins trigger should filter by guild when specified', () => {
      const config = TRIGGER_REGISTRY['userJoins']

      // Mock context with specific guild
      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'guildId') return 'guild123'
        return undefined
      })

      // Mock member from correct guild
      const correctGuildMember = {
        guild: { id: 'guild123' },
      }

      // Mock member from wrong guild
      const wrongGuildMember = {
        guild: { id: 'guild456' },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(config.filter?.call(mockContext, correctGuildMember as any)).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(config.filter?.call(mockContext, wrongGuildMember as any)).toBe(false)
    })
  })

  describe('Event Transformation', () => {
    test('message trigger should transform Discord message to workflow data', () => {
      const config = TRIGGER_REGISTRY['message']

      const discordMessage = {
        id: 'msg123',
        content: 'Hello world',
        author: {
          id: 'user123',
          username: 'testuser',
        },
        channelId: 'channel123',
        guildId: 'guild123',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = config.transformEvent.call(mockContext, discordMessage as any)

      expect(transformed).toEqual({
        messageId: 'msg123',
        content: 'Hello world',
        authorId: 'user123',
        authorUsername: 'testuser',
        channelId: 'channel123',
        guildId: 'guild123',
        timestamp: '2025-01-01T00:00:00.000Z',
      })
    })

    test('thread trigger should transform Discord thread to workflow data', () => {
      const config = TRIGGER_REGISTRY['thread']

      const discordThread = {
        id: 'thread123',
        name: 'Test Thread',
        type: 11,
        parentId: 'channel123',
        ownerId: 'user123',
        guild: { id: 'guild123' },
        createdAt: new Date('2025-01-01T00:00:00Z'),
        archived: false,
        locked: false,
        memberCount: 5,
        messageCount: 10,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = config.transformEvent.call(mockContext, discordThread as any)

      expect(transformed).toMatchObject({
        threadId: 'thread123',
        name: 'Test Thread',
        type: 11,
        parentId: 'channel123',
        ownerId: 'user123',
        guildId: 'guild123',
        archived: false,
        locked: false,
        memberCount: 5,
        messageCount: 10,
      })
    })
  })
  describe('Error Handling in Factory', () => {
    test('should handle transformation errors gracefully', async () => {
      // Get the mocked client from the module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    //   skipcq: JS-0359
      const { Client } = require('discord.js')
      const mockClient = Client()

      // Get the event handler that will be attached when creating the trigger
      let eventHandler: ((payload: unknown) => void) | undefined
      ;(mockClient.on as jest.Mock).mockImplementation((event: string, handler: (payload: unknown) => void) => {
        if (event === 'messageCreate') {
          eventHandler = handler
        }
      })

      // Create the trigger so the event listener is attached to the mocked client
      await createDiscordTrigger.call(mockContext, 'message')

      // Simulate event with data that causes transformation error
      const badMessage = null

      // Call the event handler
      expect(() => eventHandler?.(badMessage)).not.toThrow()

      // Error should be logged but not thrown
      expect(LoggerProxy.error).toHaveBeenCalled()
    })
  })

  describe('Factory Integration', () => {
    test('should emit transformed data to n8n workflow', async () => {
      // Get the mocked client from the module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    //   skipcq: JS-0359
      const { Client } = require('discord.js')
      const mockClient = Client()

      // Capture the event handler
      let eventHandler: ((payload: unknown) => void) | undefined
      ;(mockClient.on as jest.Mock).mockImplementation((event: string, handler: (payload: unknown) => void) => {
        if (event === 'messageCreate') {
          eventHandler = handler
        }
      })

      await createDiscordTrigger.call(mockContext, 'message')
      const mockMessage = {
        author: { bot: false, id: 'user123', username: 'testuser' },
        id: 'msg123',
        content: 'Test message',
        channelId: 'channel123',
        guildId: 'guild123',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      }

      // Call the event handler
      eventHandler?.(mockMessage)

      // Verify emit was called with transformed data
      expect(mockContext.emit).toHaveBeenCalledWith([
        [
          {
            json: expect.objectContaining({
              messageId: 'msg123',
              content: 'Test message',
              authorId: 'user123',
              authorUsername: 'testuser',
            }),
          },
        ],
      ])
    })
  })
})
