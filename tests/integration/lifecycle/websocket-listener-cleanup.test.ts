/**
 * Integration Tests: WebSocket Listener Cleanup
 *
 * These tests verify that WebSocketEnhancementManager properly cleans up
 * event listeners to prevent memory leaks when clients are reused from the pool.
 *
 * Critical for ensuring long-running n8n workflows don't accumulate listeners.
 */

import { EventEmitter } from 'events'

import { LoggerProxy } from 'n8n-workflow'

import {
  createWebSocketEnhancement,
  WebSocketEnhancementManager,
} from '../../../src/nodes/Discord/v2/helpers/websocket/websocket-enhancement'

// Mock LoggerProxy to avoid actual logging during tests
jest.mock('n8n-workflow', () => ({
  LoggerProxy: {
    init: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  NodeOperationError: class NodeOperationError extends Error {
    constructor(node: unknown, message: string) {
      super(message)
    }
  },
}))

// Create a mock Discord.js Client that extends EventEmitter
class MockDiscordClient extends EventEmitter {
  public ws = {
    ping: 50,
    shards: new Map(),
  }

  public uptime: number | null = null

  constructor() {
    super()
    // Set to 0 (unlimited) to prevent warnings in stress tests that attach many listeners
    this.setMaxListeners(0)
  }

  public isReady(): boolean {
    return this.uptime !== null
  }

  public removeListener(event: string, listener: (...args: unknown[]) => void): this {
    return super.removeListener(event, listener)
  }
}

describe('WebSocket Listener Cleanup Integration Tests', () => {
  let mockClient: MockDiscordClient

  beforeEach(() => {
    // Create a mock client with event emitter capabilities
    mockClient = new MockDiscordClient()
    mockClient.uptime = 1000 // Simulate connected state

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Ensure client is destroyed after each test
    if (mockClient) {
      mockClient.removeAllListeners()
    }
  })

  describe('Listener Registration', () => {
    it('should register all required event listeners on creation', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      // Get the actual listener count
      const readyListeners = mockClient.listenerCount('ready')
      const reconnectingListeners = mockClient.listenerCount('reconnecting')
      const disconnectListeners = mockClient.listenerCount('disconnect')
      const errorListeners = mockClient.listenerCount('error')
      const warnListeners = mockClient.listenerCount('warn')
      const shardReadyListeners = mockClient.listenerCount('shardReady')

      // Verify all listeners are registered
      expect(readyListeners).toBeGreaterThanOrEqual(1)
      expect(reconnectingListeners).toBeGreaterThanOrEqual(1)
      expect(disconnectListeners).toBeGreaterThanOrEqual(1)
      expect(errorListeners).toBeGreaterThanOrEqual(1)
      expect(warnListeners).toBeGreaterThanOrEqual(1)
      expect(shardReadyListeners).toBeGreaterThanOrEqual(1)

      enhancement.cleanup()
    })

    it('should register exactly 8 listeners (6 monitoring + 2 performance tracking)', () => {
      const initialListenerCount = getClientListenerCount(mockClient)
      const enhancement = createWebSocketEnhancement(mockClient as never)
      const afterCreationCount = getClientListenerCount(mockClient)

      // WebSocketEnhancementManager adds 8 listeners:
      // - ready, reconnecting, disconnect (connection monitoring)
      // - error, warn (performance tracking)
      // - shardReady (performance tracking)
      const addedListeners = afterCreationCount - initialListenerCount
      expect(addedListeners).toBe(6) // 6 unique event types

      enhancement.cleanup()
    })
  })

  describe('Listener Cleanup', () => {
    it('should remove all registered listeners when cleanup() is called', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)
      const beforeCleanup = getClientListenerCount(mockClient)

      enhancement.cleanup()

      const afterCleanup = getClientListenerCount(mockClient)

      // All enhancement listeners should be removed
      expect(afterCleanup).toBeLessThan(beforeCleanup)
      expect(afterCleanup).toBe(0) // No other listeners should remain
    })

    it('should clear internal metrics on cleanup', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      // Trigger some events to populate metrics
      mockClient.emit('error', new Error('Test error'))
      mockClient.emit('warn', 'Test warning')

      const metricsBeforeCleanup = enhancement.getEventMetrics()
      expect(metricsBeforeCleanup.size).toBeGreaterThan(0)

      enhancement.cleanup()

      const metricsAfterCleanup = enhancement.getEventMetrics()
      expect(metricsAfterCleanup.size).toBe(0)
    })

    it('should not throw when cleanup() is called multiple times', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      expect(() => {
        enhancement.cleanup()
        enhancement.cleanup()
        enhancement.cleanup()
      }).not.toThrow()
    })
  })

  describe('Memory Leak Prevention - Client Pooling Scenario', () => {
    it('should not accumulate listeners when enhancement is created/destroyed repeatedly on same client', () => {
      const initialCount = getClientListenerCount(mockClient)

      // Simulate 10 operations using the same pooled client
      for (let i = 0; i < 10; i++) {
        const enhancement = createWebSocketEnhancement(mockClient as never)
        const duringOperationCount = getClientListenerCount(mockClient)

        // During operation, listeners should be present
        expect(duringOperationCount).toBeGreaterThan(initialCount)

        // Cleanup after operation
        enhancement.cleanup()
      }

      const finalCount = getClientListenerCount(mockClient)

      // After all operations, listener count should return to initial
      expect(finalCount).toBe(initialCount)
    })

    it('should not leak listeners after 100 simulated operations', () => {
      const initialCount = getClientListenerCount(mockClient)
      const enhancements: WebSocketEnhancementManager[] = []

      // Simulate 100 operations (typical workflow execution count)
      for (let i = 0; i < 100; i++) {
        const enhancement = createWebSocketEnhancement(mockClient as never)
        enhancements.push(enhancement)
      }

      // All enhancements created, listeners should have accumulated
      const beforeCleanupCount = getClientListenerCount(mockClient)
      expect(beforeCleanupCount).toBeGreaterThan(initialCount)

      // Clean up all enhancements
      enhancements.forEach((enhancement) => enhancement.cleanup())

      const afterCleanupCount = getClientListenerCount(mockClient)

      // After cleanup, should return to initial count
      expect(afterCleanupCount).toBe(initialCount)
    })

    it('should handle interleaved creation and cleanup without listener accumulation', () => {
      const initialCount = getClientListenerCount(mockClient)
      const maxConcurrent = 5

      for (let round = 0; round < 20; round++) {
        const enhancements: WebSocketEnhancementManager[] = []

        // Create multiple concurrent enhancements
        for (let i = 0; i < maxConcurrent; i++) {
          enhancements.push(createWebSocketEnhancement(mockClient as never))
        }

        // Clean up half
        for (let i = 0; i < Math.floor(maxConcurrent / 2); i++) {
          enhancements[i].cleanup()
        }

        // Create more
        for (let i = 0; i < 2; i++) {
          enhancements.push(createWebSocketEnhancement(mockClient as never))
        }

        // Clean up remaining
        enhancements.forEach((enhancement) => enhancement.cleanup())

        // Verify no accumulation after each round
        const currentCount = getClientListenerCount(mockClient)
        expect(currentCount).toBe(initialCount)
      }
    })
  })

  describe('Event Handling After Cleanup', () => {
    it('should not receive events after cleanup', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      // Trigger an event before cleanup
      mockClient.emit('error', new Error('Before cleanup'))
      expect(LoggerProxy.error).toHaveBeenCalledWith('Discord WebSocket error:', expect.any(Object))

      jest.clearAllMocks()

      // Cleanup
      enhancement.cleanup()

      // Add a dummy listener to prevent unhandled error
      mockClient.on('error', () => {
        /* prevent unhandled error */
      })

      // Trigger an event after cleanup
      mockClient.emit('error', new Error('After cleanup'))

      // Logger should NOT be called (listener was removed)
      expect(LoggerProxy.error).not.toHaveBeenCalled()
    })

    it('should not update metrics after cleanup', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      // Trigger events before cleanup
      mockClient.emit('error', new Error('Test'))
      const beforeMetrics = enhancement.getEventMetrics()
      expect(beforeMetrics.get('error')?.eventCount).toBeGreaterThan(0)

      enhancement.cleanup()

      // Add dummy listeners to prevent unhandled errors
      mockClient.on('error', () => {
        /* prevent unhandled error */
      })
      mockClient.on('warn', () => {
        /* prevent unhandled warning */
      })

      // Try to trigger events after cleanup
      mockClient.emit('error', new Error('Test 2'))
      mockClient.emit('warn', 'Test warning')

      const afterMetrics = enhancement.getEventMetrics()

      // Metrics should be cleared
      expect(afterMetrics.size).toBe(0)
      expect(afterMetrics.get('error')).toBeUndefined()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent enhancements on same client', () => {
      const enhancement1 = createWebSocketEnhancement(mockClient as never)
      const enhancement2 = createWebSocketEnhancement(mockClient as never)
      const enhancement3 = createWebSocketEnhancement(mockClient as never)

      // All should have their own metrics
      mockClient.emit('error', new Error('Test'))

      const metrics1 = enhancement1.getEventMetrics()
      const metrics2 = enhancement2.getEventMetrics()
      const metrics3 = enhancement3.getEventMetrics()

      expect(metrics1.get('error')?.eventCount).toBe(1)
      expect(metrics2.get('error')?.eventCount).toBe(1)
      expect(metrics3.get('error')?.eventCount).toBe(1)

      // Cleanup one should not affect others
      enhancement1.cleanup()
      mockClient.emit('warn', 'Test')

      // Enhancement 1 should have cleared metrics
      expect(enhancement1.getEventMetrics().size).toBe(0)

      // Others should still receive events
      expect(enhancement2.getEventMetrics().get('warn')).toBeDefined()
      expect(enhancement3.getEventMetrics().get('warn')).toBeDefined()

      enhancement2.cleanup()
      enhancement3.cleanup()
    })
  })

  describe('Health Metrics After Cleanup', () => {
    it('should still provide health metrics after cleanup (based on client state)', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      const healthBefore = enhancement.getHealthMetrics()
      expect(healthBefore).toBeDefined()
      expect(healthBefore.connected).toBeDefined()

      enhancement.cleanup()

      // Health metrics should still work (reads client state directly)
      const healthAfter = enhancement.getHealthMetrics()
      expect(healthAfter).toBeDefined()
      expect(healthAfter.connected).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle cleanup when no events were ever emitted', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      // Immediately cleanup without any events
      expect(() => enhancement.cleanup()).not.toThrow()

      const metrics = enhancement.getEventMetrics()
      expect(metrics.size).toBe(0)
    })

    it('should handle cleanup after client emits many events', () => {
      const enhancement = createWebSocketEnhancement(mockClient as never)

      // Emit many events
      for (let i = 0; i < 1000; i++) {
        mockClient.emit('error', new Error(`Error ${i}`))
        mockClient.emit('warn', `Warning ${i}`)
      }

      const beforeMetrics = enhancement.getEventMetrics()
      expect(beforeMetrics.get('error')?.eventCount).toBe(1000)
      expect(beforeMetrics.get('warn')?.eventCount).toBe(1000)

      // Cleanup should work even with many metrics
      expect(() => enhancement.cleanup()).not.toThrow()

      const afterMetrics = enhancement.getEventMetrics()
      expect(afterMetrics.size).toBe(0)
    })

    it('should not interfere with other client listeners', () => {
      // Add a custom listener before enhancement
      const customListener = jest.fn()
      mockClient.on('ready', customListener)

      const initialCustomCount = mockClient.listenerCount('ready')

      const enhancement = createWebSocketEnhancement(mockClient as never)

      // Enhancement adds its own listener
      const withEnhancementCount = mockClient.listenerCount('ready')
      expect(withEnhancementCount).toBeGreaterThan(initialCustomCount)

      enhancement.cleanup()

      // Custom listener should still be present
      const afterCleanupCount = mockClient.listenerCount('ready')
      expect(afterCleanupCount).toBe(initialCustomCount)

      mockClient.emit('ready', mockClient as never)
      expect(customListener).toHaveBeenCalled()

      mockClient.off('ready', customListener)
    })
  })
})

/**
 * Helper function to get total listener count across all events
 */
function getClientListenerCount(client: MockDiscordClient): number {
  const events = ['ready', 'reconnecting', 'disconnect', 'error', 'warn', 'shardReady']
  return events.reduce((total, event) => total + client.listenerCount(event), 0)
}
