import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { buildEnhancedEmbed, EMBED_LIMITS } from '../../../../src/nodes/Discord/v2/helpers/embedBuilder'
import { createMockExecuteFunctions } from '../../../helpers/executeFunctionsMock'

// Helper to create mock context with parameter map
function createMockContextWithParams(params: Record<string, unknown>): IExecuteFunctions {
  return createMockExecuteFunctions({
    getNodeParameter: jest.fn((param: string, itemIndex: number, defaultValue?: unknown) => {
      return params[param] ?? defaultValue ?? ''
    }) as unknown as IExecuteFunctions['getNodeParameter'],
  })
}

describe('Embed Builder', () => {
  let mockContext: IExecuteFunctions

  beforeEach(() => {
    jest.clearAllMocks()
    mockContext = createMockContextWithParams({ embed: false })
  })

  describe('Basic Embed Creation', () => {
    test('should return undefined when embed is disabled', () => {
      const result = buildEnhancedEmbed(mockContext, 0)
      expect(result).toBeUndefined()
    })

    test('should create embed with title and description', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test Title',
        embedDescription: 'Test Description',
        embedColor: '#0099ff',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result).toBeDefined()
      expect(result?.title).toBe('Test Title')
      expect(result?.description).toBe('Test Description')
      expect(result?.color).toBe(0x0099ff)
    })

    test('should create embed with URL', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedUrl: 'https://example.com',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result).toBeDefined()
      expect(result?.url).toBe('https://example.com')
    })

    test('should return undefined for completely empty embed', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)
      expect(result).toBeUndefined()
    })
  })

  describe('Author Section', () => {
    test('should add author with name only', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedAuthorName: 'Author Name',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.author).toBeDefined()
      expect((result?.author as { name: string }).name).toBe('Author Name')
    })

    test('should add author with icon URL', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedAuthorName: 'Author Name',
        embedAuthorIcon: 'https://example.com/icon.png',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      const author = result?.author as { name: string; icon_url?: string }
      expect(author.icon_url).toBe('https://example.com/icon.png')
    })

    test('should add author with base64 icon', () => {
      const base64Icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedAuthorName: 'Author Name',
        embedAuthorIcon: base64Icon,
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      const author = result?.author as { name: string; icon_url?: string }
      expect(author.icon_url).toBe(base64Icon)
    })
  })

  describe('Images', () => {
    test('should add thumbnail URL', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedThumbnail: 'https://example.com/thumbnail.png',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.thumbnail).toBeDefined()
      expect((result?.thumbnail as { url: string }).url).toBe('https://example.com/thumbnail.png')
    })

    test('should add main image URL', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedImage: 'https://example.com/image.png',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.image).toBeDefined()
      expect((result?.image as { url: string }).url).toBe('https://example.com/image.png')
    })

    test('should support base64 thumbnail', () => {
      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedThumbnail: base64Image,
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.thumbnail).toBeDefined()
      expect((result?.thumbnail as { url: string }).url).toBe(base64Image)
    })
  })

  describe('Footer Section', () => {
    test('should add footer with text', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedFooterText: 'Footer Text',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.footer).toBeDefined()
      expect((result?.footer as { text: string }).text).toBe('Footer Text')
    })

    test('should add footer with icon', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedFooterText: 'Footer Text',
        embedFooterIcon: 'https://example.com/icon.png',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      const footer = result?.footer as { text: string; icon_url?: string }
      expect(footer.icon_url).toBe('https://example.com/icon.png')
    })
  })

  describe('Timestamp', () => {
    test('should not add timestamp when option is none', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.timestamp).toBeUndefined()
    })

    test('should add current timestamp', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'current',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.timestamp).toBeDefined()
    })

    test('should add custom timestamp', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'custom',
        embedCustomTimestamp: '2023-01-01T00:00:00.000Z',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.timestamp).toBe('2023-01-01T00:00:00.000Z')
    })
  })

  describe('Fields', () => {
    test('should add single field', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'none',
        embedFields: {
          field: [{ name: 'Field 1', value: 'Value 1', inline: false }],
        },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.fields).toBeDefined()
      expect(Array.isArray(result?.fields)).toBe(true)
      expect((result?.fields as Array<{ name: string; value: string }>).length).toBe(1)
      expect((result?.fields as Array<{ name: string; value: string }>)[0].name).toBe('Field 1')
    })

    test('should add multiple inline fields', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'none',
        embedFields: {
          field: [
            { name: 'Field 1', value: 'Value 1', inline: true },
            { name: 'Field 2', value: 'Value 2', inline: true },
            { name: 'Field 3', value: 'Value 3', inline: true },
          ],
        },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect((result?.fields as Array<{ inline: boolean }>).length).toBe(3)
      expect((result?.fields as Array<{ inline: boolean }>).every((f) => f.inline)).toBe(true)
    })

    test('should handle empty fields for spacing', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'none',
        embedFields: {
          field: [
            { name: 'Field 1', value: 'Value 1', inline: false },
            { name: '', value: '', inline: false }, // Empty field
            { name: 'Field 2', value: 'Value 2', inline: false },
          ],
        },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      // Empty fields should be filtered out
      expect((result?.fields as Array<unknown>).length).toBe(2)
    })
  })

  describe('Video Support', () => {
    test('should add video URL', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedVideoUrl: 'https://example.com/video.mp4',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result?.video).toBeDefined()
      expect((result?.video as { url: string }).url).toBe('https://example.com/video.mp4')
    })
  })

  describe('Validation', () => {
    test('should throw error for invalid URL', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedUrl: 'not-a-valid-url',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(NodeOperationError)
      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(/Embed URL must be/)
    })

    test('should throw error for invalid base64 image format', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedThumbnail: 'data:invalid/format',
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(NodeOperationError)
      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(/Invalid base64 image format/)
    })

    test('should throw error for too many fields', () => {
      const fields = Array.from({ length: 26 }, (_, i) => ({
        name: `Field ${i + 1}`,
        value: `Value ${i + 1}`,
        inline: false,
      }))

      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'none',
        embedFields: { field: fields },
      })

      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(NodeOperationError)
      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(/Too many fields/)
    })

    test('should throw error for title exceeding limit', () => {
      const longTitle = 'A'.repeat(EMBED_LIMITS.TITLE + 1)

      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: longTitle,
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(NodeOperationError)
      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(/Title exceeds/)
    })

    test('should throw error for description exceeding limit', () => {
      const longDescription = 'A'.repeat(EMBED_LIMITS.DESCRIPTION + 1)

      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedDescription: longDescription,
        embedTimestampOption: 'none',
        embedFields: { field: [] },
      })

      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(NodeOperationError)
      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(/Description exceeds/)
    })

    test('should throw error for invalid timestamp format', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Test',
        embedTimestampOption: 'custom',
        embedCustomTimestamp: 'invalid-date',
        embedFields: { field: [] },
      })

      expect(() => buildEnhancedEmbed(mockContext, 0)).toThrow(NodeOperationError)
    })
  })

  describe('Complete Embed', () => {
    test('should create complete embed with all fields', () => {
      mockContext = createMockContextWithParams({
        embed: true,
        embedTitle: 'Complete Embed',
        embedDescription: 'This is a complete embed with all fields',
        embedUrl: 'https://example.com',
        embedColor: '#ff0000',
        embedAuthorName: 'Author Name',
        embedAuthorIcon: 'https://example.com/author.png',
        embedAuthorUrl: 'https://example.com/author',
        embedThumbnail: 'https://example.com/thumbnail.png',
        embedImage: 'https://example.com/image.png',
        embedFooterText: 'Footer Text',
        embedFooterIcon: 'https://example.com/footer.png',
        embedTimestampOption: 'current',
        embedFields: {
          field: [
            { name: 'Field 1', value: 'Value 1', inline: true },
            { name: 'Field 2', value: 'Value 2', inline: true },
          ],
        },
      })

      const result = buildEnhancedEmbed(mockContext, 0)

      expect(result).toBeDefined()
      expect(result?.title).toBe('Complete Embed')
      expect(result?.description).toBe('This is a complete embed with all fields')
      expect(result?.url).toBe('https://example.com')
      expect(result?.color).toBe(0xff0000)
      expect(result?.author).toBeDefined()
      expect(result?.thumbnail).toBeDefined()
      expect(result?.image).toBeDefined()
      expect(result?.footer).toBeDefined()
      expect(result?.timestamp).toBeDefined()
      expect(result?.fields).toBeDefined()
      expect((result?.fields as Array<unknown>).length).toBe(2)
    })
  })
})
