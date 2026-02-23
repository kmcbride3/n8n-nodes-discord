/**
 * V2 Message Operations Testing
 *
 * Comprehensive testing of Discord V2 message operations:
 * - sendMessage
 * - getMessage
 * - getMessages
 * - deleteMessage
 * - bulkDeleteMessages
 * - getPinnedMessages
 * - getReactions
 * - searchMessages
 *
 * Target: 75%+ coverage for V2 message operations
 */

// Mock helpers before importing operations
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((conditions, properties) => properties),
}))

import type { INodeExecutionData } from 'n8n-workflow'
import * as sendMessageOp from '../../../../src/nodes/Discord/v2/actions/message/sendMessage.operation'
import * as getMessageOp from '../../../../src/nodes/Discord/v2/actions/message/getMessage.operation'
import * as getMessagesOp from '../../../../src/nodes/Discord/v2/actions/message/getMessages.operation'
import * as deleteMessageOp from '../../../../src/nodes/Discord/v2/actions/message/deleteMessage.operation'
import * as bulkDeleteMessagesOp from '../../../../src/nodes/Discord/v2/actions/message/bulkDeleteMessages.operation'
import * as getPinnedMessagesOp from '../../../../src/nodes/Discord/v2/actions/message/getPinnedMessages.operation'
import * as getReactionsOp from '../../../../src/nodes/Discord/v2/actions/message/getReactions.operation'
import * as searchMessagesOp from '../../../../src/nodes/Discord/v2/actions/message/searchMessages.operation'

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
    executeV2Operation: jest.fn(async (ctx, ops) => {
      const results: INodeExecutionData[] = []
      const inputData = ctx.getInputData()
      
      for (let i = 0; i < inputData.length; i++) {
        const result = await ops.operation(ctx, i)
        results.push(result)
      }
      
      return [results]
    }),
    createV2DiscordClient: jest.fn().mockResolvedValue({
      isReady: () => true,
      channels: {
        fetch: jest.fn().mockResolvedValue({
          id: '123456789',
          send: jest.fn().mockResolvedValue({
            id: '987654321',
            content: 'Test message',
            author: { id: 'bot123', username: 'TestBot' },
            createdTimestamp: Date.now(),
          }),
          messages: {
            fetch: jest.fn().mockResolvedValue({
              id: '987654321',
              content: 'Test message',
              author: { id: 'user123', username: 'TestUser' },
              createdTimestamp: Date.now(),
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
    sendChannelMessage: jest.fn().mockResolvedValue({
      id: '987654321',
      content: 'Test message',
    }),
    fetchChannel: jest.fn().mockResolvedValue({
      id: '123456789',
      name: 'test-channel',
    }),
    fetchMessage: jest.fn().mockResolvedValue({
      id: '987654321',
      content: 'Test message',
    }),
    simplifyMessage: jest.fn((msg) => ({
      id: msg.id,
      content: msg.content,
    })),
    buildEnhancedEmbed: jest.fn().mockReturnValue({}),
    getEnhancedEmbedProperties: jest.fn().mockReturnValue([]),
    isValidSnowflake: jest.fn().mockReturnValue(true),
  }
})

// Mock file attachments helper
jest.mock('../../../../src/nodes/Discord/v2/helpers/file-attachments', () => ({
  buildFileAttachments: jest.fn().mockResolvedValue([]),
  getFileAttachmentProperty: jest.fn().mockReturnValue([]),
}))

describe('V2 Message Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendMessage Operation', () => {
    test('should have correct properties', () => {
      expect(sendMessageOp.properties).toBeDefined()
      expect(Array.isArray(sendMessageOp.properties)).toBe(true)
    })

    test('should have channelId field', () => {
      const properties = sendMessageOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(false)
      expect(channelIdProp.type).toBe('options')
    })

    test('should have content field', () => {
      const properties = sendMessageOp.properties as any[]
      const contentProp = properties.find((p) => p.name === 'content')
      
      expect(contentProp).toBeDefined()
      expect(contentProp.type).toBe('string')
    })

    test('should have execute function', () => {
      expect(sendMessageOp.execute).toBeDefined()
      expect(typeof sendMessageOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(sendMessageOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('getMessage Operation', () => {
    test('should have correct properties', () => {
      expect(getMessageOp.properties).toBeDefined()
      expect(Array.isArray(getMessageOp.properties)).toBe(true)
    })

    test('should require channelId and messageId', () => {
      const properties = getMessageOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      const messageIdProp = properties.find((p) => p.name === 'messageId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
      expect(messageIdProp).toBeDefined()
      expect(messageIdProp.required).toBe(true)
    })

    test('should have simplify option', () => {
      const properties = getMessageOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp).toBeDefined()
      expect(simplifyProp.type).toBe('boolean')
      expect(simplifyProp.default).toBe(true)
    })

    test('should have execute function', () => {
      expect(getMessageOp.execute).toBeDefined()
      expect(typeof getMessageOp.execute).toBe('function')
    })
  })

  describe('getMessages Operation', () => {
    test('should have correct properties', () => {
      expect(getMessagesOp.properties).toBeDefined()
      expect(Array.isArray(getMessagesOp.properties)).toBe(true)
    })

    test('should require channelId', () => {
      const properties = getMessagesOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
    })

    test('should have limit field with default', () => {
      const properties = getMessagesOp.properties as any[]
      const limitProp = properties.find((p) => p.name === 'limit')
      
      expect(limitProp).toBeDefined()
      expect(limitProp.type).toBe('number')
      expect(limitProp.default).toBe(50)
    })

    test('should have execute function', () => {
      expect(getMessagesOp.execute).toBeDefined()
      expect(typeof getMessagesOp.execute).toBe('function')
    })
  })

  describe('deleteMessage Operation', () => {
    test('should have correct properties', () => {
      expect(deleteMessageOp.properties).toBeDefined()
      expect(Array.isArray(deleteMessageOp.properties)).toBe(true)
    })

    test('should require channelId and messageId', () => {
      const properties = deleteMessageOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      const messageIdProp = properties.find((p) => p.name === 'messageId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
      expect(messageIdProp).toBeDefined()
      expect(messageIdProp.required).toBe(true)
    })

    test('should have execute function', () => {
      expect(deleteMessageOp.execute).toBeDefined()
      expect(typeof deleteMessageOp.execute).toBe('function')
    })
  })

  describe('bulkDeleteMessages Operation', () => {
    test('should have correct properties', () => {
      expect(bulkDeleteMessagesOp.properties).toBeDefined()
      expect(Array.isArray(bulkDeleteMessagesOp.properties)).toBe(true)
    })

    test('should require channelId', () => {
      const properties = bulkDeleteMessagesOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
    })

    test('should have message selection options', () => {
      const properties = bulkDeleteMessagesOp.properties as any[]
      const removeMessagesNumberProp = properties.find((p) => p.name === 'removeMessagesNumber')
      
      expect(removeMessagesNumberProp).toBeDefined()
      expect(removeMessagesNumberProp.type).toBe('number')
      expect(removeMessagesNumberProp.required).toBe(true)
    })

    test('should have execute function', () => {
      expect(bulkDeleteMessagesOp.execute).toBeDefined()
      expect(typeof bulkDeleteMessagesOp.execute).toBe('function')
    })
  })

  describe('getPinnedMessages Operation', () => {
    test('should have correct properties', () => {
      expect(getPinnedMessagesOp.properties).toBeDefined()
      expect(Array.isArray(getPinnedMessagesOp.properties)).toBe(true)
    })

    test('should require channelId', () => {
      const properties = getPinnedMessagesOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
    })

    test('should have simplify option', () => {
      const properties = getPinnedMessagesOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp).toBeDefined()
      expect(simplifyProp.type).toBe('boolean')
    })

    test('should have execute function', () => {
      expect(getPinnedMessagesOp.execute).toBeDefined()
      expect(typeof getPinnedMessagesOp.execute).toBe('function')
    })
  })

  describe('getReactions Operation', () => {
    test('should have correct properties', () => {
      expect(getReactionsOp.properties).toBeDefined()
      expect(Array.isArray(getReactionsOp.properties)).toBe(true)
    })

    test('should require channelId, messageId, and have emoji field', () => {
      const properties = getReactionsOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      const messageIdProp = properties.find((p) => p.name === 'messageId')
      const emojiProp = properties.find((p) => p.name === 'emoji')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
      expect(messageIdProp).toBeDefined()
      expect(messageIdProp.required).toBe(true)
      expect(emojiProp).toBeDefined()
      expect(emojiProp.displayOptions).toBeDefined()
    })

    test('should have limit field', () => {
      const properties = getReactionsOp.properties as any[]
      const limitProp = properties.find((p) => p.name === 'limit')
      
      expect(limitProp).toBeDefined()
      expect(limitProp.type).toBe('number')
    })

    test('should have execute function', () => {
      expect(getReactionsOp.execute).toBeDefined()
      expect(typeof getReactionsOp.execute).toBe('function')
    })
  })

  describe('searchMessages Operation', () => {
    test('should have correct properties', () => {
      expect(searchMessagesOp.properties).toBeDefined()
      expect(Array.isArray(searchMessagesOp.properties)).toBe(true)
    })

    test('should require channelId and have searchQuery', () => {
      const properties = searchMessagesOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      const searchQueryProp = properties.find((p) => p.name === 'searchQuery')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
      expect(searchQueryProp).toBeDefined()
    })

    test('should have execute function', () => {
      expect(searchMessagesOp.execute).toBeDefined()
      expect(typeof searchMessagesOp.execute).toBe('function')
    })
  })

  describe('Operation Exports', () => {
    test('all operations should export properties and execute', () => {
      const operations = [
        sendMessageOp,
        getMessageOp,
        getMessagesOp,
        deleteMessageOp,
        bulkDeleteMessagesOp,
        getPinnedMessagesOp,
        getReactionsOp,
        searchMessagesOp,
      ]

      operations.forEach((operation) => {
        expect(operation.properties).toBeDefined()
        expect(operation.execute).toBeDefined()
        expect(typeof operation.execute).toBe('function')
      })
    })
  })
})
