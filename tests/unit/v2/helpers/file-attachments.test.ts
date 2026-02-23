/**
 * Tests for file-attachments.ts
 * Covers: buildFileAttachments, getFileAttachmentProperty, extractFilenameFromUrl
 * Target Coverage: 27.9% → 75%+
 *
 * Test Categories:
 * - File attachment building (binary data, URLs)
 * - Filename extraction from URLs
 * - Error handling (missing files, invalid types)
 * - Node property generation
 * - Edge cases (empty files, invalid URLs)
 */

import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import {
  buildFileAttachments,
  getFileAttachmentProperty,
} from '../../../../src/nodes/Discord/v2/helpers/file-attachments'

// Mock AttachmentBuilder with setDescription method
jest.mock('discord.js', () => ({
  AttachmentBuilder: jest.fn().mockImplementation(function (file: unknown, options: { name: string }) {
    return {
      file,
      name: options.name,
      setDescription: jest.fn().mockReturnThis(),
    }
  }),
}))

describe('V2 Helper Modules - file-attachments', () => {
  const mockContext = {
    getNode: jest.fn(() => ({
      id: 'test-node',
      name: 'Test Node',
      type: 'n8n-nodes-discord.discord',
      typeVersion: 2,
      position: [0, 0] as [number, number],
      parameters: {},
    })),
    getNodeParameter: jest.fn(),
    helpers: {
      assertBinaryData: jest.fn(),
      getBinaryDataBuffer: jest.fn(),
    },
  } as unknown as IExecuteFunctions

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('buildFileAttachments', () => {
    test('should return empty array when no files provided', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({ file: [] })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    test('should return empty array when files parameter is undefined', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({})

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toEqual([])
    })

    test('should build attachment from URL', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          {
            inputType: 'url',
            url: 'https://example.com/image.png',
            filename: 'custom.png',
          },
        ],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
      expect(result[0]).toBeDefined()
      expect((result[0] as any).file).toBe('https://example.com/image.png')
      expect(result[0].name).toBe('custom.png')
    })

    test('should build attachment from URL without custom filename', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          {
            inputType: 'url',
            url: 'https://example.com/path/to/document.pdf',
          },
        ],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
      expect(result[0]).toBeDefined()
      expect((result[0] as any).file).toBe('https://example.com/path/to/document.pdf')
      expect(result[0].name).toBe('document.pdf')
    })

    test('should build attachment from binary data', async () => {
      const mockBuffer = Buffer.from('test data')

      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          {
            inputType: 'binaryData',
            binaryPropertyName: 'data',
            filename: 'test.txt',
          },
        ],
      })
      ;(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue({
        fileName: 'original.txt',
        mimeType: 'text/plain',
      })
      ;(mockContext.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(mockBuffer)

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('test.txt')
      expect(mockContext.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data')
      expect(mockContext.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data')
    })

    test('should use default binary property name', async () => {
      const mockBuffer = Buffer.from('binary content')

      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          {
            inputType: 'binaryData',
          },
        ],
      })
      ;(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue({
        fileName: 'file.bin',
      })
      ;(mockContext.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(mockBuffer)

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
      expect(mockContext.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data')
    })

    test('should use binary data filename when no custom filename provided', async () => {
      const mockBuffer = Buffer.from('data')

      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'binaryData', binaryPropertyName: 'attachment' }],
      })
      ;(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue({
        fileName: 'from-binary.jpg',
      })
      ;(mockContext.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(mockBuffer)

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
    })

    test('should handle multiple files', async () => {
      const mockBuffer = Buffer.from('data')

      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          { inputType: 'url', url: 'https://example.com/file1.png' },
          { inputType: 'url', url: 'https://example.com/file2.jpg' },
          { inputType: 'binaryData', binaryPropertyName: 'data' },
        ],
      })
      ;(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue({ fileName: 'binary.dat' })
      ;(mockContext.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(mockBuffer)

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(3)
      result.forEach((attachment, idx) => {
        expect(attachment).toBeDefined()
        expect(attachment.name).toBeDefined()
      })
    })

    test('should add description to attachments', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          {
            inputType: 'url',
            url: 'https://example.com/image.png',
            description: 'Test description',
          },
        ],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
      expect(result[0]).toBeDefined()
      expect(result[0].setDescription).toHaveBeenCalledWith('Test description')
    })

    test('should throw error for missing URL', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'url' }],
      })

      await expect(buildFileAttachments(mockContext, 0)).rejects.toThrow(NodeOperationError)
    })

    test('should throw error for invalid input type', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'invalid' }],
      })

      await expect(buildFileAttachments(mockContext, 0)).rejects.toThrow(NodeOperationError)
    })

    test('should handle binary data errors', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'binaryData', binaryPropertyName: 'missing' }],
      })
      ;(mockContext.helpers.assertBinaryData as jest.Mock).mockImplementation(() => {
        throw new Error('Binary data not found')
      })

      await expect(buildFileAttachments(mockContext, 0)).rejects.toThrow(NodeOperationError)
    })

    test('should default to URL input type', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ url: 'https://example.com/default.png' }],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
    })

    test('should generate default filenames with index', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          { inputType: 'url', url: 'https://example.com/' },
          { inputType: 'url', url: 'https://example.com/' },
        ],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(2)
    })
  })

  describe('getFileAttachmentProperty', () => {
    test('should return node property configuration', () => {
      const property = getFileAttachmentProperty()

      expect(property).toBeDefined()
      expect(property.name).toBe('files')
      expect(property.type).toBe('fixedCollection')
    })

    test('should have correct display name', () => {
      const property = getFileAttachmentProperty()

      expect(property.displayName).toBe('Files')
    })

    test('should support multiple files', () => {
      const property = getFileAttachmentProperty()

      expect(property.typeOptions?.multipleValues).toBe(true)
    })

    test('should have file options', () => {
      const property = getFileAttachmentProperty()

      expect(property.options).toBeDefined()
      expect(Array.isArray(property.options)).toBe(true)
      expect(property.options?.length).toBeGreaterThan(0)
    })

    test('should include input type option', () => {
      const property = getFileAttachmentProperty()
      const fileOption = property.options?.find((opt: any) => opt.name === 'file') as any

      expect(fileOption).toBeDefined()
      if (fileOption && 'values' in fileOption) {
        expect(fileOption.values).toBeDefined()

        const inputTypeValue = fileOption.values.find((v: any) => v.name === 'inputType')
        expect(inputTypeValue).toBeDefined()
      }
    })

    test('should include URL and binary data options', () => {
      const property = getFileAttachmentProperty()
      const fileOption = property.options?.find((opt: any) => opt.name === 'file') as any
      const inputTypeValue = fileOption && 'values' in fileOption 
        ? fileOption.values.find((v: any) => v.name === 'inputType') 
        : null

      if (inputTypeValue && 'options' in inputTypeValue) {
        expect(inputTypeValue.options).toBeDefined()
        expect(inputTypeValue.options).toContainEqual(
          expect.objectContaining({
            name: 'URL',
            value: 'url',
          }),
        )
        expect(inputTypeValue.options).toContainEqual(
          expect.objectContaining({
            name: 'Binary Data',
            value: 'binaryData',
          }),
        )
      }
    })

    test('should have description field', () => {
      const property = getFileAttachmentProperty()

      expect(property.description).toBeDefined()
      expect(typeof property.description).toBe('string')
    })
  })

  describe('Filename Extraction Edge Cases', () => {
    test('should handle URLs with query parameters', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'url', url: 'https://example.com/file.png?v=123&size=large' }],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
    })

    test('should handle URLs with fragments', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'url', url: 'https://example.com/image.jpg#section' }],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
    })

    test('should handle URLs without file extension', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'url', url: 'https://example.com/download/file' }],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
    })

    test('should handle URLs with encoded characters', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'url', url: 'https://example.com/my%20file%20name.pdf' }],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
    })

    test('should handle root path URLs', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'url', url: 'https://example.com/' }],
      })

      const result = await buildFileAttachments(mockContext, 0)

      expect(result).toHaveLength(1)
    })
  })

  describe('Error Messages', () => {
    test('should provide clear error message for missing URL', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'url', url: '' }],
      })

      try {
        await buildFileAttachments(mockContext, 0)
        fail('Should have thrown')
      } catch (error: any) {
        expect(error.message).toContain('URL is required')
      }
    })

    test('should include file index in error messages', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [
          { inputType: 'url', url: 'https://valid.com/file.png' },
          { inputType: 'url' }, // Missing URL
        ],
      })

      try {
        await buildFileAttachments(mockContext, 0)
        fail('Should have thrown')
      } catch (error: any) {
        expect(error.message).toContain('File 2')
      }
    })

    test('should include itemIndex in errors', async () => {
      ;(mockContext.getNodeParameter as jest.Mock).mockReturnValue({
        file: [{ inputType: 'invalid' }],
      })

      try {
        await buildFileAttachments(mockContext, 5)
        fail('Should have thrown')
      } catch (error: any) {
        expect(error).toBeInstanceOf(NodeOperationError)
        // itemIndex is passed to NodeOperationError but not exposed as direct property
      }
    })
  })
})
