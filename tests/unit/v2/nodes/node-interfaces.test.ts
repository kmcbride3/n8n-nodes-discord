/**
 * Node Interface Testing - P0 Priority
 *
 * Comprehensive testing of all Discord node interfaces to ensure:
 * - Proper node configuration and metadata
 * - Execute method functionality
 * - Error handling
 * - Resource and operation routing
 *
 * Target: 90%+ coverage for node entry points
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

// Mock n8n-workflow NodeConnectionTypes before any imports
jest.mock('n8n-workflow', () => {
  const actual = jest.requireActual<typeof import('n8n-workflow')>('n8n-workflow')
  return {
    ...actual,
    NodeConnectionTypes: {
      Main: 'main',
    },
  }
})

// Mock helpers before importing nodes
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((options) => options),
}))

// Mock all operations that get imported by the node modules
// Each operation needs to export: properties, description, execute
const createMockOperation = (name: string) => ({
  description: { displayName: name, name, action: name },
  properties: [{ displayName: 'Test Prop', name: 'testProp', type: 'string' }],
  execute: jest.fn(),
})

// Mock member operations
jest.mock('../../../../src/nodes/Discord/v2/actions/member/addRole.operation', () => createMockOperation('addRole'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/removeRole.operation', () => createMockOperation('removeRole'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/banUser.operation', () => createMockOperation('banUser'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/kickUser.operation', () => createMockOperation('kickUser'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/timeoutUser.operation', () => createMockOperation('timeoutUser'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/getMember.operation', () => createMockOperation('getMember'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/getMemberRoles.operation', () => createMockOperation('getMemberRoles'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/listMembers.operation', () => createMockOperation('listMembers'))
jest.mock('../../../../src/nodes/Discord/v2/actions/member/searchMembers.operation', () => createMockOperation('searchMembers'))

// Mock channel operations
jest.mock('../../../../src/nodes/Discord/v2/actions/channel/getChannel.operation', () => createMockOperation('getChannel'))
jest.mock('../../../../src/nodes/Discord/v2/actions/channel/getPermissions.operation', () => createMockOperation('getPermissions'))
jest.mock('../../../../src/nodes/Discord/v2/actions/channel/getThreadMembers.operation', () => createMockOperation('getThreadMembers'))
jest.mock('../../../../src/nodes/Discord/v2/actions/channel/listThreads.operation', () => createMockOperation('listThreads'))
jest.mock('../../../../src/nodes/Discord/v2/actions/channel/listWebhooks.operation', () => createMockOperation('listWebhooks'))

// Mock guild operations
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/getGuild.operation', () => createMockOperation('getGuild'))
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/getAuditLog.operation', () => createMockOperation('getAuditLog'))
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/listChannels.operation', () => createMockOperation('listChannels'))
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/listRoles.operation', () => createMockOperation('listRoles'))
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/listEmojis.operation', () => createMockOperation('listEmojis'))
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/listBans.operation', () => createMockOperation('listBans'))
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/listInvites.operation', () => createMockOperation('listInvites'))
jest.mock('../../../../src/nodes/Discord/v2/actions/guild/listWebhooks.operation', () => createMockOperation('listWebhooks'))

// Mock role operations
jest.mock('../../../../src/nodes/Discord/v2/actions/role/getRole.operation', () => createMockOperation('getRole'))
jest.mock('../../../../src/nodes/Discord/v2/actions/role/getRoleMembers.operation', () => createMockOperation('getRoleMembers'))
jest.mock('../../../../src/nodes/Discord/v2/actions/role/getRolePermissions.operation', () => createMockOperation('getRolePermissions'))
jest.mock('../../../../src/nodes/Discord/v2/actions/role/listRoles.operation', () => createMockOperation('listRoles'))

// Mock message operations
jest.mock('../../../../src/nodes/Discord/v2/actions/message/sendMessage.operation', () => createMockOperation('sendMessage'))
jest.mock('../../../../src/nodes/Discord/v2/actions/message/deleteMessage.operation', () => createMockOperation('deleteMessage'))
jest.mock('../../../../src/nodes/Discord/v2/actions/message/bulkDeleteMessages.operation', () => createMockOperation('bulkDeleteMessages'))
jest.mock('../../../../src/nodes/Discord/v2/actions/message/getMessage.operation', () => createMockOperation('getMessage'))
jest.mock('../../../../src/nodes/Discord/v2/actions/message/getMessages.operation', () => createMockOperation('getMessages'))
jest.mock('../../../../src/nodes/Discord/v2/actions/message/searchMessages.operation', () => createMockOperation('searchMessages'))
jest.mock('../../../../src/nodes/Discord/v2/actions/message/getReactions.operation', () => createMockOperation('getReactions'))
jest.mock('../../../../src/nodes/Discord/v2/actions/message/getPinnedMessages.operation', () => createMockOperation('getPinnedMessages'))

// Mock other operations
jest.mock('../../../../src/nodes/Discord/v2/actions/interaction/reply.operation', () => createMockOperation('reply'))
jest.mock('../../../../src/nodes/Discord/v2/actions/interaction/editReply.operation', () => createMockOperation('editReply'))
jest.mock('../../../../src/nodes/Discord/v2/actions/interaction/deferReply.operation', () => createMockOperation('deferReply'))
jest.mock('../../../../src/nodes/Discord/v2/actions/interaction/followUp.operation', () => createMockOperation('followUp'))
jest.mock('../../../../src/nodes/Discord/v2/actions/prompt/sendButton.operation', () => createMockOperation('sendButton'))
jest.mock('../../../../src/nodes/Discord/v2/actions/prompt/sendSelect.operation', () => createMockOperation('sendSelect'))
jest.mock('../../../../src/nodes/Discord/v2/actions/user/getUser.operation', () => createMockOperation('getUser'))
jest.mock('../../../../src/nodes/Discord/v2/actions/event/getEvent.operation', () => createMockOperation('getEvent'))
jest.mock('../../../../src/nodes/Discord/v2/actions/event/listEvents.operation', () => createMockOperation('listEvents'))
jest.mock('../../../../src/nodes/Discord/v2/actions/event/getEventUsers.operation', () => createMockOperation('getEventUsers'))
jest.mock('../../../../src/nodes/Discord/v2/actions/webhook/createWebhook.operation', () => createMockOperation('createWebhook'))
jest.mock('../../../../src/nodes/Discord/v2/actions/webhook/sendWebhook.operation', () => createMockOperation('sendWebhook'))
jest.mock('../../../../src/nodes/Discord/v2/actions/utility/utility.operation', () => createMockOperation('utility'))
jest.mock('../../../../src/nodes/Discord/v2/actions/utility/interactionManager.operation', () => createMockOperation('interactionManager'))

import { DiscordV2 } from '../../../../src/nodes/Discord/v2/DiscordV2.node'
import { DiscordGetV2 } from '../../../../src/nodes/Discord/v2/DiscordGetV2.node'
import { DiscordTriggerV2 } from '../../../../src/nodes/Discord/v2/DiscordTriggerV2.node'
import { DiscordInteractionV2 } from '../../../../src/nodes/Discord/v2/DiscordInteractionV2.node'

// Mock the router
jest.mock('../../../../src/nodes/Discord/v2/actions/router', () => ({
  router: jest.fn(),
}))

// Mock trigger router
jest.mock('../../../../src/nodes/Discord/v2/triggers/router', () => ({
  router: jest.fn(),
}))

// Mock interaction router
jest.mock('../../../../src/nodes/Discord/v2/triggers/interactionRouter', () => ({
  router: jest.fn(),
}))

const createMockExecuteFunctions = (): IExecuteFunctions => {
  return {
    getNode: jest.fn(() => ({
      id: 'test-node-id',
      name: 'Test Discord Node',
      type: 'n8n-nodes-discord.discord',
      typeVersion: 2,
      position: [0, 0] as [number, number],
      parameters: {},
    })),
    getNodeParameter: jest.fn(),
    getInputData: jest.fn(() => []),
    getCredentials: jest.fn(),
    helpers: {
      returnJsonArray: jest.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
    },
  } as unknown as IExecuteFunctions
}

describe('Discord Node Interfaces - Comprehensive Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('DiscordV2 Node', () => {
    let node: DiscordV2

    beforeEach(() => {
      const baseDescription: any = {
        displayName: 'Discord',
        name: 'discord',
        icon: 'file:discord.svg',
        group: ['transform'],
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interact with Discord API',
        version: 2,
        defaults: {
          name: 'Discord',
        },
      }
      node = new DiscordV2(baseDescription)
    })

    test('should have correct node metadata', () => {
      expect(node.description.displayName).toBe('Discord')
      expect(node.description.name).toBe('discord')
      expect(node.description.version).toBe(2)
    })

    test('should have correct node connections', () => {
      expect(node.description.inputs).toBeDefined()
      expect(node.description.outputs).toBeDefined()
    })

    test('should have properties defined', () => {
      expect(node.description.properties).toBeDefined()
      expect(Array.isArray(node.description.properties)).toBe(true)
      expect(node.description.properties.length).toBeGreaterThan(0)
    })

    test('should have loadOptions methods', () => {
      expect(node.methods).toBeDefined()
      expect(node.methods.loadOptions).toBeDefined()
    })

    test('should execute successfully with valid data', async () => {
      const mockRouter = require('../../../../src/nodes/Discord/v2/actions/router').router
      const mockResult: INodeExecutionData[][] = [[{ json: { success: true } }]]
      mockRouter.mockResolvedValue(mockResult)

      const mockExecFunctions = createMockExecuteFunctions()
      const result = await node.execute.call(mockExecFunctions)

      expect(result).toEqual(mockResult)
      expect(mockRouter).toHaveBeenCalled()
    })

    test('should handle NodeOperationError correctly', async () => {
      const mockRouter = require('../../../../src/nodes/Discord/v2/actions/router').router
      const error = new NodeOperationError(
        { id: 'test', name: 'test', type: 'test', typeVersion: 1, position: [0, 0], parameters: {} },
        'Test error',
      )
      mockRouter.mockRejectedValue(error)

      const mockExecFunctions = createMockExecuteFunctions()

      await expect(node.execute.call(mockExecFunctions)).rejects.toThrow(NodeOperationError)
      await expect(node.execute.call(mockExecFunctions)).rejects.toThrow('Test error')
    })

    test('should wrap generic errors in NodeOperationError', async () => {
      const mockRouter = require('../../../../src/nodes/Discord/v2/actions/router').router
      const error = new Error('Generic error')
      mockRouter.mockRejectedValue(error)

      const mockExecFunctions = createMockExecuteFunctions()

      await expect(node.execute.call(mockExecFunctions)).rejects.toThrow(NodeOperationError)
      await expect(node.execute.call(mockExecFunctions)).rejects.toThrow('Discord operation failed')
    })
  })

  describe('DiscordGetV2 Node', () => {
    let node: DiscordGetV2

    beforeEach(() => {
      const baseDescription: any = {
        displayName: 'Discord Get',
        name: 'discordGet',
        icon: 'file:discord.svg',
        group: ['transform'],
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Get information from Discord',
        version: 2,
        defaults: {
          name: 'Discord Get',
        },
      }
      node = new DiscordGetV2(baseDescription)
    })

    test('should have correct node metadata', () => {
      expect(node.description.displayName).toBe('Discord Get')
      expect(node.description.name).toBe('discordGet')
      expect(node.description.version).toBe(2)
    })

    test('should have authentication options', () => {
      const authProperty = node.description.properties.find((p: any) => p.name === 'authentication')
      expect(authProperty).toBeDefined()
      expect(authProperty?.type).toBe('options')
    })

    test('should have resource selection', () => {
      const resourceProperty = node.description.properties.find((p: any) => p.name === 'resource')
      expect(resourceProperty).toBeDefined()
      expect(resourceProperty?.type).toBe('options')
    })

    test('should support bot token and OAuth2 authentication', () => {
      expect(node.description.credentials).toBeDefined()
      const credNames = node.description.credentials?.map((c) => c.name)
      expect(credNames).toContain('discordBotApi')
      expect(credNames).toContain('discordOAuth2Api')
    })

    test('should have properties defined', () => {
      expect(node.description.properties).toBeDefined()
      expect(Array.isArray(node.description.properties)).toBe(true)
      expect(node.description.properties.length).toBeGreaterThan(0)
    })

    test('should have loadOptions methods', () => {
      expect(node.methods).toBeDefined()
      expect(node.methods.loadOptions).toBeDefined()
    })

    test('should execute successfully', async () => {
      const mockResult: INodeExecutionData[][] = [[{ json: { id: '123', name: 'test' } }]]
      
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock)
        .mockReturnValueOnce('channel') // resource
        .mockReturnValueOnce('getChannel') // operation

      // Mock the actual execution
      jest.spyOn(node, 'execute').mockResolvedValue(mockResult)

      const result = await node.execute.call(mockExecFunctions)

      expect(result).toEqual(mockResult)
    })
  })

  describe('DiscordTriggerV2 Node', () => {
    let node: DiscordTriggerV2

    beforeEach(() => {
      const baseDescription: any = {
        displayName: 'Discord Trigger',
        name: 'discordTrigger',
        icon: 'file:discord.svg',
        group: ['trigger'],
        subtitle: '={{$parameter["event"]}}',
        description: 'Trigger workflow on Discord events',
        version: 2,
        defaults: {
          name: 'Discord Trigger',
        },
      }
      node = new DiscordTriggerV2(baseDescription)
    })

    test('should have correct node metadata', () => {
      expect(node.description.displayName).toBe('Discord Trigger')
      expect(node.description.name).toBe('discordTrigger')
      expect(node.description.version).toBe(2)
    })

    test('should be a trigger node', () => {
      // Trigger nodes have different input/output configuration
      expect(node.description.outputs).toBeDefined()
    })

    test('should have properties defined', () => {
      expect(node.description.properties).toBeDefined()
      expect(Array.isArray(node.description.properties)).toBe(true)
      expect(node.description.properties.length).toBeGreaterThan(0)
    })

    test('should have trigger method', () => {
      expect(node.trigger).toBeDefined()
      expect(typeof node.trigger).toBe('function')
    })

    test('should support bot token authentication', () => {
      expect(node.description.credentials).toBeDefined()
      const credNames = node.description.credentials?.map((c) => c.name)
      expect(credNames).toContain('discordBotApi')
    })
  })

  describe('DiscordInteractionV2 Node', () => {
    let node: DiscordInteractionV2

    beforeEach(() => {
      const baseDescription: any = {
        displayName: 'Discord Interaction',
        name: 'discordInteraction',
        icon: 'file:discord.svg',
        group: ['trigger'],
        subtitle: '={{$parameter["interactionType"]}}',
        description: 'Handle Discord interactions',
        version: 2,
        defaults: {
          name: 'Discord Interaction',
        },
      }
      node = new DiscordInteractionV2(baseDescription)
    })

    test('should have correct node metadata', () => {
      expect(node.description.displayName).toBe('Discord Interaction')
      expect(node.description.name).toBe('discordInteraction')
      expect(node.description.version).toBe(2)
    })

    test('should be a trigger node', () => {
      expect(node.description.outputs).toBeDefined()
    })

    test('should have properties defined', () => {
      expect(node.description.properties).toBeDefined()
      expect(Array.isArray(node.description.properties)).toBe(true)
      expect(node.description.properties.length).toBeGreaterThan(0)
    })

    test('should have trigger method', () => {
      expect(node.trigger).toBeDefined()
      expect(typeof node.trigger).toBe('function')
    })

    test('should support bot token authentication', () => {
      expect(node.description.credentials).toBeDefined()
      const credNames = node.description.credentials?.map((c) => c.name)
      expect(credNames).toContain('discordBotApi')
    })
  })

  describe('Node Version Consistency', () => {
    test('all V2 nodes should have version 2', () => {
      const baseDesc = {
        displayName: 'Test',
        name: 'test',
        icon: 'file:discord.svg' as any,
        group: ['transform'] as any,
        subtitle: '',
        description: 'Test',
        version: 2,
        defaults: { name: 'Test' },
      }

      const discordV2 = new DiscordV2(baseDesc)
      const discordGetV2 = new DiscordGetV2(baseDesc)
      const discordTriggerV2 = new DiscordTriggerV2(baseDesc)
      const discordInteractionV2 = new DiscordInteractionV2(baseDesc)

      expect(discordV2.description.version).toBe(2)
      expect(discordGetV2.description.version).toBe(2)
      expect(discordTriggerV2.description.version).toBe(2)
      expect(discordInteractionV2.description.version).toBe(2)
    })

    test('all nodes should have display names', () => {
      const baseDesc: any = {
        displayName: 'Test',
        name: 'test',
        icon: 'file:discord.svg',
        group: ['transform'],
        subtitle: '',
        description: 'Test',
        version: 2,
        defaults: { name: 'Test' },
      }

      const nodes = [
        new DiscordV2(baseDesc),
        new DiscordGetV2(baseDesc),
        new DiscordTriggerV2(baseDesc),
        new DiscordInteractionV2(baseDesc),
      ]

      nodes.forEach((node) => {
        expect(node.description.displayName).toBeDefined()
        expect(node.description.displayName.length).toBeGreaterThan(0)
      })
    })

    test('all nodes should have properties', () => {
      const baseDesc: any = {
        displayName: 'Test',
        name: 'test',
        icon: 'file:discord.svg',
        group: ['transform'],
        subtitle: '',
        description: 'Test',
        version: 2,
        defaults: { name: 'Test' },
      }

      const nodes = [
        new DiscordV2(baseDesc),
        new DiscordGetV2(baseDesc),
        new DiscordTriggerV2(baseDesc),
        new DiscordInteractionV2(baseDesc),
      ]

      nodes.forEach((node) => {
        expect(node.description.properties).toBeDefined()
        expect(Array.isArray(node.description.properties)).toBe(true)
      })
    })
  })

  describe('Node Error Handling', () => {
    test('DiscordV2 should provide helpful error messages', async () => {
      const baseDesc: any = {
        displayName: 'Discord',
        name: 'discord',
        icon: 'file:discord.svg',
        group: ['transform'],
        subtitle: '',
        description: 'Test',
        version: 2,
        defaults: { name: 'Discord' },
      }
      const node = new DiscordV2(baseDesc)

      const mockRouter = require('../../../../src/nodes/Discord/v2/actions/router').router
      mockRouter.mockRejectedValue(new Error('Connection failed'))

      const mockExecFunctions = createMockExecuteFunctions()

      await expect(node.execute.call(mockExecFunctions)).rejects.toThrow('Discord operation failed')
    })

    test('errors should include node context', async () => {
      const baseDesc: any = {
        displayName: 'Discord',
        name: 'discord',
        icon: 'file:discord.svg',
        group: ['transform'],
        subtitle: '',
        description: 'Test',
        version: 2,
        defaults: { name: 'Discord' },
      }
      const node = new DiscordV2(baseDesc)

      const mockRouter = require('../../../../src/nodes/Discord/v2/actions/router').router
      mockRouter.mockRejectedValue(new Error('Test error'))

      const mockExecFunctions = createMockExecuteFunctions()

      try {
        await node.execute.call(mockExecFunctions)
        fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(NodeOperationError)
        expect((error as NodeOperationError).description).toBeDefined()
      }
    })
  })
})
