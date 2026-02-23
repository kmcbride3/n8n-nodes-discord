/**
 * V2 Helper Modules Testing - Type Helpers
 *
 * Comprehensive testing of type conversion helper functions:
 * - toIDataObject: Safe type conversion
 * - toAPIInteraction: Convert to Discord API interaction with validation
 * - toAPISelectMenuOptions: Convert to select menu options array
 * - toMessageActionRowComponents: Convert to action row components
 *
 * Tests cover:
 * - Type conversion and validation
 * - Error handling for invalid inputs
 * - Edge cases and null/undefined handling
 * - Integration with n8n error types
 *
 * Target: Increase type-helpers coverage from 68.86% to 90%+
 */

import { NodeOperationError } from 'n8n-workflow'
import {
  toIDataObject,
  toAPIInteraction,
  toAPISelectMenuOptions,
  toMessageActionRowComponents,
} from '../../../../src/nodes/Discord/v2/helpers/type-helpers'

describe('V2 Helper Modules - Type Helpers', () => {
  describe('toIDataObject', () => {
    test('should convert object to IDataObject', () => {
      const data = { key: 'value', number: 123 }
      const result = toIDataObject(data)
      
      expect(result).toBe(data)
      expect(result).toEqual({ key: 'value', number: 123 })
    })

    test('should handle nested objects', () => {
      const data = {
        user: { id: '123', name: 'Test' },
        metadata: { timestamp: 1234567890 },
      }
      const result = toIDataObject(data)
      
      expect(result).toBe(data)
    })

    test('should handle arrays', () => {
      const data = [1, 2, 3, 4, 5]
      const result = toIDataObject(data)
      
      expect(result).toBe(data)
    })

    test('should handle primitive types', () => {
      expect(toIDataObject('string')).toBe('string')
      expect(toIDataObject(123)).toBe(123)
      expect(toIDataObject(true)).toBe(true)
    })

    test('should handle null and undefined', () => {
      expect(toIDataObject(null)).toBeNull()
      expect(toIDataObject(undefined)).toBeUndefined()
    })

    test('should preserve type information with generic', () => {
      interface CustomType {
        id: string
        value: number
      }
      
      const data = { id: 'test', value: 100 }
      const result = toIDataObject<CustomType>(data)
      
      expect(result.id).toBe('test')
      expect(result.value).toBe(100)
    })
  })

  describe('toAPIInteraction', () => {
    test('should convert valid object to APIInteraction', () => {
      const interaction = {
        id: '123456789',
        type: 2,
        token: 'test_token',
        version: 1,
      }
      
      const result = toAPIInteraction(interaction)
      
      expect(result).toBe(interaction)
      expect(result.id).toBe('123456789')
      expect(result.type).toBe(2)
    })

    test('should parse JSON string to APIInteraction', () => {
      const interactionJson = JSON.stringify({
        id: '987654321',
        type: 3,
        token: 'another_token',
        version: 1,
      })
      
      const result = toAPIInteraction(interactionJson)
      
      expect(result.id).toBe('987654321')
      expect(result.type).toBe(3)
      expect(result.token).toBe('another_token')
    })

    test('should throw NodeOperationError for null value', () => {
      expect(() => toAPIInteraction(null)).toThrow(NodeOperationError)
      expect(() => toAPIInteraction(null)).toThrow('Missing interaction data')
    })

    test('should throw NodeOperationError for undefined value', () => {
      expect(() => toAPIInteraction(undefined)).toThrow(NodeOperationError)
      expect(() => toAPIInteraction(undefined)).toThrow('Missing interaction data')
    })

    test('should throw NodeOperationError for invalid JSON string', () => {
      expect(() => toAPIInteraction('invalid json {')).toThrow(NodeOperationError)
      expect(() => toAPIInteraction('invalid json {')).toThrow('Invalid interaction JSON')
    })

    test('should handle complex interaction objects', () => {
      const interaction = {
        id: '123',
        type: 2,
        token: 'token',
        version: 1,
        data: {
          id: '456',
          name: 'test-command',
          options: [{ name: 'param', value: 'value' }],
        },
        guild_id: '789',
        channel_id: '012',
      }
      
      const result = toAPIInteraction(interaction)
      
      expect(result).toBe(interaction)
      expect(result.data).toBeDefined()
      expect(result.guild_id).toBe('789')
    })

    test('should accept node parameter for error context', () => {
      const mockNode = {
        id: 'test-node',
        name: 'Test Node',
        type: 'test-type',
        typeVersion: 1,
        position: [0, 0] as [number, number],
        parameters: {},
      }
      
      expect(() => toAPIInteraction(null, mockNode)).toThrow(NodeOperationError)
    })

    test('should handle empty JSON object string', () => {
      const result = toAPIInteraction('{}')
      
      expect(result).toEqual({})
    })

    test('should handle JSON array string', () => {
      const result = toAPIInteraction('[1, 2, 3]')
      
      expect(result).toEqual([1, 2, 3])
    })
  })

  describe('toAPISelectMenuOptions', () => {
    test('should convert valid array to APISelectMenuOption[]', () => {
      const options = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
      ]
      
      const result = toAPISelectMenuOptions(options)
      
      expect(result).toBe(options)
      expect(result.length).toBe(2)
      expect(result[0].label).toBe('Option 1')
    })

    test('should return empty array for null', () => {
      const result = toAPISelectMenuOptions(null)
      
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should return empty array for undefined', () => {
      const result = toAPISelectMenuOptions(undefined)
      
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should handle empty array', () => {
      const result = toAPISelectMenuOptions([])
      
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should handle options with descriptions', () => {
      const options = [
        { label: 'Option 1', value: 'opt1', description: 'First option' },
        { label: 'Option 2', value: 'opt2', description: 'Second option' },
      ]
      
      const result = toAPISelectMenuOptions(options)
      
      expect(result[0].description).toBe('First option')
      expect(result[1].description).toBe('Second option')
    })

    test('should handle options with emojis', () => {
      const options = [
        { label: 'Option 1', value: 'opt1', emoji: { name: '👍' } },
        { label: 'Option 2', value: 'opt2', emoji: { id: '123456' } },
      ]
      
      const result = toAPISelectMenuOptions(options)
      
      expect(result[0].emoji).toEqual({ name: '👍' })
      expect(result[1].emoji).toEqual({ id: '123456' })
    })

    test('should handle large arrays', () => {
      const options = Array.from({ length: 25 }, (_, i) => ({
        label: `Option ${i + 1}`,
        value: `opt${i + 1}`,
      }))
      
      const result = toAPISelectMenuOptions(options)
      
      expect(result.length).toBe(25)
      expect(result[24].label).toBe('Option 25')
    })

    test('should preserve default property', () => {
      const options = [
        { label: 'Option 1', value: 'opt1', default: true },
        { label: 'Option 2', value: 'opt2', default: false },
      ]
      
      const result = toAPISelectMenuOptions(options)
      
      expect(result[0].default).toBe(true)
      expect(result[1].default).toBe(false)
    })
  })

  describe('toMessageActionRowComponents', () => {
    test('should convert valid array to MessageActionRowComponentBuilder[]', () => {
      const components = [
        { type: 2, style: 1, label: 'Button 1', custom_id: 'btn1' },
        { type: 2, style: 2, label: 'Button 2', custom_id: 'btn2' },
      ]
      
      const result = toMessageActionRowComponents(components)
      
      expect(result).toBe(components)
      expect(result.length).toBe(2)
    })

    test('should return empty array for null', () => {
      const result = toMessageActionRowComponents(null)
      
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should return empty array for undefined', () => {
      const result = toMessageActionRowComponents(undefined)
      
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should handle empty array', () => {
      const result = toMessageActionRowComponents([])
      
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should handle button components', () => {
      const buttons = [
        { type: 2, style: 1, label: 'Primary', custom_id: 'primary' },
        { type: 2, style: 2, label: 'Secondary', custom_id: 'secondary' },
        { type: 2, style: 3, label: 'Success', custom_id: 'success' },
        { type: 2, style: 4, label: 'Danger', custom_id: 'danger' },
      ]
      
      const result = toMessageActionRowComponents(buttons)
      
      expect(result.length).toBe(4)
      // Function does type casting, so original properties are preserved
      expect((result[0] as any).style).toBe(1)
      expect((result[3] as any).label).toBe('Danger')
    })

    test('should handle select menu components', () => {
      const selectMenus = [
        {
          type: 3,
          custom_id: 'select1',
          placeholder: 'Choose an option',
          options: [
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' },
          ],
        },
      ]
      
      const result = toMessageActionRowComponents(selectMenus)
      
      expect(result.length).toBe(1)
      // Function does type casting, so original properties are preserved
      expect((result[0] as any).type).toBe(3)
      expect((result[0] as any).placeholder).toBe('Choose an option')
    })

    test('should handle mixed component types', () => {
      const components = [
        { type: 2, style: 1, label: 'Button', custom_id: 'btn' },
        { type: 3, custom_id: 'select', options: [] },
      ]
      
      const result = toMessageActionRowComponents(components)
      
      expect(result.length).toBe(2)
      // Function does type casting, so original properties are preserved
      expect((result[0] as any).type).toBe(2)
      expect((result[1] as any).type).toBe(3)
    })
  })

  describe('Type Safety and Edge Cases', () => {
    test('toIDataObject should handle deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: { value: 'deep' },
            },
          },
        },
      }
      
      const result = toIDataObject(data) as any
      
      expect(result.level1.level2.level3.level4.value).toBe('deep')
    })

    test('toAPIInteraction should provide helpful error messages', () => {
      try {
        toAPIInteraction(null)
        fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(NodeOperationError)
        expect((error as NodeOperationError).message).toContain('Missing interaction data')
      }
    })

    test('array conversion functions should handle non-array inputs gracefully', () => {
      const optionsResult = toAPISelectMenuOptions('not an array')
      const componentsResult = toMessageActionRowComponents('not an array')
      
      // Should return original value (cast to array type) or empty array
      expect(Array.isArray(optionsResult) || optionsResult === 'not an array').toBe(true)
      expect(Array.isArray(componentsResult) || componentsResult === 'not an array').toBe(true)
    })

    test('toIDataObject should preserve function properties', () => {
      const obj = {
        method: () => 'result',
        value: 123,
      }
      
      const result = toIDataObject(obj) as any
      
      expect(typeof result.method).toBe('function')
      expect(result.method()).toBe('result')
    })
  })
})
