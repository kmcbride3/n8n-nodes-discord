/**
 * V2 Actions Router Testing
 *
 * Comprehensive testing of the Discord V2 actions router that handles
 * routing requests to appropriate operation handlers based on resource
 * and operation parameters.
 *
 * Resources tested:
 * - message, prompt, action, webhook, utility, channel, event, guild, member, role, user
 *
 * Target: 85%+ coverage for V2 actions router
 */

import { NodeOperationError } from 'n8n-workflow'
import type { IExecuteFunctions } from 'n8n-workflow'

// Mock all operation modules
jest.mock('../../../../src/nodes/Discord/v2/actions/channel', () => ({
  getChannel: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'channel123' } }]]) },
  getPermissions: { execute: jest.fn().mockResolvedValue([[{ json: { permissions: [] } }]]) },
  getThreadMembers: { execute: jest.fn().mockResolvedValue([[{ json: { members: [] } }]]) },
  listThreads: { execute: jest.fn().mockResolvedValue([[{ json: { threads: [] } }]]) },
  listWebhooks: { execute: jest.fn().mockResolvedValue([[{ json: { webhooks: [] } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/event', () => ({
  getEvent: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'event123' } }]]) },
  getEventUsers: { execute: jest.fn().mockResolvedValue([[{ json: { users: [] } }]]) },
  listEvents: { execute: jest.fn().mockResolvedValue([[{ json: { events: [] } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/guild', () => ({
  getAuditLog: { execute: jest.fn().mockResolvedValue([[{ json: { entries: [] } }]]) },
  getGuild: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'guild123' } }]]) },
  listBans: { execute: jest.fn().mockResolvedValue([[{ json: { bans: [] } }]]) },
  listChannels: { execute: jest.fn().mockResolvedValue([[{ json: { channels: [] } }]]) },
  listEmojis: { execute: jest.fn().mockResolvedValue([[{ json: { emojis: [] } }]]) },
  listInvites: { execute: jest.fn().mockResolvedValue([[{ json: { invites: [] } }]]) },
  listRoles: { execute: jest.fn().mockResolvedValue([[{ json: { roles: [] } }]]) },
  listWebhooks: { execute: jest.fn().mockResolvedValue([[{ json: { webhooks: [] } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/member', () => ({
  addRole: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
  removeRole: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
  kickUser: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
  banUser: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
  timeoutUser: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
  getMember: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'member123' } }]]) },
  getMemberRoles: { execute: jest.fn().mockResolvedValue([[{ json: { roles: [] } }]]) },
  listMembers: { execute: jest.fn().mockResolvedValue([[{ json: { members: [] } }]]) },
  searchMembers: { execute: jest.fn().mockResolvedValue([[{ json: { members: [] } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/message', () => ({
  sendMessage: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'msg123' } }]]) },
  deleteMessage: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
  bulkDeleteMessages: { execute: jest.fn().mockResolvedValue([[{ json: { deleted: 5 } }]]) },
  getMessage: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'msg123' } }]]) },
  getMessages: { execute: jest.fn().mockResolvedValue([[{ json: { messages: [] } }]]) },
  getPinnedMessages: { execute: jest.fn().mockResolvedValue([[{ json: { messages: [] } }]]) },
  getReactions: { execute: jest.fn().mockResolvedValue([[{ json: { reactions: [] } }]]) },
  searchMessages: { execute: jest.fn().mockResolvedValue([[{ json: { messages: [] } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/prompt', () => ({
  sendButton: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'prompt123' } }]]) },
  sendSelect: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'prompt123' } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/role', () => ({
  getRole: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'role123' } }]]) },
  getRoleMembers: { execute: jest.fn().mockResolvedValue([[{ json: { members: [] } }]]) },
  getRolePermissions: { execute: jest.fn().mockResolvedValue([[{ json: { permissions: [] } }]]) },
  listRoles: { execute: jest.fn().mockResolvedValue([[{ json: { roles: [] } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/user', () => ({
  getUser: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'user123' } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/webhook', () => ({
  createWebhook: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'webhook123' } }]]) },
  sendWebhook: { execute: jest.fn().mockResolvedValue([[{ json: { id: 'msg123' } }]]) },
}))

