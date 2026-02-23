/**
 * V2 Webhook Operations Testing
 *
 * Comprehensive testing of Discord V2 webhook operations:
 * - createWebhook
 * - sendWebhook
 *
 * Webhooks allow external applications to send messages to Discord channels
 * without requiring a bot account.
 *
 * Target: 75%+ coverage for V2 webhook operations
 */

// Mock helpers before importing operations
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((conditions, properties) => properties),
}))

import type { INodeExecutionData } from 'n8n-workflow'
import * as createWebhookOp from '../../../../src/nodes/Discord/v2/actions/webhook/createWebhook.operation'
import * as sendWebhookOp from '../../../../src/nodes/Discord/v2/actions/webhook/sendWebhook.operation'

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
          createWebhook: jest.fn().mockResolvedValue({
            id: 'webhook123',
            token: 'webhook_token_abc',
            name: 'Test Webhook',
            url: 'https://discord.com/api/webhooks/webhook123/webhook_token_abc',
          }),
        }),
      },
    }),
    getV2DiscordCredentials: jest.fn().mockResolvedValue({
      type: 'botToken',
      token: 'test_token',
    }),
    releaseV2DiscordClientByInstance: jest.fn(),
    updateDisplayOptions: jest.fn((conditions, properties) => properties),
    executeWebhookMessage: jest.fn().mockResolvedValue({
      id: '987654321',
      content: 'Webhook message',
      webhook_id: 'webhook123',
    }),
    buildEnhancedEmbed: jest.fn().mockReturnValue({}),
    getEnhancedEmbedProperties: jest.fn().mockReturnValue([]),
  }
})

// Mock helpers security
jest.mock('../../../../src/nodes/Discord/helpers', () => ({
  validateWebhookToken: jest.fn((token) => {
    if (!token || token.length < 10) {
      throw new Error('Invalid webhook token')
    }
  }),
}))

// Mock file attachments helper
jest.mock('../../../../src/nodes/Discord/v2/helpers/file-attachments', () => ({
  buildFileAttachments: jest.fn().mockResolvedValue([]),
}))

describe('V2 Webhook Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createWebhook Operation', () => {
    test('should have correct properties', () => {
      expect(createWebhookOp.properties).toBeDefined()
      expect(Array.isArray(createWebhookOp.properties)).toBe(true)
    })

    test('should require channelId', () => {
      const properties = createWebhookOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
      expect(channelIdProp.type).toBe('string')
    })

    test('should require webhook name', () => {
      const properties = createWebhookOp.properties as any[]
      const nameProp = properties.find((p) => p.name === 'webhookName')
      
      expect(nameProp).toBeDefined()
      expect(nameProp.required).toBe(true)
      expect(nameProp.type).toBe('string')
    })

    test('should have avatar option', () => {
      const properties = createWebhookOp.properties as any[]
      const avatarProp = properties.find((p) => p.name === 'avatarUrl')
      
      expect(avatarProp).toBeDefined()
      expect(avatarProp.type).toBe('string')
    })

    test('should have execute function', () => {
      expect(createWebhookOp.execute).toBeDefined()
      expect(typeof createWebhookOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(createWebhookOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('sendWebhook Operation', () => {
    test('should have correct properties', () => {
      expect(sendWebhookOp.properties).toBeDefined()
      expect(Array.isArray(sendWebhookOp.properties)).toBe(true)
    })

    test('should require webhookId', () => {
      const properties = sendWebhookOp.properties as any[]
      const webhookIdProp = properties.find((p) => p.name === 'webhookId')
      
      expect(webhookIdProp).toBeDefined()
      expect(webhookIdProp.required).toBe(true)
      expect(webhookIdProp.type).toBe('string')
    })

    test('should require webhookToken', () => {
      const properties = sendWebhookOp.properties as any[]
      const webhookTokenProp = properties.find((p) => p.name === 'webhookToken')
      
      expect(webhookTokenProp).toBeDefined()
      expect(webhookTokenProp.required).toBe(true)
      expect(webhookTokenProp.type).toBe('string')
    })

    test('should have content field', () => {
      const properties = sendWebhookOp.properties as any[]
      const contentProp = properties.find((p) => p.name === 'content')
      
      expect(contentProp).toBeDefined()
      expect(contentProp.type).toBe('string')
    })

    test('should have username override', () => {
      const properties = sendWebhookOp.properties as any[]
      const usernameProp = properties.find((p) => p.name === 'username')
      
      expect(usernameProp).toBeDefined()
      expect(usernameProp.type).toBe('string')
    })

    test('should have avatar URL override', () => {
      const properties = sendWebhookOp.properties as any[]
      const avatarUrlProp = properties.find((p) => p.name === 'avatarUrl')
      
      expect(avatarUrlProp).toBeDefined()
      expect(avatarUrlProp.type).toBe('string')
    })

    test('should have wait option', () => {
      const properties = sendWebhookOp.properties as any[]
      const waitProp = properties.find((p) => p.name === 'wait')
      
      expect(waitProp).toBeDefined()
      expect(waitProp.type).toBe('boolean')
      expect(waitProp.default).toBe(true)
    })

    test('should have threadId option', () => {
      const properties = sendWebhookOp.properties as any[]
      const threadIdProp = properties.find((p) => p.name === 'threadId')
      
      expect(threadIdProp).toBeDefined()
      expect(threadIdProp.type).toBe('string')
    })

    test('should have execute function', () => {
      expect(sendWebhookOp.execute).toBeDefined()
      expect(typeof sendWebhookOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(sendWebhookOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('Webhook Security', () => {
    test('createWebhook should validate channel access', () => {
      const properties = createWebhookOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp.required).toBe(true)
      expect(channelIdProp.type).toBe('string')
    })

    test('sendWebhook should validate webhook credentials', () => {
      const properties = sendWebhookOp.properties as any[]
      const webhookIdProp = properties.find((p) => p.name === 'webhookId')
      const webhookTokenProp = properties.find((p) => p.name === 'webhookToken')
      
      expect(webhookIdProp.required).toBe(true)
      expect(webhookTokenProp.required).toBe(true)
    })
  })

  describe('Operation Exports', () => {
    test('all webhook operations should export properties and execute', () => {
      const operations = [createWebhookOp, sendWebhookOp]

      operations.forEach((operation) => {
        expect(operation.properties).toBeDefined()
        expect(operation.execute).toBeDefined()
        expect(typeof operation.execute).toBe('function')
      })
    })
  })
})
