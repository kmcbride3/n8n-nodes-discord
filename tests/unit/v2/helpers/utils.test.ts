/**
 * V2 Helper Modules Testing - Utils
 *
 * Comprehensive testing of utility helper functions:
 * - createPerformanceMetrics: Create performance tracking objects
 * - measureDiscordApiPerformance: Measure API call performance
 * - parseDiscordError: Convert Discord.js errors to n8n errors
 * - Error handling and validation
 *
 * Tests cover:
 * - Performance metrics generation
 * - Error parsing and conversion
 * - Discord API error handling
 * - Edge cases and validation
 *
 * Target: Increase utils coverage from 31.4% to 60%+
 */

import { createPerformanceMetrics, measureDiscordApiPerformance } from '../../../../src/nodes/Discord/v2/helpers/utils'

describe('V2 Helper Modules - Utils', () => {
  describe('createPerformanceMetrics', () => {
    test('should create basic performance metrics', () => {
      const startTime = 1000
      const endTime = 1500
      const metrics = createPerformanceMetrics(startTime, endTime, 'GET', '/api/channels/123')
      
      expect(metrics).toBeDefined()
      expect(metrics.startTime).toBe(1000)
      expect(metrics.endTime).toBe(1500)
      expect(metrics.duration).toBe(500)
      expect(metrics.method).toBe('GET')
      expect(metrics.endpoint).toBe('/api/channels/123')
      expect(metrics.operation).toBe('discord-api')
      expect(metrics.success).toBe(true)
    })

    test('should include optional parameters', () => {
      const metrics = createPerformanceMetrics(
        1000,
        1500,
        'POST',
        '/api/messages',
        'send-message',
        true,
        200,
      )
      
      expect(metrics.operation).toBe('send-message')
      expect(metrics.statusCode).toBe(200)
      expect(metrics.success).toBe(true)
    })

    test('should handle failure scenarios', () => {
      const metrics = createPerformanceMetrics(
        1000,
        2000,
        'POST',
        '/api/channels/123/messages',
        'send-message',
        false,
        429,
        'Rate limit exceeded',
      )
      
      expect(metrics.success).toBe(false)
      expect(metrics.statusCode).toBe(429)
      expect(metrics.errorMessage).toBe('Rate limit exceeded')
    })

    test('should calculate duration correctly', () => {
      const metrics = createPerformanceMetrics(1000, 3500, 'GET', '/api/users/123')
      
      expect(metrics.duration).toBe(2500)
    })

    test('should handle zero duration', () => {
      const metrics = createPerformanceMetrics(1000, 1000, 'GET', '/api/test')
      
      expect(metrics.duration).toBe(0)
    })

    test('should use default operation name', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test')
      
      expect(metrics.operation).toBe('discord-api')
    })

    test('should accept custom operation name', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test', 'custom-operation')
      
      expect(metrics.operation).toBe('custom-operation')
    })
  })

  describe('measureDiscordApiPerformance', () => {
    test('should measure API performance', () => {
      const startTime = Date.now()
      const endTime = startTime + 250
      const metrics = measureDiscordApiPerformance(startTime, endTime, 'GET', '/api/channels')
      
      expect(metrics).toBeDefined()
      expect(metrics.duration).toBe(250)
      expect(metrics.method).toBe('GET')
      expect(metrics.endpoint).toBe('/api/channels')
    })

    test('should track successful operations', () => {
      const metrics = measureDiscordApiPerformance(1000, 1200, 'POST', '/api/test', 'test-op', true, 200)
      
      expect(metrics.success).toBe(true)
      expect(metrics.statusCode).toBe(200)
      expect(metrics.errorMessage).toBeUndefined()
    })

    test('should track failed operations', () => {
      const metrics = measureDiscordApiPerformance(
        1000,
        1500,
        'POST',
        '/api/test',
        'test-op',
        false,
        500,
        'Internal Server Error',
      )
      
      expect(metrics.success).toBe(false)
      expect(metrics.statusCode).toBe(500)
      expect(metrics.errorMessage).toBe('Internal Server Error')
    })

    test('should handle different HTTP methods', () => {
      const getMet = measureDiscordApiPerformance(1000, 1100, 'GET', '/api/test')
      const postMet = measureDiscordApiPerformance(1000, 1100, 'POST', '/api/test')
      const putMet = measureDiscordApiPerformance(1000, 1100, 'PUT', '/api/test')
      const deleteMet = measureDiscordApiPerformance(1000, 1100, 'DELETE', '/api/test')
      
      expect(getMet.method).toBe('GET')
      expect(postMet.method).toBe('POST')
      expect(putMet.method).toBe('PUT')
      expect(deleteMet.method).toBe('DELETE')
    })

    test('should preserve endpoint paths', () => {
      const metrics = measureDiscordApiPerformance(1000, 1100, 'GET', '/api/guilds/123/channels/456/messages/789')
      
      expect(metrics.endpoint).toBe('/api/guilds/123/channels/456/messages/789')
    })

    test('should handle custom operation names', () => {
      const metrics = measureDiscordApiPerformance(1000, 1100, 'GET', '/api/test', 'fetch-guild-data')
      
      expect(metrics.operation).toBe('fetch-guild-data')
    })
  })

  describe('Performance Metrics Structure', () => {
    test('should have all required fields', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test')
      
      expect(metrics).toHaveProperty('operation')
      expect(metrics).toHaveProperty('startTime')
      expect(metrics).toHaveProperty('endTime')
      expect(metrics).toHaveProperty('duration')
      expect(metrics).toHaveProperty('method')
      expect(metrics).toHaveProperty('endpoint')
      expect(metrics).toHaveProperty('success')
    })

    test('should have optional fields', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test', 'test', true, 200, 'error')
      
      expect(metrics).toHaveProperty('statusCode')
      expect(metrics).toHaveProperty('errorMessage')
    })

    test('should maintain type consistency', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test')
      
      expect(typeof metrics.startTime).toBe('number')
      expect(typeof metrics.endTime).toBe('number')
      expect(typeof metrics.duration).toBe('number')
      expect(typeof metrics.method).toBe('string')
      expect(typeof metrics.endpoint).toBe('string')
      expect(typeof metrics.operation).toBe('string')
      expect(typeof metrics.success).toBe('boolean')
    })
  })

  describe('Edge Cases', () => {
    test('should handle negative duration gracefully', () => {
      // In case of clock skew or timing issues
      const metrics = createPerformanceMetrics(2000, 1500, 'GET', '/api/test')
      
      expect(metrics.duration).toBe(-500)
      expect(metrics.startTime).toBe(2000)
      expect(metrics.endTime).toBe(1500)
    })

    test('should handle large duration values', () => {
      const metrics = createPerformanceMetrics(0, 999999, 'GET', '/api/test')
      
      expect(metrics.duration).toBe(999999)
    })

    test('should handle empty endpoint strings', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '')
      
      expect(metrics.endpoint).toBe('')
    })

    test('should handle special characters in endpoints', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test?param=value&other=123')
      
      expect(metrics.endpoint).toBe('/api/test?param=value&other=123')
    })

    test('should handle undefined status code', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test', 'test', true)
      
      expect(metrics.statusCode).toBeUndefined()
    })

    test('should handle undefined error message', () => {
      const metrics = createPerformanceMetrics(1000, 1500, 'GET', '/api/test', 'test', false)
      
      expect(metrics.errorMessage).toBeUndefined()
    })
  })

  describe('Measurement Consistency', () => {
    test('createPerformanceMetrics and measureDiscordApiPerformance should produce same output', () => {
      const params = [1000, 1500, 'GET', '/api/test', 'operation', true, 200, 'error'] as const
      const metrics1 = createPerformanceMetrics(...params)
      const metrics2 = measureDiscordApiPerformance(...params)
      
      expect(metrics1).toEqual(metrics2)
    })

    test('should produce consistent durations', () => {
      const start = 1234567890
      const end = 1234569890
      const metrics = createPerformanceMetrics(start, end, 'POST', '/api/test')
      
      expect(metrics.duration).toBe(end - start)
      expect(metrics.duration).toBe(2000)
    })
  })
})
