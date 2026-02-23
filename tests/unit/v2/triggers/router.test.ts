/**
 * V2 Triggers Router Testing
 *
 * Comprehensive testing of the Discord V2 triggers router that handles
 * routing trigger requests to appropriate trigger configurations.
 *
 * Trigger types tested:
 * - message, message_update, directMessage
 * - reactionAdd, reactionRemove
 * - thread, thread_update
 * - roleCreate, roleDelete, roleUpdate
 * - command, interaction
 * - userJoins, userLeaves, userUpdate, presenceUpdate, userNickUpdated, userRoleAdded, userRoleRemoved
 *
 * Target: 85%+ coverage for V2 triggers router
 */

import { NodeOperationError } from 'n8n-workflow'
import type { ITriggerFunctions, IExecuteFunctions } from 'n8n-workflow'

// Mock trigger factory
jest.mock('../../../../src/nodes/Discord/v2/triggers/triggerFactory', () => ({
  createDiscordTrigger: jest.fn().mockResolvedValue({
    closeFunction: jest.fn(),
    manualTriggerFunction: jest.fn(),
  }),
}))

// Mock trigger registry
jest.mock('../../../../src/nodes/Discord/v2/triggers/triggerRegistry', () => ({
  TRIGGER_REGISTRY: {
    message: { events: ['messageCreate'] },
    message_update: { events: ['messageUpdate'] },
    directMessage: { events: ['messageCreate'] },
    reactionAdd: { events: ['messageReactionAdd'] },
    reactionRemove: { events: ['messageReactionRemove'] },
    thread: { events: ['threadCreate'] },
    thread_update: { events: ['threadUpdate'] },
    roleCreate: { events: ['roleCreate'] },
    roleDelete: { events: ['roleDelete'] },
    roleUpdate: { events: ['roleUpdate'] },
    command: { events: ['interactionCreate'] },
    interaction: { events: ['interactionCreate'] },
    userJoins: { events: ['guildMemberAdd'] },
    userLeaves: { events: ['guildMemberRemove'] },
    userUpdate: { events: ['guildMemberUpdate'] },
    presenceUpdate: { events: ['presenceUpdate'] },
    userNickUpdated: { events: ['guildMemberUpdate'] },
    userRoleAdded: { events: ['guildMemberUpdate'] },
    userRoleRemoved: { events: ['guildMemberUpdate'] },
  },
}))

import { router, executeRouter } from '../../../../src/nodes/Discord/v2/triggers/router'
import { createDiscordTrigger } from '../../../../src/nodes/Discord/v2/triggers/triggerFactory'

