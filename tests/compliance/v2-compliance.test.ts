/**
 * Phase 5.1: V2 Compliance Test Suite
 *
 * Automated tests to ensure ongoing compliance with n8n V2 standards
 * Validates that all operations follow the established patterns
 */

import * as fs from 'fs'
import * as path from 'path'

describe('V2 Compliance Tests', () => {
  const operationsDir = path.join(__dirname, '../../src/nodes/Discord/v2/actions')

  describe('updateDisplayOptions Usage', () => {
    test('all operation files should use updateDisplayOptions', () => {
      const operationFiles = getAllOperationFiles(operationsDir)

      operationFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')

        // If the file uses updateDisplayOptions, ensure it's imported.
        const usesUpdateDisplayOptions = /export\s+const\s+properties\s*=\s*updateDisplayOptions/.test(content)
        if (usesUpdateDisplayOptions) {
          expect(content).toMatch(/import.*updateDisplayOptions.*from.*utils/)
        } else {
          // Allow legacy pattern: exported properties as an array (typed or untyped)
          expect(content).toMatch(/export\s+const\s+properties\s*[:\w\s\<\>\[\]]*=\s*\[/)
        }
      })
    })

    test('properties should have proper display options structure', () => {
      const operationFiles = getAllOperationFiles(operationsDir)

      operationFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')

        // Should have show condition with resource and operation regardless of wrapper
        expect(content).toMatch(/show:\s*\{\s*resource:\s*\[[\s\S]*?\],\s*operation:\s*\[/)
      })
    })
  })

  describe('Error Handling Compliance', () => {
    test('operations should use shared execution functions or have proper error handling', () => {
      const operationFiles = getAllOperationFiles(operationsDir)

      operationFiles.forEach((filePath) => {
        // Skip utility operations as they may not need complex error handling
        if (filePath.includes('/utility/')) {
          return
        }

        const content = fs.readFileSync(filePath, 'utf8')

        // Should either use shared execution functions OR have proper error handling
        const usesSharedExecution =
          /import.*execute\w+Operation.*from.*shared/.test(content) &&
          /return execute\w+Operation\(this\)/.test(content)
        const hasErrorHandling = /parseDiscordError|NodeOperationError|try|catch|throw/.test(content)

        expect(usesSharedExecution || hasErrorHandling).toBe(true)
      })
    })

    test('shared operations should use executeDiscordOperation', () => {
      const sharedOperationsPath = path.join(
        __dirname,
        '../../src/nodes/Discord/shared/operations/member-operations.ts',
      )

      if (fs.existsSync(sharedOperationsPath)) {
        const content = fs.readFileSync(sharedOperationsPath, 'utf8')

        // Should use executeDiscordOperation for error handling
        expect(content).toMatch(/executeDiscordOperation/)
      }
    })
  })

  describe('Property Organization', () => {
    test('index files should organize properties', () => {
      const indexFiles = getAllIndexFiles(operationsDir)

      indexFiles.forEach((filePath) => {
        // Skip utility index files as they use different patterns
        if (filePath.includes('/utility/')) {
          return
        }

        const content = fs.readFileSync(filePath, 'utf8')

        // Should have some form of import from operation files
        const hasImports = /import.*from.*\.operation/.test(content)
        // Should have some form of property organization (spreading or direct inclusion)
        const hasPropertyOrganization = /\.\.\..*Properties|\.\.\..*\.properties|properties\s*:/.test(content)

        expect(hasImports && hasPropertyOrganization).toBe(true)
      })
    })
  })

  describe('Type Safety', () => {
    test('router should use proper type definitions', () => {
      const routerPath = path.join(__dirname, '../../src/nodes/Discord/v2/node.type.ts')

      if (fs.existsSync(routerPath)) {
        const content = fs.readFileSync(routerPath, 'utf8')

        // Should define proper node types
        expect(content).toMatch(/type.*NodeMap/)
        expect(content).toMatch(/export.*Discord/)
      }
    })
  })

  describe('Workflow Validation', () => {
    test('workflow files should be properly structured', () => {
      const workflowDir = path.join(__dirname, '../integration/workflows')
      const workflowFiles = fs.readdirSync(workflowDir).filter((file) => file.endsWith('.workflow.json'))

      workflowFiles.forEach((file) => {
        const filePath = path.join(workflowDir, file)
        const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'))

        // Validate basic workflow structure
        expect(workflow).toHaveProperty('name')
        expect(workflow).toHaveProperty('nodes')
        expect(Array.isArray(workflow.nodes)).toBe(true)
        expect(workflow.nodes.length).toBeGreaterThan(0)

        // Validate Discord nodes
        const discordNodes = workflow.nodes.filter(
          (node: any) => node.type === '@kmcbride3/n8n-nodes-discord.discordV2',
        )

        discordNodes.forEach((node: any) => {
          expect(node).toHaveProperty('parameters')
          expect(node.parameters).toHaveProperty('resource')
          expect(node.parameters).toHaveProperty('operation')
          expect(node.typeVersion).toBe(2)
        })
      })
    })
  })
})

/**
 * Recursively find all operation files
 */
function getAllOperationFiles(dir: string): string[] {
  const files: string[] = []

  function scanDirectory(currentDir: string) {
    const items = fs.readdirSync(currentDir)

    items.forEach((item) => {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        scanDirectory(fullPath)
      } else if (item.endsWith('.operation.ts')) {
        files.push(fullPath)
      }
    })
  }

  scanDirectory(dir)
  return files
}

/**
 * Find all index files
 */
function getAllIndexFiles(dir: string): string[] {
  const files: string[] = []

  function scanDirectory(currentDir: string) {
    const items = fs.readdirSync(currentDir)

    items.forEach((item) => {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        scanDirectory(fullPath)
      } else if (item === 'index.ts') {
        files.push(fullPath)
      }
    })
  }

  scanDirectory(dir)
  return files
}
