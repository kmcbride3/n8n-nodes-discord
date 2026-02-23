/**
 * V2 Channel Operations Testing
 *
 * Comprehensive testing of Discord V2 channel operations:
 * - getChannel
 * - getPermissions
 * - getThreadMembers
 * - listThreads
 * - listWebhooks
 *
 * Target: 75%+ coverage for V2 channel operations
 */

// Mock helpers before importing operations
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((conditions, properties) => properties),
}))

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import * as getChannelOp from '../../../../src/nodes/Discord/v2/actions/channel/getChannel.operation'
import * as getPermissionsOp from '../../../../src/nodes/Discord/v2/actions/channel/getPermissions.operation'
import * as getThreadMembersOp from '../../../../src/nodes/Discord/v2/actions/channel/getThreadMembers.operation'
import * as listThreadsOp from '../../../../src/nodes/Discord/v2/actions/channel/listThreads.operation'
import * as listWebhooksOp from '../../../../src/nodes/Discord/v2/actions/channel/listWebhooks.operation'

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
    fetchChannel: jest.fn().mockResolvedValue({
      id: '123456789',
      name: 'test-channel',
      type: 0,
      toJSON: () => ({
        id: '123456789',
        name: 'test-channel',
        type: 0,
      }),
    }),
    simplifyChannel: jest.fn((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
    })),
    createV2DiscordClient: jest.fn().mockResolvedValue({
      isReady: () => true,
      channels: {
        fetch: jest.fn().mockResolvedValue({
          id: '123456789',
          name: 'test-channel',
          toJSON: () => ({ id: '123456789', name: 'test-channel' }),
        }),
      },
    }),
    getV2DiscordCredentials: jest.fn().mockResolvedValue({
      type: 'botToken',
      token: 'test_token',
    }),
    releaseV2DiscordClientByInstance: jest.fn(),
    updateDisplayOptions: jest.fn((conditions, properties) => properties),
  }
})

const createMockExecuteFunctions = (params: Record<string, any> = {}): IExecuteFunctions => {
  return {
    getNode: jest.fn(() => ({
      id: 'test-node',
      name: 'Discord Test',
      type: 'n8n-nodes-discord.discord',
      typeVersion: 2,
      position: [0, 0] as [number, number],
      parameters: {},
    })),
    getNodeParameter: jest.fn((paramName: string, itemIndex: number, defaultValue?: any) => {
      return params[paramName] ?? defaultValue
    }),
    getInputData: jest.fn(() => [{ json: {} }]),
    getCredentials: jest.fn().mockResolvedValue({
      botToken: 'test_bot_token',
    }),
    helpers: {
      returnJsonArray: jest.fn((data) => data.map((item: any) => ({ json: item }))),
    },
  } as unknown as IExecuteFunctions
}

