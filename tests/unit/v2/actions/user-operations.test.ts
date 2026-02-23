/**
 * V2 User Operations Testing
 *
 * Comprehensive testing of user-related operations:
 * - getUser: Fetch a single user by ID
 *
 * Tests cover:
 * - Property definitions and structure
 * - Required fields validation
 * - Optional parameter defaults
 * - Operation exports
 *
 * Target: 60%+ coverage for user operations
 */

// Mock helpers before importing operations
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((conditions, properties) => properties),
}))

import * as getUserOp from '../../../../src/nodes/Discord/v2/actions/user/getUser.operation'

describe('V2 User Operations', () => {
  describe('getUser Operation', () => {
    test('should have correct properties', () => {
      expect(getUserOp.properties).toBeDefined()
      expect(Array.isArray(getUserOp.properties)).toBe(true)
    })

    test('should require userId', () => {
      const properties = getUserOp.properties as any[]
      const userIdProp = properties.find((p) => p.name === 'userId')
      
      expect(userIdProp).toBeDefined()
      expect(userIdProp.required).toBe(true)
      expect(userIdProp.type).toBe('string')
    })

    test('should have simplify option with default true', () => {
      const properties = getUserOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp).toBeDefined()
      expect(simplifyProp.type).toBe('boolean')
      expect(simplifyProp.default).toBe(true)
    })

    test('should have execute function', () => {
      expect(getUserOp.execute).toBeDefined()
      expect(typeof getUserOp.execute).toBe('function')
    })

    test('should have correct display options', () => {
      const properties = getUserOp.properties as any[]
      
      // All properties should have displayOptions showing for resource 'user'
      properties.forEach((prop) => {
        if (prop.displayOptions?.show) {
          expect(prop.displayOptions.show.resource).toEqual(['user'])
          expect(prop.displayOptions.show.operation).toEqual(['getUser'])
        }
      })
    })

    test('userId property should have description', () => {
      const properties = getUserOp.properties as any[]
      const userIdProp = properties.find((p) => p.name === 'userId')
      
      expect(userIdProp.description).toBeDefined()
      expect(userIdProp.description).toContain('ID')
    })

    test('simplify property should have description', () => {
      const properties = getUserOp.properties as any[]
      const simplifyProp = properties.find((p) => p.name === 'simplify')
      
      expect(simplifyProp.description).toBeDefined()
      expect(simplifyProp.description.toLowerCase()).toContain('simplified')
    })
  })

  describe('Operation Exports', () => {
    test('getUser should export properties and execute', () => {
      const operation = getUserOp
      
      expect(operation.properties).toBeDefined()
      expect(operation.execute).toBeDefined()
      expect(typeof operation.execute).toBe('function')
    })

    test('properties should be an array', () => {
      expect(Array.isArray(getUserOp.properties)).toBe(true)
      expect(getUserOp.properties.length).toBeGreaterThan(0)
    })

    test('all properties should have required fields', () => {
      const properties = getUserOp.properties as any[]
      
      properties.forEach((prop) => {
        expect(prop.displayName).toBeDefined()
        expect(prop.name).toBeDefined()
        expect(prop.type).toBeDefined()
        expect(prop).toHaveProperty('default')
      })
    })
  })

  describe('Property Structure Validation', () => {
    test('should have exactly 2 user-configurable properties', () => {
      const properties = getUserOp.properties as any[]
      const userConfigProps = properties.filter((p) => 
        !p.displayOptions?.hide && p.name !== 'resource' && p.name !== 'operation'
      )
      
      expect(userConfigProps.length).toBe(2)
    })

    test('property names should be valid identifiers', () => {
      const properties = getUserOp.properties as any[]
      const validNamePattern = /^[a-zA-Z][a-zA-Z0-9]*$/
      
      properties.forEach((prop) => {
        expect(validNamePattern.test(prop.name)).toBe(true)
      })
    })

    test('property types should be valid n8n types', () => {
      const properties = getUserOp.properties as any[]
      const validTypes = ['string', 'number', 'boolean', 'options', 'collection', 'fixedCollection', 'json']
      
      properties.forEach((prop) => {
        expect(validTypes).toContain(prop.type)
      })
    })
  })
})
