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
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        if (param === 'messageFilters') return { contentMatchType: 'any', hasAttachments: 'any' }
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
        'directMessage',
        'thread',
        'thread_update',
        'command',
        'interaction',
        'reactionAdd',
        'reactionRemove',
        'roleCreate',
        'roleDelete',
        'roleUpdate',
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

      // Verify we have exactly 19 triggers (13 original + 6 new: directMessage, reactionAdd, reactionRemove, roleCreate, roleDelete, roleUpdate)
      expect(Object.keys(TRIGGER_REGISTRY)).toHaveLength(19)
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
    test('message trigger should filter bot messages by default (ignoreAllBots)', () => {
      const config = TRIGGER_REGISTRY['message']

      // Mock bot message
      const botMessage = {
        author: { bot: true, id: 'otherbot456' },
        client: { user: { id: 'bot123' } },
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
        client: { user: { id: 'bot123' } },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shouldProcess = config.filter?.call(mockContext, userMessage as any)

      expect(shouldProcess).toBe(true)
    })

    test('message trigger with ignoreSelf should allow other bots', () => {
      const config = TRIGGER_REGISTRY['message']

      // Update mock to use ignoreSelf behavior
      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'type') return 'message'
        if (param === 'botFilters') return { botBehavior: 'ignoreSelf' }
        return undefined
      })

      // Mock message from another bot
      const otherBotMessage = {
        author: { bot: true, id: 'otherbot456' },
        client: { user: { id: 'bot123' } },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shouldProcess = config.filter?.call(mockContext, otherBotMessage as any)

      expect(shouldProcess).toBe(true)
    })

    test('message trigger with ignoreSelf should filter own messages', () => {
      const config = TRIGGER_REGISTRY['message']

      // Update mock to use ignoreSelf behavior
      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'type') return 'message'
        if (param === 'botFilters') return { botBehavior: 'ignoreSelf' }
        return undefined
      })

      // Mock message from self
      const selfMessage = {
        author: { bot: true, id: 'bot123' },
        client: { user: { id: 'bot123' } },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shouldProcess = config.filter?.call(mockContext, selfMessage as any)

      expect(shouldProcess).toBe(false)
    })

    test('message trigger with ignoreOthers should only allow self and users', () => {
      const config = TRIGGER_REGISTRY['message']

      // Update mock to use ignoreOthers behavior
      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'type') return 'message'
        if (param === 'botFilters') return { botBehavior: 'ignoreOthers' }
        if (param === 'messageFilters') return { contentMatchType: 'any', hasAttachments: 'any' }
        return undefined
      })

      // Mock message from self
      const selfMessage = {
        author: { bot: true, id: 'bot123' },
        client: { user: { id: 'bot123' } },
      }

      // Mock message from another bot
      const otherBotMessage = {
        author: { bot: true, id: 'otherbot456' },
        client: { user: { id: 'bot123' } },
      }

      // Mock message from user
      const userMessage = {
        author: { bot: false, id: 'user789' },
        client: { user: { id: 'bot123' } },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(config.filter?.call(mockContext, selfMessage as any)).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(config.filter?.call(mockContext, otherBotMessage as any)).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(config.filter?.call(mockContext, userMessage as any)).toBe(true)
    })

    test('message trigger with allowAllBots should allow all bots', () => {
      const config = TRIGGER_REGISTRY['message']

      // Update mock to use allowAllBots behavior
      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'type') return 'message'
        if (param === 'botFilters') return { botBehavior: 'allowAllBots' }
        return undefined
      })

      // Mock message from another bot
      const botMessage = {
        author: { bot: true, id: 'otherbot456' },
        client: { user: { id: 'bot123' } },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shouldProcess = config.filter?.call(mockContext, botMessage as any)

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

  describe('Content Pattern Matching', () => {
    const createMockMessage = (content: string, mentions: any = {}) => ({
      author: { bot: false },
      client: { user: { id: 'bot123' } },
      content,
      attachments: { size: 0 },
      mentions: {
        users: new Map(mentions.users || []),
        roles: mentions.roles || [],
        channels: new Map(mentions.channels || []),
        has: jest.fn((user: any) => mentions.users?.some(([id]: [string]) => id === user?.id) || false),
      },
    })

    test('message trigger with contains match should filter correctly', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'contains', contentMatchPattern: 'hello' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('Hello world!')
      const nonMatchingMessage = createMockMessage('Goodbye world!')

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with exact match should be case-insensitive by default', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'exact', contentMatchPattern: 'hello world' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('Hello World')
      const nonMatchingMessage = createMockMessage('Hello World!')

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with startsWith should work correctly', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'startsWith', contentMatchPattern: '!command' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('!command arg1 arg2')
      const nonMatchingMessage = createMockMessage('This is !command')

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with endsWith should work correctly', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'endsWith', contentMatchPattern: 'please' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('Help me please')
      const nonMatchingMessage = createMockMessage('Please help me')

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with regex should work correctly', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'regex', contentMatchPattern: '^!\\w+' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('!help')
      const nonMatchingMessage = createMockMessage('help!')

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with mentionsUser should work with ID', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'mentionsUser', contentMatchPattern: '123456789' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('Hello <@123456789>', {
        users: [['123456789', { id: '123456789', username: 'user' }]],
      })
      const nonMatchingMessage = createMockMessage('Hello <@987654321>', {
        users: [['987654321', { id: '987654321', username: 'other' }]],
      })

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with mentionsBot should work correctly', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'mentionsBot' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('Hello <@bot123>', {
        users: [['bot123', { id: 'bot123', username: 'bot' }]],
      })
      matchingMessage.mentions.has = jest.fn((user: any) => user?.id === 'bot123')

      const nonMatchingMessage = createMockMessage('Hello there')
      nonMatchingMessage.mentions.has = jest.fn((user: any) => false)

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with case-sensitive matching', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters')
          return { contentMatchType: 'contains', contentMatchPattern: 'Hello', caseSensitive: true }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const matchingMessage = createMockMessage('Hello world')
      const nonMatchingMessage = createMockMessage('hello world')

      expect(config.filter?.call(mockContext, matchingMessage as any)).toBe(true)
      expect(config.filter?.call(mockContext, nonMatchingMessage as any)).toBe(false)
    })

    test('message trigger with attachment filter - with attachments', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'any', hasAttachments: 'with' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const withAttachments = createMockMessage('Check this out')
      withAttachments.attachments = { size: 1 }

      const withoutAttachments = createMockMessage('Just text')
      withoutAttachments.attachments = { size: 0 }

      expect(config.filter?.call(mockContext, withAttachments as any)).toBe(true)
      expect(config.filter?.call(mockContext, withoutAttachments as any)).toBe(false)
    })

    test('message trigger with attachment filter - without attachments', () => {
      const config = TRIGGER_REGISTRY['message']

      ;(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
        if (param === 'messageFilters') return { contentMatchType: 'any', hasAttachments: 'without' }
        if (param === 'botFilters') return { botBehavior: 'ignoreAllBots' }
        return undefined
      })

      const withAttachments = createMockMessage('Check this out')
      withAttachments.attachments = { size: 1 }

      const withoutAttachments = createMockMessage('Just text')
      withoutAttachments.attachments = { size: 0 }

      expect(config.filter?.call(mockContext, withAttachments as any)).toBe(false)
      expect(config.filter?.call(mockContext, withoutAttachments as any)).toBe(true)
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
      let eventHandler: ((payload: unknown) => void | Promise<void>) | undefined
      ;(mockClient.on as jest.Mock).mockImplementation((event: string, handler: (payload: unknown) => void | Promise<void>) => {
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
        client: { user: { id: 'bot123' } },
      }

      // Call the event handler (now async)
      await eventHandler?.(mockMessage)

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