jest.mock('../../../../src/nodes/Discord/v2/actions/utility', () => ({
  interactionManager: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
  utility: { execute: jest.fn().mockResolvedValue([[{ json: { success: true } }]]) },
}))

import { router } from '../../../../src/nodes/Discord/v2/actions/router'

describe('V2 Actions Router', () => {
  let mockContext: jest.Mocked<IExecuteFunctions>

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockContext = {
      getNodeParameter: jest.fn(),
      getNode: jest.fn().mockReturnValue({
        id: 'node-id',
        name: 'DiscordV2',
        type: 'n8n-nodes-discord.discordV2',
        typeVersion: 2,
        position: [0, 0],
        parameters: {},
      }),
    } as unknown as jest.Mocked<IExecuteFunctions>
  })

  describe('Message Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter
        .mockReturnValueOnce('message') // resource
    })

    test('should route to sendMessage operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('send') // operation
      
      const result = await router.call(mockContext)
      
      expect(result).toBeDefined()
      expect(mockContext.getNodeParameter).toHaveBeenCalledWith('resource', 0)
      expect(mockContext.getNodeParameter).toHaveBeenCalledWith('operation', 0)
    })

    test('should route to getMessage operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('getMessage')
      await router.call(mockContext)
      expect(mockContext.getNodeParameter).toHaveBeenCalledWith('operation', 0)
    })

    test('should route to deleteMessage operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('deleteMessage')
      await router.call(mockContext)
      expect(mockContext.getNodeParameter).toHaveBeenCalledWith('operation', 0)
    })

    test('should throw error for unknown message operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('unknownOperation')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
    })
  })

  describe('Prompt Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('prompt')
    })

    test('should route to sendButton operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('button')
      
      const result = await router.call(mockContext)
      
      expect(result).toBeDefined()
    })

    test('should route to sendSelect operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('select')
      
      const result = await router.call(mockContext)
      
      expect(result).toBeDefined()
    })

    test('should throw error for unknown prompt operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('unknownOperation')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
    })
  })

  describe('Action Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('action')
    })

    test('should route to addRole operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('addRole')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to removeRole operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('removeRole')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to kickMember operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('kickMember')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to banMember operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('banMember')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to timeoutMember operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('timeoutMember')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Webhook Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('webhook')
    })

    test('should route to create webhook operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('create')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to send webhook operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('send')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Channel Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('channel')
    })

    test('should route to getChannel operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('getChannel')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to listThreads operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('listThreads')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Event Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('event')
    })

    test('should route to getEvent operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('getEvent')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to listEvents operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('listEvents')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Guild Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('guild')
    })

    test('should route to getGuild operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('getGuild')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to listChannels operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('listChannels')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Member Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('member')
    })

    test('should route to getMember operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('getMember')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to listMembers operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('listMembers')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Role Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('role')
    })

    test('should route to getRole operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('getRole')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to listRoles operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('listRoles')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('User Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('user')
    })

    test('should route to getUser operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('getUser')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Utility Resource', () => {
    beforeEach(() => {
      mockContext.getNodeParameter.mockReturnValueOnce('utility')
    })

    test('should route to utility operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('utility')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })

    test('should route to interactionManager operation', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('interactionManager')
      const result = await router.call(mockContext)
      expect(result).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should throw error for unknown resource', async () => {
      mockContext.getNodeParameter
        .mockReturnValueOnce('unknownResource')
        .mockReturnValueOnce('someOperation')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
    })

    test('should preserve NodeOperationError from operations', async () => {
      const message = require('../../../../src/nodes/Discord/v2/actions/message')
      message.sendMessage.execute.mockRejectedValueOnce(
        new NodeOperationError(mockContext.getNode(), 'Test error')
      )
      
      mockContext.getNodeParameter
        .mockReturnValueOnce('message')
        .mockReturnValueOnce('send')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
    })

    test('should wrap generic errors in NodeOperationError', async () => {
      const message = require('../../../../src/nodes/Discord/v2/actions/message')
      message.sendMessage.execute.mockRejectedValueOnce(new Error('Generic error'))
      
      mockContext.getNodeParameter
        .mockReturnValueOnce('message')
        .mockReturnValueOnce('send')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
    })
  })
})
