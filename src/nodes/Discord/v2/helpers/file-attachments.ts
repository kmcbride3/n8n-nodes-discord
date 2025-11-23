/**
 * Discord File Attachment Helpers - V2
 *
 * Provides utilities for handling file attachments in Discord operations.
 * Leverages Discord.js AttachmentBuilder for proper Discord API integration.
 *
 * **Design Principle**: Use Discord.js built-in capabilities wherever possible:
 * - Uses Discord.js AttachmentBuilder class for file handling
 * - Compatible with Discord.js channel.send(), WebhookClient.send(), etc.
 * - For REST API calls, AttachmentBuilder.attachment provides the buffer
 *
 * @module v2/helpers/file-attachments
 */

import { AttachmentBuilder } from 'discord.js'
import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Builds file attachments using Discord.js AttachmentBuilder
 *
 * This function leverages Discord.js built-in file handling capabilities:
 * - Returns AttachmentBuilder[] which can be passed directly to Discord.js methods
 * - Supports n8n binary data and URL inputs
 * - AttachmentBuilder handles file metadata (name, description) automatically
 *
 * @param context - The n8n execution context
 * @param itemIndex - The index of the current item being processed
 * @returns Array of Discord.js AttachmentBuilder objects
 *
 * @example
 * // For Discord.js client methods (preferred)
 * const files = await buildFileAttachments(this, 0);
 * await channel.send({ content: 'Message', files });
 *
 * @example
 * // For REST API calls (when Discord.js client unavailable)
 * const files = await buildFileAttachments(this, 0);
 * const buffers = files.map(f => f.attachment); // Extract buffers
 */
export async function buildFileAttachments(
  context: IExecuteFunctions,
  itemIndex: number,
): Promise<AttachmentBuilder[]> {
  const filesParam = context.getNodeParameter('files', itemIndex, { file: [] }) as {
    file?: Array<{
      inputType?: string
      url?: string
      binaryPropertyName?: string
      filename?: string
      description?: string
    }>
  }

  if (!filesParam.file || filesParam.file.length === 0) return []

  const attachments: AttachmentBuilder[] = []

  for (const [index, file] of filesParam.file.entries()) {
    try {
      const inputType = file.inputType || 'url'
      let attachment: Buffer | string
      let fileName: string

      if (inputType === 'binaryData') {
        // Get binary data from previous node
        const binaryPropertyName = file.binaryPropertyName || 'data'
        const binaryData = context.helpers.assertBinaryData(itemIndex, binaryPropertyName)
        const binaryDataBuffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName)

        attachment = binaryDataBuffer
        fileName = file.filename || binaryData.fileName || `file_${index}`
      } else if (inputType === 'url') {
        // Use URL directly
        if (!file.url) {
          throw new Error(`File ${index + 1}: URL is required when input type is URL`)
        }
        attachment = file.url
        fileName = file.filename || extractFilenameFromUrl(file.url) || `file_${index}`
      } else {
        throw new Error(`File ${index + 1}: Invalid input type "${inputType}"`)
      }

      const builder = new AttachmentBuilder(attachment, { name: fileName })
      
      if (file.description) {
        builder.setDescription(file.description)
      }

      attachments.push(builder)
    } catch (error) {
      throw new NodeOperationError(
        context.getNode(),
        `Failed to process file attachment ${index + 1}: ${error.message}`,
        { itemIndex },
      )
    }
  }

  return attachments
}

/**
 * Extracts filename from a URL
 *
 * @param url - The URL to extract filename from
 * @returns The extracted filename or undefined
 */
function extractFilenameFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const segments = pathname.split('/')
    const lastSegment = segments[segments.length - 1]
    return lastSegment || undefined
  } catch {
    return undefined
  }
}

/**
 * Returns n8n node properties for file attachment configuration
 *
 * Provides a standardized file attachment property definition that can be
 * reused across multiple Discord operations (send message, webhook, etc.).
 *
 * @returns Node property configuration for file attachments
 *
 * @example
 * const properties = [...otherProperties, getFileAttachmentProperty()]
 */
export function getFileAttachmentProperty(): INodeProperties {
  return {
    displayName: 'Files',
    name: 'files',
    placeholder: 'Add File',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    default: {},
    description: 'Files to attach to the message (images, documents, etc.)',
    options: [
      {
        name: 'file',
        displayName: 'File',
        values: [
          {
            displayName: 'Input Type',
            name: 'inputType',
            type: 'options',
            options: [
              {
                name: 'Binary Data',
                value: 'binaryData',
                description: 'Use file from previous node via binary data',
              },
              {
                name: 'URL',
                value: 'url',
                description: 'Provide a URL to the file',
              },
            ],
            default: 'url',
            description: 'How to provide the file',
          },
          {
            displayName: 'Binary Property',
            name: 'binaryPropertyName',
            type: 'string',
            default: 'data',
            required: true,
            displayOptions: {
              show: {
                inputType: ['binaryData'],
              },
            },
            description: 'Name of the binary property containing the file data',
            hint: 'The name of the binary property from a previous node (e.g., "data")',
          },
          {
            displayName: 'File URL',
            name: 'url',
            type: 'string',
            default: '',
            required: true,
            displayOptions: {
              show: {
                inputType: ['url'],
              },
            },
            placeholder: 'https://example.com/image.png',
            description: 'URL of the file to attach',
          },
          {
            displayName: 'Filename',
            name: 'filename',
            type: 'string',
            default: '',
            description: 'Custom filename for the attachment (optional, will be auto-detected if not provided)',
            placeholder: 'image.png',
          },
          {
            displayName: 'Description',
            name: 'description',
            type: 'string',
            default: '',
            description: 'Alt text description for the file (optional, useful for accessibility)',
            placeholder: 'Screenshot of the dashboard',
          },
        ],
      },
    ],
  }
}
