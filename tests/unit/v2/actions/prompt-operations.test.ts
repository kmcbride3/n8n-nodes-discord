/**
 * V2 Prompt Operations Testing
 *
 * Comprehensive testing of Discord V2 prompt operations (interactive components):
 * - sendButton
 * - sendSelect
 *
 * These operations handle interactive message components with collectors
 * for handling user interactions.
 *
 * Target: 75%+ coverage for V2 prompt operations
 */

// Mock helpers before importing operations
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((conditions, properties) => properties),
}))

import type { INodeExecutionData } from 'n8n-workflow'
import * as sendButtonOp from '../../../../src/nodes/Discord/v2/actions/prompt/sendButton.operation'
import * as sendSelectOp from '../../../../src/nodes/Discord/v2/actions/prompt/sendSelect.operation'

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
      channels: {
        fetch: jest.fn().mockResolvedValue({
          id: '123456789',
          send: jest.fn().mockResolvedValue({
            id: '987654321',
            content: 'Test prompt message',
            components: [],
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
    sendChannelMessage: jest.fn().mockResolvedValue({
      id: '987654321',
      content: 'Test prompt message',
      components: [],
    }),
    discordStateManager: {
      setInteractionCollector: jest.fn(),
      getInteractionCollector: jest.fn(),
      removeInteractionCollector: jest.fn(),
      storeInteractionData: jest.fn(),
    },
  }
})

// Mock builders
jest.mock('../../../../src/nodes/Discord/v2/helpers/builders', () => ({
  createActionRow: jest.fn().mockReturnValue({
    type: 1,
    components: [],
  }),
  createButtonComponent: jest.fn().mockReturnValue({
    type: 2,
    style: 1,
    label: 'Test Button',
    customId: 'test_button',
  }),
  createSelectComponent: jest.fn().mockReturnValue({
    type: 3,
    customId: 'test_select',
    options: [],
  }),
}))

// Mock file attachments helper
jest.mock('../../../../src/nodes/Discord/v2/helpers/file-attachments', () => ({
  buildFileAttachments: jest.fn().mockResolvedValue([]),
  getFileAttachmentProperty: jest.fn().mockReturnValue([]),
}))

describe('V2 Prompt Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendButton Operation', () => {
    test('should have correct properties', () => {
      expect(sendButtonOp.properties).toBeDefined()
      expect(Array.isArray(sendButtonOp.properties)).toBe(true)
    })

    test('should require channelId', () => {
      const properties = sendButtonOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
      expect(channelIdProp.type).toBe('options')
    })

    test('should require content', () => {
      const properties = sendButtonOp.properties as any[]
      const contentProp = properties.find((p) => p.name === 'content')
      
      expect(contentProp).toBeDefined()
      expect(contentProp.required).toBe(true)
      expect(contentProp.type).toBe('string')
    })

    test('should have buttons collection', () => {
      const properties = sendButtonOp.properties as any[]
      const buttonsProp = properties.find((p) => p.name === 'buttons')
      
      expect(buttonsProp).toBeDefined()
      expect(buttonsProp.type).toBe('fixedCollection')
    })

    test('buttons collection should have label and value fields', () => {
      const properties = sendButtonOp.properties as any[]
      const buttonsProp = properties.find((p) => p.name === 'buttons')
      
      expect(buttonsProp).toBeDefined()
      expect(buttonsProp.options).toBeDefined()
      expect(Array.isArray(buttonsProp.options)).toBe(true)
      
      const buttonOption = buttonsProp.options[0]
      expect(buttonOption.name).toBe('button')
      expect(buttonOption.values).toBeDefined()
      
      const labelField = buttonOption.values.find((v: any) => v.name === 'label')
      const valueField = buttonOption.values.find((v: any) => v.name === 'value')
      
      expect(labelField).toBeDefined()
      expect(valueField).toBeDefined()
    })

    test('should have style option for buttons', () => {
      const properties = sendButtonOp.properties as any[]
      const buttonsProp = properties.find((p) => p.name === 'buttons')
      const buttonOption = buttonsProp.options[0]
      const styleField = buttonOption.values.find((v: any) => v.name === 'style')
      
      expect(styleField).toBeDefined()
      expect(styleField.type).toBe('options')
    })

    test('should have timeout option', () => {
      const properties = sendButtonOp.properties as any[]
      const timeoutProp = properties.find((p) => p.name === 'timeout')
      
      expect(timeoutProp).toBeDefined()
      expect(timeoutProp.type).toBe('number')
    })

    test('should have collectionMode option', () => {
      const properties = sendButtonOp.properties as any[]
      const collectionModeProp = properties.find((p) => p.name === 'collectionMode')
      
      expect(collectionModeProp).toBeDefined()
      expect(collectionModeProp.type).toBe('options')
    })

    test('should have execute function', () => {
      expect(sendButtonOp.execute).toBeDefined()
      expect(typeof sendButtonOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(sendButtonOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('sendSelect Operation', () => {
    test('should have correct properties', () => {
      expect(sendSelectOp.properties).toBeDefined()
      expect(Array.isArray(sendSelectOp.properties)).toBe(true)
    })

    test('should require channelId', () => {
      const properties = sendSelectOp.properties as any[]
      const channelIdProp = properties.find((p) => p.name === 'channelId')
      
      expect(channelIdProp).toBeDefined()
      expect(channelIdProp.required).toBe(true)
      expect(channelIdProp.type).toBe('options')
    })

    test('should require content', () => {
      const properties = sendSelectOp.properties as any[]
      const contentProp = properties.find((p) => p.name === 'content')
      
      expect(contentProp).toBeDefined()
      expect(contentProp.required).toBe(true)
      expect(contentProp.type).toBe('string')
    })

    test('should have select collection', () => {
      const properties = sendSelectOp.properties as any[]
      const selectProp = properties.find((p) => p.name === 'select')
      
      expect(selectProp).toBeDefined()
      expect(selectProp.type).toBe('fixedCollection')
    })

    test('select collection should have label and value fields', () => {
      const properties = sendSelectOp.properties as any[]
      const selectProp = properties.find((p) => p.name === 'select')
      
      expect(selectProp).toBeDefined()
      expect(selectProp.options).toBeDefined()
      expect(Array.isArray(selectProp.options)).toBe(true)
      
      const option = selectProp.options[0]
      expect(option.values).toBeDefined()
      
      const labelField = option.values.find((v: any) => v.name === 'label')
      const valueField = option.values.find((v: any) => v.name === 'value')
      
      expect(labelField).toBeDefined()
      expect(valueField).toBeDefined()
    })

    test('should have timeout option', () => {
      const properties = sendSelectOp.properties as any[]
      const timeoutProp = properties.find((p) => p.name === 'timeout')
      
      expect(timeoutProp).toBeDefined()
      expect(timeoutProp.type).toBe('number')
    })

    test('should have execute function', () => {
      expect(sendSelectOp.execute).toBeDefined()
      expect(typeof sendSelectOp.execute).toBe('function')
    })

    test('should export properties and execute', () => {
      const keys = Object.keys(sendSelectOp)
      expect(keys).toContain('properties')
      expect(keys).toContain('execute')
    })
  })

  describe('Interactive Component Structure', () => {
    test('button operation should support multiple button styles', () => {
      const properties = sendButtonOp.properties as any[]
      const buttonsProp = properties.find((p) => p.name === 'buttons')
      const buttonOption = buttonsProp.options[0]
      const styleField = buttonOption.values.find((v: any) => v.name === 'style')
      
      expect(styleField.options).toBeDefined()
      expect(Array.isArray(styleField.options)).toBe(true)
      expect(styleField.options.length).toBeGreaterThan(0)
    })

    test('select operation should support option descriptions', () => {
      const properties = sendSelectOp.properties as any[]
      const selectProp = properties.find((p) => p.name === 'select')
      const option = selectProp.options[0]
      const descriptionField = option.values.find((v: any) => v.name === 'description')
      
      expect(descriptionField).toBeDefined()
      expect(descriptionField.type).toBe('string')
    })
  })

  describe('Operation Exports', () => {
    test('all prompt operations should export properties and execute', () => {
      const operations = [sendButtonOp, sendSelectOp]

      operations.forEach((operation) => {
        expect(operation.properties).toBeDefined()
        expect(operation.execute).toBeDefined()
        expect(typeof operation.execute).toBe('function')
      })
    })
  })
})