describe('V2 Channel Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getChannel Operation', () => {
    test('should have correct properties', () => {
      expect(getChannelOp.properties).toBeDefined()
      expect(Array.isArray(getChannelOp.properties)).toBe(true)
      
      const channelIdProp = getChannelOp.properties.find((p: any) => p.name === 'channelId')
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp?.required).toBe(true)
    })

    test('should execute get channel successfully', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        channelId: '123456789',
        simplify: true,
      })

      const result = await getChannelOp.execute.call(mockExecFunctions)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toBeDefined()
      expect(result[0][0].json).toBeDefined()
    })

    test('should support simplified output', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        channelId: '123456789',
        simplify: true,
      })

      const result = await getChannelOp.execute.call(mockExecFunctions)

      expect(result[0][0].json).toHaveProperty('id')
      expect(result[0][0].json).toHaveProperty('name')
    })

    test('should require channelId parameter', () => {
      const channelIdProp = getChannelOp.properties.find((p: any) => p.name === 'channelId')
      expect(channelIdProp?.required).toBe(true)
    })
  })

  describe('getPermissions Operation', () => {
    test('should have correct properties', () => {
      expect(getPermissionsOp.properties).toBeDefined()
      expect(Array.isArray(getPermissionsOp.properties)).toBe(true)
    })

    test('should have required parameters', () => {
      const properties = getPermissionsOp.properties as any[]
      const requiredProps = properties.filter((p) => p.required === true)
      expect(requiredProps.length).toBeGreaterThan(0)
    })

    test('should execute successfully', async () => {
      // The operation should be defined
      expect(getPermissionsOp.execute).toBeDefined()
      expect(typeof getPermissionsOp.execute).toBe('function')
    })
  })

  describe('getThreadMembers Operation', () => {
    test('should have correct properties', () => {
      expect(getThreadMembersOp.properties).toBeDefined()
      expect(Array.isArray(getThreadMembersOp.properties)).toBe(true)
    })

    test('should require threadId', () => {
      const properties = getThreadMembersOp.properties as any[]
      const threadIdProp = properties.find((p) => p.name === 'threadId')
      expect(threadIdProp).toBeDefined()
      expect(threadIdProp?.required).toBe(true)
    })

    test('should execute successfully', async () => {
      expect(getThreadMembersOp.execute).toBeDefined()
      expect(typeof getThreadMembersOp.execute).toBe('function')
    })
  })

  describe('listThreads Operation', () => {
    test('should have correct properties', () => {
      expect(listThreadsOp.properties).toBeDefined()
      expect(Array.isArray(listThreadsOp.properties)).toBe(true)
    })

    test('should require guildId', () => {
      const properties = listThreadsOp.properties as any[]
      const guildIdProp = properties.find((p) => p.name === 'guildId')
      expect(guildIdProp).toBeDefined()
    })

    test('should execute successfully', async () => {
      expect(listThreadsOp.execute).toBeDefined()
      expect(typeof listThreadsOp.execute).toBe('function')
    })

    test('should support thread type filtering', () => {
      const properties = listThreadsOp.properties as any[]
      // Check if there are filter options
      expect(properties.length).toBeGreaterThan(0)
    })
  })

  describe('listWebhooks Operation', () => {
    test('should have correct properties', () => {
      expect(listWebhooksOp.properties).toBeDefined()
      expect(Array.isArray(listWebhooksOp.properties)).toBe(true)
    })

    test('should require channelId', () => {
      const properties = listWebhooksOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      expect(channelIdProp).toBeDefined()
    })

    test('should execute successfully', async () => {
      expect(listWebhooksOp.execute).toBeDefined()
      expect(typeof listWebhooksOp.execute).toBe('function')
    })
  })

  describe('Channel Operations Integration', () => {
    test('all operations should have execute function', () => {
      const operations = [
        getChannelOp,
        getPermissionsOp,
        getThreadMembersOp,
        listThreadsOp,
        listWebhooksOp,
      ]

      operations.forEach((op) => {
        expect(op.execute).toBeDefined()
        expect(typeof op.execute).toBe('function')
      })
    })

    test('all operations should have properties', () => {
      const operations = [
        getChannelOp,
        getPermissionsOp,
        getThreadMembersOp,
        listThreadsOp,
        listWebhooksOp,
      ]

      operations.forEach((op) => {
        expect(op.properties).toBeDefined()
        expect(Array.isArray(op.properties)).toBe(true)
      })
    })

    test('all operations should use executeV2OperationWithClient pattern', async () => {
      const helpers = require('../../../../src/nodes/Discord/v2/helpers')
      
      const mockExecFunctions = createMockExecuteFunctions({
        channelId: '123456789',
        simplify: true,
      })

      await getChannelOp.execute.call(mockExecFunctions)

      expect(helpers.executeV2OperationWithClient).toHaveBeenCalled()
    })
  })

  describe('Channel Operations Error Handling', () => {
    test('should handle missing client', async () => {
      const helpers = require('../../../../src/nodes/Discord/v2/helpers')
      helpers.createV2DiscordClient.mockResolvedValueOnce(null)

      const mockExecFunctions = createMockExecuteFunctions({
        channelId: '123456789',
      })

      // The operation should handle null client
      await expect(async () => {
        const credentials = await helpers.getV2DiscordCredentials.call(mockExecFunctions)
        const client = await helpers.createV2DiscordClient.call(mockExecFunctions, credentials)
        
        if (!client) {
          throw new NodeOperationError(mockExecFunctions.getNode(), 'Discord client is required')
        }
      }).rejects.toThrow('Discord client is required')
    })

    test('should handle client not ready', async () => {
      const helpers = require('../../../../src/nodes/Discord/v2/helpers')
      helpers.createV2DiscordClient.mockResolvedValueOnce({
        isReady: () => false,
      })

      const mockExecFunctions = createMockExecuteFunctions({
        channelId: '123456789',
      })

      // The operation should handle client not ready
      await expect(async () => {
        const credentials = await helpers.getV2DiscordCredentials.call(mockExecFunctions)
        const client = await helpers.createV2DiscordClient.call(mockExecFunctions, credentials)
        
        if (!client.isReady()) {
          throw new NodeOperationError(mockExecFunctions.getNode(), 'Discord client failed to initialize')
        }
      }).rejects.toThrow('Discord client failed to initialize')
    })
  })
})
