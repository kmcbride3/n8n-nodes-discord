/**
 * V2 Event Operations Testing
 *
 * Comprehensive testing of Discord V2 event operations (scheduled events):
 * - getEvent
 * - getEventUsers
 * - listEvents
 *
 * Discord scheduled events allow guilds to schedule activities and notify members.
 *
 * Target: 75%+ coverage for V2 event operations
 */

// Mock helpers before importing operations
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((conditions, properties) => properties),
}))

import type { INodeExecutionData } from 'n8n-workflow'
import * as getEventOp from '../../../../src/nodes/Discord/v2/actions/event/getEvent.operation'
import * as getEventUsersOp from '../../../../src/nodes/Discord/v2/actions/event/getEventUsers.operation'
import * as listEventsOp from '../../../../src/nodes/Discord/v2/actions/event/listEvents.operation'

// Mock the helpers module
jest.mock('../../../../src/nodes/Discord/v2/helpers', () => {
  const actual = jest.requireActual('../../../../src/nodes/Discord/v2/helpers')
  return {
    ...actual,
    executeV2OperationWithClient: jest.fn(async (ctx, ops) => {
      const credentials = await ops.getCredentials(ctx)
      const results: INodeExecutionData[] = []
      const inputData = ctx.getInputData()
      
      for (let i = 0; i < inputData.length; i++) {
        const result = await ops.operation(ctx, credentials, i)
        results.push(result)
      }
      
      if (ops.cleanup) {
        await ops.cleanup(ctx, credentials)
      }
      
      return [results]
    }),
    createV2DiscordClient: jest.fn().mockResolvedValue({
      isReady: () => true,
      guilds: {
        fetch: jest.fn().mockResolvedValue({
          id: '123456789',
          scheduledEvents: {
            fetch: jest.fn().mockResolvedValue({
              id: 'event123',
              name: 'Test Event',
              description: 'Test event description',
              scheduledStartTimestamp: Date.now() + 86400000,
              toJSON: () => ({
                id: 'event123',
                name: 'Test Event',
              }),
            }),
          },
        }),
      },
    }),
    getV2DiscordCredentials: jest.fn().mockResolvedValue({
      type: 'botToken',
      token: 'test_token',
    }),
    releaseV2DiscordClientByInstance: jest.fn(),
    updateDisplayOptions: jest.fn((conditions, properties) => properties),
    fetchGuild: jest.fn().mockResolvedValue({
      id: '123456789',
      scheduledEvents: {
        fetch: jest.fn().mockResolvedValue({
          id: 'event123',
          name: 'Test Event',
          fetchSubscribers: jest.fn().mockResolvedValue([
            { user: { id: 'user1', username: 'User1' } },
          ]),
        }),
      },
    }),
  }
})

describe('V2 Event Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getEvent Operation', () => {
    test('should have correct properties', () => {
      expect(getEventOp.properties).toBeDefined()
      expect(Array.isArray(getEventOp.properties)).toBe(true)
    })

    test('should require guildId', () => {
      const properties = getEventOp.properties as any[]
      const guildIdProp = properties.find((p) => p.name === 'guildId')
      
      expect(guildIdProp).toBeDefined()
      expect(guildIdProp.required).toBe(true)
      expect(guildIdProp.type).toBe('string')
    })

    test('should require eventId', () => {
      const properties = getEventOp.properties as any[]
      const eventIdProp = properties.find((p) => p.name === 'eventId')
      
      expect(eventIdProp).toBeDefined()
      expect(eventIdProp.required).toBe(true)
      expect(eventIdProp.type).toBe('string')
    })

    test('should have simplify option', () => {
      const properties = getEventOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp).toBeDefined()
      expect(simplifyProp.type).toBe('boolean')
      expect(simplifyProp.default).toBe(true)
    })

    test('should have execute function', () => {
      expect(getEventOp.execute).toBeDefined()
      expect(typeof getEventOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(getEventOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('getEventUsers Operation', () => {
    test('should have correct properties', () => {
      expect(getEventUsersOp.properties).toBeDefined()
      expect(Array.isArray(getEventUsersOp.properties)).toBe(true)
    })

    test('should require guildId', () => {
      const properties = getEventUsersOp.properties as any[]
      const guildIdProp = properties.find((p) => p.name === 'guildId')
      
      expect(guildIdProp).toBeDefined()
      expect(guildIdProp.required).toBe(true)
      expect(guildIdProp.type).toBe('string')
    })

    test('should require eventId', () => {
      const properties = getEventUsersOp.properties as any[]
      const eventIdProp = properties.find((p) => p.name === 'eventId')
      
      expect(eventIdProp).toBeDefined()
      expect(eventIdProp.required).toBe(true)
      expect(eventIdProp.type).toBe('string')
    })

    test('should have limit option', () => {
      const properties = getEventUsersOp.properties as any[]
      const limitProp = properties.find((p) => p.name === 'limit')
      
      expect(limitProp).toBeDefined()
      expect(limitProp.type).toBe('number')
    })

    test('should have simplify option', () => {
      const properties = getEventUsersOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp).toBeDefined()
      expect(simplifyProp.type).toBe('boolean')
    })

    test('should have execute function', () => {
      expect(getEventUsersOp.execute).toBeDefined()
      expect(typeof getEventUsersOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(getEventUsersOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('listEvents Operation', () => {
    test('should have correct properties', () => {
      expect(listEventsOp.properties).toBeDefined()
      expect(Array.isArray(listEventsOp.properties)).toBe(true)
    })

    test('should require guildId', () => {
      const properties = listEventsOp.properties as any[]
      const guildIdProp = properties.find((p) => p.name === 'guildId')
      
      expect(guildIdProp).toBeDefined()
      expect(guildIdProp.required).toBe(true)
      expect(guildIdProp.type).toBe('string')
    })

    test('should have simplify option', () => {
      const properties = listEventsOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp).toBeDefined()
      expect(simplifyProp.type).toBe('boolean')
      expect(simplifyProp.default).toBe(true)
    })

    test('should have limit option', () => {
      const properties = listEventsOp.properties as any[]
      const limitProp = properties.find((p) => p.name === 'limit')
      
      expect(limitProp).toBeDefined()
      expect(limitProp.type).toBe('number')
    })

    test('should have execute function', () => {
      expect(listEventsOp.execute).toBeDefined()
      expect(typeof listEventsOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(listEventsOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('Event Data Structure', () => {
    test('getEvent should support simplify output', () => {
      const properties = getEventOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp.default).toBe(true)
    })

    test('listEvents should support fetching multiple events', () => {
      const properties = listEventsOp.properties as any[]
      const guildIdProp = properties.find((p) => p.name === 'guildId')
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(guildIdProp.required).toBe(true)
      expect(simplifyProp.default).toBe(true)
    })

    test('getEventUsers should support fetching subscribers', () => {
      const properties = getEventUsersOp.properties as any[]
      const eventIdProp = properties.find((p) => p.name === 'eventId')
      const limitProp = properties.find((p) => p.name === 'limit')
      
      expect(eventIdProp.required).toBe(true)
      expect(limitProp.default).toBe(100)
    })
  })

  describe('Operation Exports', () => {
    test('all event operations should export properties and execute', () => {
      const operations = [getEventOp, getEventUsersOp, listEventsOp]

      operations.forEach((operation) => {
        expect(operation.properties).toBeDefined()
        expect(operation.execute).toBeDefined()
        expect(typeof operation.execute).toBe('function')
      })
    })
  })
})