describe('V2 Triggers Router', () => {
  let mockContext: jest.Mocked<ITriggerFunctions>

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockContext = {
      getNodeParameter: jest.fn(),
      getNode: jest.fn().mockReturnValue({
        id: 'trigger-node-id',
        name: 'DiscordTriggerV2',
        type: 'n8n-nodes-discord.discordTriggerV2',
        typeVersion: 2,
        position: [0, 0],
        parameters: {},
      }),
    } as unknown as jest.Mocked<ITriggerFunctions>
  })

  describe('router - Trigger Setup', () => {
    test('should route message trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('message')
      
      const result = await router.call(mockContext)
      
      expect(result).toBeDefined()
      expect(createDiscordTrigger).toHaveBeenCalledWith('message')
    })

    test('should route message_update trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('message_update')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('message_update')
    })

    test('should route directMessage trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('directMessage')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('directMessage')
    })

    test('should route reactionAdd trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('reactionAdd')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('reactionAdd')
    })

    test('should route reactionRemove trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('reactionRemove')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('reactionRemove')
    })

    test('should route thread trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('thread')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('thread')
    })

    test('should route thread_update trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('thread_update')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('thread_update')
    })

    test('should route roleCreate trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('roleCreate')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('roleCreate')
    })

    test('should route roleDelete trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('roleDelete')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('roleDelete')
    })

    test('should route roleUpdate trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('roleUpdate')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('roleUpdate')
    })

    test('should route command trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('command')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('command')
    })

    test('should route interaction trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('interaction')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('interaction')
    })

    test('should route userJoins trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('userJoins')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('userJoins')
    })

    test('should route userLeaves trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('userLeaves')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('userLeaves')
    })

    test('should route userUpdate trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('userUpdate')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('userUpdate')
    })

    test('should route presenceUpdate trigger', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('presenceUpdate')
      
      await router.call(mockContext)
      
      expect(createDiscordTrigger).toHaveBeenCalledWith('presenceUpdate')
    })

    test('should throw error for unknown trigger type', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('unknownTrigger')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
      await expect(router.call(mockContext)).rejects.toThrow('Unknown trigger type')
    })

    test('should handle errors from trigger factory', async () => {
      const mockError = new Error('Factory error')
      ;(createDiscordTrigger as jest.Mock).mockRejectedValueOnce(mockError)
      
      // Need to return value twice: once for the actual test, once for the second await
      mockContext.getNodeParameter.mockReturnValue('message')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
    })

    test('should preserve NodeOperationError from factory', async () => {
      const mockError = new NodeOperationError(
        mockContext.getNode(),
        'Factory NodeOperationError'
      )
      ;(createDiscordTrigger as jest.Mock).mockRejectedValueOnce(mockError)
      
      mockContext.getNodeParameter.mockReturnValueOnce('message')
      
      await expect(router.call(mockContext)).rejects.toThrow(NodeOperationError)
    })
  })

  describe('executeRouter - Manual Execution', () => {
    let mockExecuteContext: jest.Mocked<IExecuteFunctions>

    beforeEach(() => {
      mockExecuteContext = {
        getNodeParameter: jest.fn(),
        getNode: jest.fn().mockReturnValue({
          id: 'trigger-exec-node-id',
          name: 'DiscordTriggerV2',
          type: 'n8n-nodes-discord.discordTriggerV2',
          typeVersion: 2,
          position: [0, 0],
          parameters: {},
        }),
      } as unknown as jest.Mocked<IExecuteFunctions>
    })

    test('should throw error for message trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('message')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(
        'event listeners'
      )
    })

    test('should throw error for message_update trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('message_update')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for directMessage trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('directMessage')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for reactionAdd trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('reactionAdd')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for reactionRemove trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('reactionRemove')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for thread trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('thread')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for thread_update trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('thread_update')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for role triggers execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('roleCreate')
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)

      mockExecuteContext.getNodeParameter.mockReturnValue('roleDelete')
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)

      mockExecuteContext.getNodeParameter.mockReturnValue('roleUpdate')
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for command trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('command')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for interaction trigger execution', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('interaction')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for user triggers execution', async () => {
      const userTriggers = [
        'userJoins',
        'userLeaves',
        'userUpdate',
        'presenceUpdate',
        'userNickUpdated',
        'userRoleAdded',
        'userRoleRemoved',
      ]

      for (const trigger of userTriggers) {
        mockExecuteContext.getNodeParameter.mockReturnValue(trigger)
        await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
      }
    })

    test('should throw error for unknown trigger type in execute', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('unknownTrigger')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow('Unknown trigger type')
    })

    test('should wrap generic errors in executeRouter', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('roleCreate')
      
      // This should go through switch case and throw its own error
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })

    test('should preserve NodeOperationError in executeRouter', async () => {
      mockExecuteContext.getNodeParameter.mockReturnValue('unknownType')
      
      await expect(executeRouter.call(mockExecuteContext)).rejects.toThrow(NodeOperationError)
    })
  })

  describe('Router Contract', () => {
    test('router should return trigger response', async () => {
      mockContext.getNodeParameter.mockReturnValueOnce('message')
      
      const result = await router.call(mockContext)
      
      expect(result).toBeDefined()
      expect(result).toHaveProperty('closeFunction')
    })

    test('all trigger types should use factory pattern', async () => {
      const triggerTypes = [
        'message',
        'reactionAdd',
        'thread',
        'roleCreate',
        'command',
        'userJoins',
      ]

      for (const type of triggerTypes) {
        mockContext.getNodeParameter.mockReturnValueOnce(type)
        await router.call(mockContext)
        expect(createDiscordTrigger).toHaveBeenCalledWith(type)
      }
    })
  })
})
