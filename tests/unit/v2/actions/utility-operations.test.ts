/**
 * V2 Utility Operations Testing
 *
 * Comprehensive testing of utility operations:
 * - interactionManager: Manage Discord interaction collectors and state
 * - utility: Perform utility actions on Discord bot
 *
 * Tests cover:
 * - Property definitions and structure
 * - Sub-operation options validation
 * - Conditional field display
 * - Operation exports
 *
 * Target: 60%+ coverage for utility operations
 */

// Mock helpers before importing operations
jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((conditions, properties) => properties),
}))

import * as interactionManagerOp from '../../../../src/nodes/Discord/v2/actions/utility/interactionManager.operation'
import * as utilityOp from '../../../../src/nodes/Discord/v2/actions/utility/utility.operation'

describe('V2 Utility Operations', () => {
  describe('interactionManager Operation', () => {
    test('should have correct properties', () => {
      expect(interactionManagerOp.properties).toBeDefined()
      expect(Array.isArray(interactionManagerOp.properties)).toBe(true)
    })

    test('should have subOperation field with options', () => {
      const properties = interactionManagerOp.properties as any[]
      const subOpProp = properties.find((p) => p.name === 'subOperation')
      
      expect(subOpProp).toBeDefined()
      expect(subOpProp.type).toBe('options')
      expect(Array.isArray(subOpProp.options)).toBe(true)
      expect(subOpProp.options.length).toBeGreaterThan(0)
    })

    test('should have all interaction manager sub-operations', () => {
      const properties = interactionManagerOp.properties as any[]
      const subOpProp = properties.find((p) => p.name === 'subOperation')
      
      const operationValues = subOpProp.options.map((opt: any) => opt.value)
      expect(operationValues).toContain('getPending')
      expect(operationValues).toContain('getStats')
      expect(operationValues).toContain('getCollectors')
      expect(operationValues).toContain('cleanup')
    })

    test('should have default sub-operation', () => {
      const properties = interactionManagerOp.properties as any[]
      const subOpProp = properties.find((p) => p.name === 'subOperation')
      
      expect(subOpProp.default).toBe('getPending')
    })

    test('should have workflowIdFilter for getPending operation', () => {
      const properties = interactionManagerOp.properties as any[]
      const filterProp = properties.find((p) => p.name === 'workflowIdFilter')
      
      expect(filterProp).toBeDefined()
      expect(filterProp.type).toBe('string')
      expect(filterProp.displayOptions?.show?.subOperation).toEqual(['getPending'])
    })

    test('should have maxAgeMinutes for cleanup operation', () => {
      const properties = interactionManagerOp.properties as any[]
      const maxAgeProp = properties.find((p) => p.name === 'maxAgeMinutes')
      
      expect(maxAgeProp).toBeDefined()
      expect(maxAgeProp.type).toBe('number')
      expect(maxAgeProp.default).toBe(5)
      expect(maxAgeProp.displayOptions?.show?.subOperation).toEqual(['cleanup'])
    })

    test('should have execute function', () => {
      expect(interactionManagerOp.execute).toBeDefined()
      expect(typeof interactionManagerOp.execute).toBe('function')
    })

    test('all sub-operations should have descriptions', () => {
      const properties = interactionManagerOp.properties as any[]
      const subOpProp = properties.find((p) => p.name === 'subOperation')
      
      subOpProp.options.forEach((opt: any) => {
        expect(opt.name).toBeDefined()
        expect(opt.value).toBeDefined()
        expect(opt.description).toBeDefined()
      })
    })
  })

  describe('utility Operation', () => {
    test('should have correct properties', () => {
      expect(utilityOp.properties).toBeDefined()
      expect(Array.isArray(utilityOp.properties)).toBe(true)
    })

    test('should have utilityAction field with options', () => {
      const properties = utilityOp.properties as any[]
      const actionProp = properties.find((p) => p.name === 'utilityAction')
      
      expect(actionProp).toBeDefined()
      expect(actionProp.type).toBe('options')
      expect(Array.isArray(actionProp.options)).toBe(true)
    })

    test('should have clearPlaceholder and updateStatus actions', () => {
      const properties = utilityOp.properties as any[]
      const actionProp = properties.find((p) => p.name === 'utilityAction')
      
      const actionValues = actionProp.options.map((opt: any) => opt.value)
      expect(actionValues).toContain('clearPlaceholder')
      expect(actionValues).toContain('updateStatus')
    })

    test('should have default utility action', () => {
      const properties = utilityOp.properties as any[]
      const actionProp = properties.find((p) => p.name === 'utilityAction')
      
      expect(actionProp.default).toBe('clearPlaceholder')
    })

    test('should have execute function', () => {
      expect(utilityOp.execute).toBeDefined()
      expect(typeof utilityOp.execute).toBe('function')
    })

    test('all actions should have descriptions', () => {
      const properties = utilityOp.properties as any[]
      const actionProp = properties.find((p) => p.name === 'utilityAction')
      
      actionProp.options.forEach((opt: any) => {
        expect(opt.name).toBeDefined()
        expect(opt.value).toBeDefined()
        expect(opt.description).toBeDefined()
      })
    })
  })

  describe('Operation Exports', () => {
    test('interactionManager should export properties and execute', () => {
      expect(interactionManagerOp.properties).toBeDefined()
      expect(interactionManagerOp.execute).toBeDefined()
      expect(typeof interactionManagerOp.execute).toBe('function')
    })

    test('utility should export properties and execute', () => {
      expect(utilityOp.properties).toBeDefined()
      expect(utilityOp.execute).toBeDefined()
      expect(typeof utilityOp.execute).toBe('function')
    })

    test('all operations should export properties as arrays', () => {
      expect(Array.isArray(interactionManagerOp.properties)).toBe(true)
      expect(Array.isArray(utilityOp.properties)).toBe(true)
    })
  })

  describe('Display Options Validation', () => {
    test('interactionManager should show for correct resource/operation', () => {
      const properties = interactionManagerOp.properties as any[]
      
      properties.forEach((prop) => {
        if (prop.displayOptions?.show && !prop.displayOptions.show.subOperation) {
          expect(prop.displayOptions.show.resource).toEqual(['utility'])
          expect(prop.displayOptions.show.operation).toEqual(['interactionManager'])
        }
      })
    })

    test('utility should show for correct resource/operation', () => {
      const properties = utilityOp.properties as any[]
      
      properties.forEach((prop) => {
        if (prop.displayOptions?.show) {
          expect(prop.displayOptions.show.resource).toEqual(['utility'])
          expect(prop.displayOptions.show.operation).toEqual(['utility'])
        }
      })
    })
  })

  describe('Property Structure Validation', () => {
    test('all properties should have required fields', () => {
      const operations = [interactionManagerOp, utilityOp]
      
      operations.forEach((op) => {
        const properties = op.properties as any[]
        properties.forEach((prop) => {
          expect(prop.displayName).toBeDefined()
          expect(prop.name).toBeDefined()
          expect(prop.type).toBeDefined()
          expect(prop).toHaveProperty('default')
        })
      })
    })

    test('property names should be valid identifiers', () => {
      const operations = [interactionManagerOp, utilityOp]
      const validNamePattern = /^[a-zA-Z][a-zA-Z0-9]*$/
      
      operations.forEach((op) => {
        const properties = op.properties as any[]
        properties.forEach((prop) => {
          expect(validNamePattern.test(prop.name)).toBe(true)
        })
      })
    })

    test('conditional fields should have displayOptions', () => {
      const properties = interactionManagerOp.properties as any[]
      const conditionalFields = ['workflowIdFilter', 'maxAgeMinutes']
      
      conditionalFields.forEach((fieldName) => {
        const field = properties.find((p) => p.name === fieldName)
        expect(field).toBeDefined()
        expect(field.displayOptions).toBeDefined()
        expect(field.displayOptions.show).toBeDefined()
      })
    })
  })

  describe('Sub-operation Validation', () => {
    test('interactionManager sub-operations should be properly configured', () => {
      const properties = interactionManagerOp.properties as any[]
      const subOpProp = properties.find((p) => p.name === 'subOperation')
      
      const expectedOps = ['getPending', 'getStats', 'getCollectors', 'cleanup']
      const actualOps = subOpProp.options.map((opt: any) => opt.value)
      
      expectedOps.forEach((op) => {
        expect(actualOps).toContain(op)
      })
    })

    test('utility actions should be properly configured', () => {
      const properties = utilityOp.properties as any[]
      const actionProp = properties.find((p) => p.name === 'utilityAction')
      
      const expectedActions = ['clearPlaceholder', 'updateStatus']
      const actualActions = actionProp.options.map((opt: any) => opt.value)
      
      expectedActions.forEach((action) => {
        expect(actualActions).toContain(action)
      })
    })
  })
})
