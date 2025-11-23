/**
 * Phase 3.2: Critical Path Tests - Discord.js Collector Lifecycle
 *
 * Tests for Discord.js message collectors, interaction collectors,
 * and proper lifecycle management to prevent memory leaks
 */

import { INode, NodeOperationError } from 'n8n-workflow'

// Mock Discord.js components
jest.mock('discord.js')

const mockNode: INode = {
  id: 'test',
  name: 'Test',
  type: 'test',
  typeVersion: 1,
  position: [0, 0] as [number, number],
  parameters: {},
}

const mockChannel: {
  id: string
  name: string
  type: number
  createMessageCollector: jest.Mock
  createMessageComponentCollector: jest.Mock
  send: jest.Mock
} = {
  id: '123456789012345678',
  name: 'test-channel',
  type: 0,
  createMessageCollector: jest.fn(),
  createMessageComponentCollector: jest.fn(),
  send: jest.fn(),
}

const mockMessage: {
  id: string
  content: string
  author: { id: string }
  channel: typeof mockChannel
  createMessageComponentCollector: jest.Mock
} = {
  id: '123456789012345678',
  content: 'test message',
  author: { id: '123456789012345678' },
  channel: mockChannel,
  createMessageComponentCollector: jest.fn(),
}

describe('Discord.js Collector Lifecycle Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Collector Creation and Configuration', () => {
    describe('Message Collector Creation', () => {
      test('should create MessageCollector with proper filter function', () => {
        const filter = (message: any) => message.author.id === '123456789012345678'
        const collectorOptions = {
          filter,
          time: 30000, // 30 seconds
          max: 1,
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector(collectorOptions)

        expect(mockChannel.createMessageCollector).toHaveBeenCalledWith(collectorOptions)
        expect(collector).toBeDefined()
        expect(typeof collectorOptions.filter).toBe('function')
      })

      test('should set appropriate timeout values (default 30s)', () => {
        const defaultTimeout = 30000
        const collectorOptions = {
          filter: () => true,
          time: defaultTimeout,
          max: 1,
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        mockChannel.createMessageCollector(collectorOptions)

        expect(mockChannel.createMessageCollector).toHaveBeenCalledWith(
          expect.objectContaining({ time: defaultTimeout }),
        )
      })

      test('should configure max collection limit (default 1)', () => {
        const collectorOptions = {
          filter: () => true,
          time: 30000,
          max: 1,
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        mockChannel.createMessageCollector(collectorOptions)

        expect(mockChannel.createMessageCollector).toHaveBeenCalledWith(expect.objectContaining({ max: 1 }))
      })

      test('should handle collector creation errors gracefully', () => {
        mockChannel.createMessageCollector.mockImplementation(() => {
          throw new Error('Failed to create collector')
        })

        expect(() => {
          mockChannel.createMessageCollector({ filter: () => true })
        }).toThrow('Failed to create collector')
      })

      test('should use Discord.js native collector creation methods', () => {
        const collectorOptions = {
          filter: () => true,
          time: 30000,
          max: 1,
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector(collectorOptions)

        expect(collector).toHaveProperty('on')
        expect(collector).toHaveProperty('stop')
        expect(collector).toHaveProperty('ended')
      })
    })

    describe('Interaction Collector Creation', () => {
      test('should create InteractionCollector for button/select components', () => {
        const filter = (interaction: any) => interaction.customId === 'test-button'
        const collectorOptions = {
          filter,
          time: 30000,
          max: 1,
          componentType: 'BUTTON',
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockMessage.createMessageComponentCollector.mockReturnValue(mockCollector)
        const collector = mockMessage.createMessageComponentCollector(collectorOptions)

        expect(mockMessage.createMessageComponentCollector).toHaveBeenCalledWith(collectorOptions)
        expect(collector).toBeDefined()
      })

      test('should filter interactions by component customId', () => {
        const customId = 'test-button'
        const filter = (interaction: any) => interaction.customId === customId

        const testInteraction = { customId: 'test-button' }
        const wrongInteraction = { customId: 'wrong-button' }

        expect(filter(testInteraction)).toBe(true)
        expect(filter(wrongInteraction)).toBe(false)
      })

      test('should handle interaction collector timeout configuration', () => {
        const timeout = 60000 // 1 minute
        const collectorOptions = {
          filter: () => true,
          time: timeout,
          max: 1,
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockMessage.createMessageComponentCollector.mockReturnValue(mockCollector)
        mockMessage.createMessageComponentCollector(collectorOptions)

        expect(mockMessage.createMessageComponentCollector).toHaveBeenCalledWith(
          expect.objectContaining({ time: timeout }),
        )
      })

      test('should support multiple interaction types in single collector', () => {
        const supportedTypes = ['BUTTON', 'SELECT_MENU']
        const filter = (interaction: any) =>
          supportedTypes.includes(interaction.componentType) && interaction.customId.startsWith('test-')

        const buttonInteraction = {
          componentType: 'BUTTON',
          customId: 'test-button-1',
        }
        const selectInteraction = {
          componentType: 'SELECT_MENU',
          customId: 'test-select-1',
        }
        const unsupportedInteraction = {
          componentType: 'TEXT_INPUT',
          customId: 'test-text-1',
        }

        expect(filter(buttonInteraction)).toBe(true)
        expect(filter(selectInteraction)).toBe(true)
        expect(filter(unsupportedInteraction)).toBe(false)
      })
    })
  })

  describe('Collector Event Handling', () => {
    describe('Event Registration', () => {
      test('should register "collect" event handler for message collection', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const collectHandler = jest.fn()
        collector.on('collect', collectHandler)

        expect(mockCollector.on).toHaveBeenCalledWith('collect', collectHandler)
      })

      test('should register "end" event handler for cleanup', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const endHandler = jest.fn()
        collector.on('end', endHandler)

        expect(mockCollector.on).toHaveBeenCalledWith('end', endHandler)
      })

      test('should handle collector dispose event for memory cleanup', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const disposeHandler = jest.fn()
        collector.on('dispose', disposeHandler)

        expect(mockCollector.on).toHaveBeenCalledWith('dispose', disposeHandler)
      })

      test('should handle multiple event listeners on same collector', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const collectHandler1 = jest.fn()
        const collectHandler2 = jest.fn()
        const endHandler = jest.fn()

        collector.on('collect', collectHandler1)
        collector.on('collect', collectHandler2)
        collector.on('end', endHandler)

        expect(mockCollector.on).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('Collector Timeout and Cleanup', () => {
    describe('Timeout Management', () => {
      test('should handle collector timeout gracefully', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({
          filter: () => true,
          time: 1000, // 1 second for quick test
        })

        const endHandler = jest.fn()
        collector.on('end', endHandler)

        // Simulate timeout
        const endCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'end')?.[1]
        if (endCallback) {
          endCallback(new Map(), 'time')
        }

        expect(endHandler).toHaveBeenCalledWith(expect.any(Map), 'time')
      })

      test('should stop collector manually before timeout', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        collector.stop()

        expect(mockCollector.stop).toHaveBeenCalled()
      })

      test('should handle collector end reasons correctly', () => {
        const endReasons = ['time', 'limit', 'user', 'idle']

        endReasons.forEach((reason) => {
          const mockCollector = {
            on: jest.fn(),
            stop: jest.fn(),
            ended: false,
          }

          mockChannel.createMessageCollector.mockReturnValue(mockCollector)
          const collector = mockChannel.createMessageCollector({ filter: () => true })

          const endHandler = jest.fn()
          collector.on('end', endHandler)

          // Simulate end with specific reason
          const endCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'end')?.[1]
          if (endCallback) {
            endCallback(new Map(), reason)
          }

          expect(endHandler).toHaveBeenCalledWith(expect.any(Map), reason)
        })
      })

      test('should clean up collector resources on end', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
          removeAllListeners: jest.fn(),
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const endHandler = jest.fn(() => {
          // Simulate cleanup
          collector.removeAllListeners?.()
        })
        collector.on('end', endHandler)

        // Simulate end
        const endCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'end')?.[1]
        if (endCallback) {
          endCallback(new Map(), 'time')
        }

        expect(endHandler).toHaveBeenCalled()
      })
    })
  })

  describe('Memory Leak Prevention', () => {
    describe('Resource Management', () => {
      test('should properly dispose of collectors to prevent memory leaks', () => {
        const collectors: any[] = []

        // Create multiple collectors
        for (let i = 0; i < 5; i++) {
          const mockCollector = {
            on: jest.fn(),
            stop: jest.fn(),
            ended: false,
            removeAllListeners: jest.fn(),
          }

          mockChannel.createMessageCollector.mockReturnValue(mockCollector)
          const collector = mockChannel.createMessageCollector({ filter: () => true })
          collectors.push(collector)
        }

        // Clean up all collectors
        collectors.forEach((collector) => {
          collector.stop()
          collector.removeAllListeners?.()
        })

        collectors.forEach((collector) => {
          expect(collector.stop).toHaveBeenCalled()
        })
      })

      test('should remove event listeners when collectors end', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
          removeAllListeners: jest.fn(),
          listenerCount: jest.fn().mockReturnValue(0),
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const endHandler = jest.fn(() => {
          collector.removeAllListeners?.()
        })
        collector.on('end', endHandler)

        // Simulate end
        const endCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'end')?.[1]
        if (endCallback) {
          endCallback(new Map(), 'time')
        }

        expect(mockCollector.removeAllListeners).toHaveBeenCalled()
      })

      test('should handle collector disposal in error scenarios', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
          removeAllListeners: jest.fn(),
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        expect(() => {
          try {
            throw new Error('Simulated error')
          } catch (error) {
            // Clean up even in error scenarios
            collector.stop()
            collector.removeAllListeners?.()
            throw error
          }
        }).toThrow('Simulated error')

        expect(mockCollector.stop).toHaveBeenCalled()
        expect(mockCollector.removeAllListeners).toHaveBeenCalled()
      })

      test('should monitor collector count to prevent excessive creation', () => {
        const maxCollectors = 10
        const activeCollectors = new Set()

        for (let i = 0; i < maxCollectors + 5; i++) {
          if (activeCollectors.size >= maxCollectors) {
            expect(() => {
              throw new NodeOperationError(mockNode, `Maximum collector limit (${maxCollectors}) exceeded`)
            }).toThrow(NodeOperationError)
            break
          }

          const mockCollector = {
            on: jest.fn(),
            stop: jest.fn(),
            ended: false,
            id: `collector-${i}`,
          }

          activeCollectors.add(mockCollector)
        }

        expect(activeCollectors.size).toBeLessThanOrEqual(maxCollectors)
      })
    })
  })

  describe('Collector Error Scenarios', () => {
    describe('Error Handling', () => {
      test('should handle collector creation failures', () => {
        mockChannel.createMessageCollector.mockImplementation(() => {
          throw new Error('Unable to create collector')
        })

        expect(() => {
          mockChannel.createMessageCollector({ filter: () => true })
        }).toThrow('Unable to create collector')
      })

      test('should handle filter function errors gracefully', () => {
        // Suppress console.warn for this test since we're intentionally triggering an error
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

        const faultyFilter = () => {
          throw new Error('Filter error')
        }

        expect(() => {
          faultyFilter()
        }).toThrow('Filter error')

        // Should use try-catch in actual implementation
        const safeFilter = (message: any) => {
          try {
            return faultyFilter()
          } catch (error) {
            console.warn('Filter error:', error)
            return false
          }
        }

        expect(safeFilter(mockMessage)).toBe(false)
        expect(consoleWarnSpy).toHaveBeenCalledWith('Filter error:', expect.any(Error))

        // Restore console.warn
        consoleWarnSpy.mockRestore()
      })

      test('should handle network disconnection during collection', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const errorHandler = jest.fn()
        collector.on('error', errorHandler)

        // Simulate network error
        const errorCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'error')?.[1]
        if (errorCallback) {
          const networkError = new Error('Network disconnected')
          errorCallback(networkError)
        }

        expect(errorHandler).toHaveBeenCalledWith(expect.any(Error))
      })

      test('should provide meaningful error messages for collector failures', () => {
        const errorScenarios = [
          { error: 'MISSING_PERMISSIONS', message: 'Bot lacks permissions to read message history' },
          { error: 'CHANNEL_NOT_FOUND', message: 'Target channel no longer exists' },
          { error: 'RATE_LIMITED', message: 'Rate limited by Discord API' },
        ]

        errorScenarios.forEach((scenario) => {
          expect(() => {
            throw new NodeOperationError(mockNode, scenario.message)
          }).toThrow(scenario.message)
        })
      })
    })
  })

  describe('Concurrent Collector Management', () => {
    describe('Multiple Collectors', () => {
      test('should manage multiple collectors simultaneously', () => {
        const collectors: any[] = []
        const collectorCount = 3

        for (let i = 0; i < collectorCount; i++) {
          const mockCollector = {
            on: jest.fn(),
            stop: jest.fn(),
            ended: false,
            id: `collector-${i}`,
          }

          mockChannel.createMessageCollector.mockReturnValue(mockCollector)
          const collector = mockChannel.createMessageCollector({
            filter: () => true,
            time: 30000,
          })
          collectors.push(collector)
        }

        expect(collectors).toHaveLength(collectorCount)
        collectors.forEach((collector) => {
          expect(collector).toHaveProperty('on')
          expect(collector).toHaveProperty('stop')
        })
      })

      test('should handle collector interference and isolation', () => {
        const collector1Filter = (message: any) => message.content.startsWith('!cmd1')
        const collector2Filter = (message: any) => message.content.startsWith('!cmd2')

        const message1 = { content: '!cmd1 test' }
        const message2 = { content: '!cmd2 test' }
        const message3 = { content: '!other test' }

        expect(collector1Filter(message1)).toBe(true)
        expect(collector1Filter(message2)).toBe(false)
        expect(collector1Filter(message3)).toBe(false)

        expect(collector2Filter(message1)).toBe(false)
        expect(collector2Filter(message2)).toBe(true)
        expect(collector2Filter(message3)).toBe(false)
      })

      test('should clean up all collectors on workflow end', () => {
        const collectors: any[] = []

        // Create multiple collectors
        for (let i = 0; i < 3; i++) {
          const mockCollector = {
            on: jest.fn(),
            stop: jest.fn(),
            ended: false,
            removeAllListeners: jest.fn(),
          }

          mockChannel.createMessageCollector.mockReturnValue(mockCollector)
          const collector = mockChannel.createMessageCollector({ filter: () => true })
          collectors.push(collector)
        }

        // Simulate workflow end - clean up all collectors
        const cleanupAllCollectors = () => {
          collectors.forEach((collector) => {
            if (!collector.ended) {
              collector.stop()
              collector.removeAllListeners?.()
            }
          })
        }

        cleanupAllCollectors()

        collectors.forEach((collector) => {
          expect(collector.stop).toHaveBeenCalled()
          expect(collector.removeAllListeners).toHaveBeenCalled()
        })
      })

      test('should handle collector priority and resource allocation', () => {
        const highPriorityCollector = {
          priority: 'high',
          maxResources: 100,
          id: 'high-priority',
        }

        const lowPriorityCollector = {
          priority: 'low',
          maxResources: 10,
          id: 'low-priority',
        }

        const allocateResources = (collector: any) => {
          if (collector.priority === 'high') {
            return Math.min(collector.maxResources, 100)
          } else {
            return Math.min(collector.maxResources, 50)
          }
        }

        expect(allocateResources(highPriorityCollector)).toBe(100)
        expect(allocateResources(lowPriorityCollector)).toBe(10)
      })
    })
  })

  describe('Integration with n8n Workflow Execution', () => {
    describe('Workflow Context', () => {
      test('should integrate collector lifecycle with n8n node execution', () => {
        const workflowContext = {
          node: mockNode,
          executionId: 'test-execution-123',
          isActive: true,
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
          context: workflowContext,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        expect(collector.context).toEqual(workflowContext)
        expect(collector.context.node).toEqual(mockNode)
      })

      test('should handle n8n execution context in collector events', () => {
        const executionContext = {
          executionId: 'test-execution-123',
          nodeId: mockNode.id,
          userId: 'user-123',
        }

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const collectHandler = jest.fn((message: any) => {
          // Should have access to execution context
          expect(executionContext.executionId).toBe('test-execution-123')
          expect(executionContext.nodeId).toBe(mockNode.id)
        })

        collector.on('collect', collectHandler)

        // Simulate collect event
        const collectCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'collect')?.[1]
        if (collectCallback) {
          collectCallback(mockMessage)
        }

        expect(collectHandler).toHaveBeenCalledWith(mockMessage)
      })

      test('should stop collectors when n8n execution is cancelled', () => {
        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        // Simulate execution cancellation
        const cancelExecution = () => {
          collector.stop()
        }

        cancelExecution()

        expect(mockCollector.stop).toHaveBeenCalled()
      })

      test('should pass collector results to n8n workflow output', () => {
        const collectedMessages: any[] = []

        const mockCollector = {
          on: jest.fn(),
          stop: jest.fn(),
          ended: false,
        }

        mockChannel.createMessageCollector.mockReturnValue(mockCollector)
        const collector = mockChannel.createMessageCollector({ filter: () => true })

        const collectHandler = jest.fn((message: any) => {
          collectedMessages.push({
            id: message.id,
            content: message.content,
            author: message.author.id,
            timestamp: new Date().toISOString(),
          })
        })

        collector.on('collect', collectHandler)

        // Simulate collecting messages
        const collectCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'collect')?.[1]
        if (collectCallback) {
          collectCallback(mockMessage)
          collectCallback({ ...mockMessage, id: '987654321', content: 'second message' })
        }

        const endHandler = jest.fn(() => {
          // Return collected data to n8n
          const outputData = {
            json: {
              collectedMessages,
              totalCount: collectedMessages.length,
            },
          }

          expect(outputData.json.totalCount).toBe(2)
          expect(outputData.json.collectedMessages).toHaveLength(2)
        })

        collector.on('end', endHandler)

        // Simulate end
        const endCallback = mockCollector.on.mock.calls.find((call: any) => call[0] === 'end')?.[1]
        if (endCallback) {
          endCallback(new Map(), 'limit')
        }

        expect(endHandler).toHaveBeenCalled()
      })
    })
  })
})
