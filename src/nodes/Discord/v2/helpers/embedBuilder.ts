/**
 * Enhanced Discord Embed Builder - V2
 *
 * Comprehensive embed builder with full Discord.js EmbedBuilder feature support.
 * Includes base64 image handling, video support, and provider information.
 *
 * @module v2/helpers/embedBuilder
 */

import { EmbedBuilder } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { validateColorHex } from '../../shared/validation/simple-validation'

/**
 * Maximum Discord embed limits (enforced by Discord API)
 */
export const EMBED_LIMITS = {
  TITLE: 256,
  DESCRIPTION: 4096,
  FIELDS: 25,
  FIELD_NAME: 256,
  FIELD_VALUE: 1024,
  FOOTER_TEXT: 2048,
  AUTHOR_NAME: 256,
  TOTAL_CHARACTERS: 6000,
} as const

/**
 * Validates if a string is a valid base64 data URI
 *
 * @param dataUri - String to validate
 * @returns True if valid base64 data URI, false otherwise
 */
function isValidBase64DataUri(dataUri: string): boolean {
  if (!dataUri.startsWith('data:')) return false
  const regex = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/i
  return regex.test(dataUri)
}

/**
 * Validates if a string is a valid URL
 *
 * @param url - String to validate
 * @returns True if valid URL, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Processes image input (URL or base64) and returns valid Discord image URL
 *
 * @param input - URL or base64 data URI
 * @param fieldName - Name of the field for error messages
 * @returns Valid image URL or base64 data URI
 * @throws NodeOperationError if input is invalid
 */
function processImageInput(input: string, fieldName: string): string {
  if (!input) return ''

  // Check if it's a base64 data URI
  if (input.startsWith('data:')) {
    if (!isValidBase64DataUri(input)) {
      throw new Error(
        `Invalid base64 image format for ${fieldName}. Must be data:image/(png|jpg|jpeg|gif|webp);base64,...`,
      )
    }
    return input
  }

  // Check if it's a valid URL
  if (!isValidUrl(input)) {
    throw new Error(`Invalid URL for ${fieldName}. Must be a valid http/https URL or base64 data URI.`)
  }

  return input
}

/**
 * Validates embed content against Discord limits
 *
 * @param embed - Embed data object to validate
 * @throws NodeOperationError if any limits are exceeded
 */
function validateEmbedLimits(embed: IDataObject): void {
  const errors: string[] = []

  if (embed.title && (embed.title as string).length > EMBED_LIMITS.TITLE) {
    errors.push(`Title exceeds ${EMBED_LIMITS.TITLE} characters`)
  }

  if (embed.description && (embed.description as string).length > EMBED_LIMITS.DESCRIPTION) {
    errors.push(`Description exceeds ${EMBED_LIMITS.DESCRIPTION} characters`)
  }

  if (embed.fields && Array.isArray(embed.fields)) {
    if (embed.fields.length > EMBED_LIMITS.FIELDS) {
      errors.push(`Too many fields (max ${EMBED_LIMITS.FIELDS})`)
    }

    embed.fields.forEach((field: IDataObject, index: number) => {
      if (field.name && (field.name as string).length > EMBED_LIMITS.FIELD_NAME) {
        errors.push(`Field ${index + 1} name exceeds ${EMBED_LIMITS.FIELD_NAME} characters`)
      }
      if (field.value && (field.value as string).length > EMBED_LIMITS.FIELD_VALUE) {
        errors.push(`Field ${index + 1} value exceeds ${EMBED_LIMITS.FIELD_VALUE} characters`)
      }
    })
  }

  if (embed.footer && typeof embed.footer === 'object') {
    const footer = embed.footer as IDataObject
    if (footer.text && (footer.text as string).length > EMBED_LIMITS.FOOTER_TEXT) {
      errors.push(`Footer text exceeds ${EMBED_LIMITS.FOOTER_TEXT} characters`)
    }
  }

  if (embed.author && typeof embed.author === 'object') {
    const author = embed.author as IDataObject
    if (author.name && (author.name as string).length > EMBED_LIMITS.AUTHOR_NAME) {
      errors.push(`Author name exceeds ${EMBED_LIMITS.AUTHOR_NAME} characters`)
    }
  }

  // Calculate total character count
  let totalChars = 0
  if (embed.title) totalChars += (embed.title as string).length
  if (embed.description) totalChars += (embed.description as string).length
  if (embed.footer && typeof embed.footer === 'object') {
    totalChars += ((embed.footer as IDataObject).text as string)?.length || 0
  }
  if (embed.author && typeof embed.author === 'object') {
    totalChars += ((embed.author as IDataObject).name as string)?.length || 0
  }
  if (embed.fields && Array.isArray(embed.fields)) {
    embed.fields.forEach((field: IDataObject) => {
      totalChars += ((field.name as string)?.length || 0) + ((field.value as string)?.length || 0)
    })
  }

  if (totalChars > EMBED_LIMITS.TOTAL_CHARACTERS) {
    errors.push(`Total embed characters (${totalChars}) exceeds Discord limit of ${EMBED_LIMITS.TOTAL_CHARACTERS}`)
  }

  if (errors.length > 0) {
    throw new Error(`Embed validation failed:\n- ${errors.join('\n- ')}`)
  }
}

/**
 * Enhanced embed builder with full Discord.js EmbedBuilder feature support
 *
 * Supports all Discord embed features including:
 * - Title, description, URL, color
 * - Author (name, icon, URL)
 * - Thumbnail and main image (URL or base64)
 * - Fields (up to 25, with inline support)
 * - Footer (text and icon)
 * - Timestamp (custom or automatic)
 * - Video (URL for video embeds)
 *
 * Features:
 * - Base64 image support for all image fields
 * - Automatic validation against Discord limits
 * - Type-safe using Discord.js EmbedBuilder
 * - Error handling with helpful messages
 *
 * @param context - The n8n execution context
 * @param itemIndex - The index of the current item being processed
 * @returns Embed JSON object ready for Discord API, or undefined if not enabled/empty
 * @throws NodeOperationError if validation fails or image processing fails
 *
 * @example
 * const embed = buildEnhancedEmbed(this, 0);
 * if (embed) {
 *   await sendMessage(channelId, { embeds: [embed] });
 * }
 */
export function buildEnhancedEmbed(context: IExecuteFunctions, itemIndex: number): IDataObject | undefined {
  const embedEnabled = context.getNodeParameter('embed', itemIndex, false) as boolean
  if (!embedEnabled) return undefined

  try {
    const embedBuilder = new EmbedBuilder()

    // Basic content
    const title = context.getNodeParameter('embedTitle', itemIndex, '') as string
    const description = context.getNodeParameter('embedDescription', itemIndex, '') as string
    const url = context.getNodeParameter('embedUrl', itemIndex, '') as string
    const color = context.getNodeParameter('embedColor', itemIndex, '#0099ff') as string

    if (title) embedBuilder.setTitle(title)
    if (description) embedBuilder.setDescription(description)
    if (url) {
      if (!isValidUrl(url)) {
        throw new Error('Embed URL must be a valid http/https URL')
      }
      embedBuilder.setURL(url)
    }
    if (color) {
      const colorValue = validateColorHex(color, context.getNode(), true)
      embedBuilder.setColor(colorValue)
    }

    // Author section
    const authorName = context.getNodeParameter('embedAuthorName', itemIndex, '') as string
    if (authorName) {
      const authorIconUrl = context.getNodeParameter('embedAuthorIcon', itemIndex, '') as string
      const authorUrl = context.getNodeParameter('embedAuthorUrl', itemIndex, '') as string

      const authorData: { name: string; iconURL?: string; url?: string } = { name: authorName }
      if (authorIconUrl) authorData.iconURL = processImageInput(authorIconUrl, 'Author Icon')
      if (authorUrl) {
        if (!isValidUrl(authorUrl)) {
          throw new Error('Author URL must be a valid http/https URL')
        }
        authorData.url = authorUrl
      }
      embedBuilder.setAuthor(authorData)
    }

    // Thumbnail (small image in top-right corner)
    const thumbnailUrl = context.getNodeParameter('embedThumbnail', itemIndex, '') as string
    if (thumbnailUrl) {
      embedBuilder.setThumbnail(processImageInput(thumbnailUrl, 'Thumbnail'))
    }

    // Main image (large image at bottom)
    const imageUrl = context.getNodeParameter('embedImage', itemIndex, '') as string
    if (imageUrl) {
      embedBuilder.setImage(processImageInput(imageUrl, 'Image'))
    }

    // Footer section
    const footerText = context.getNodeParameter('embedFooterText', itemIndex, '') as string
    if (footerText) {
      const footerIconUrl = context.getNodeParameter('embedFooterIcon', itemIndex, '') as string
      const footerData: { text: string; iconURL?: string } = { text: footerText }
      if (footerIconUrl) footerData.iconURL = processImageInput(footerIconUrl, 'Footer Icon')
      embedBuilder.setFooter(footerData)
    }

    // Timestamp
    const timestampOption = context.getNodeParameter('embedTimestampOption', itemIndex, 'none') as string
    if (timestampOption === 'current') {
      embedBuilder.setTimestamp()
    } else if (timestampOption === 'custom') {
      const customTimestamp = context.getNodeParameter('embedCustomTimestamp', itemIndex, '') as string
      if (customTimestamp) {
        const timestamp = new Date(customTimestamp)
        if (isNaN(timestamp.getTime())) {
          throw new Error('Invalid timestamp format. Use ISO 8601 format (e.g., 2023-01-01T00:00:00Z)')
        }
        embedBuilder.setTimestamp(timestamp)
      }
    }

    // Fields (up to 25)
    const fields = context.getNodeParameter('embedFields', itemIndex, { field: [] }) as {
      field?: Array<{ name: string; value: string; inline?: boolean }>
    }

    if (fields.field && fields.field.length > 0) {
      // Filter out empty fields (useful for creating visual spacing)
      const validFields = fields.field.filter((field) => field.name || field.value)

      if (validFields.length > EMBED_LIMITS.FIELDS) {
        throw new Error(`Too many fields. Discord allows maximum ${EMBED_LIMITS.FIELDS} fields per embed.`)
      }

      validFields.forEach((field) => {
        embedBuilder.addFields({
          name: field.name || '\u200B', // Zero-width space for empty field name
          value: field.value || '\u200B', // Zero-width space for empty field value
          inline: field.inline || false,
        })
      })
    }

    // Video (note: Discord only shows video embeds for certain URLs, this sets the data)
    const videoUrl = context.getNodeParameter('embedVideoUrl', itemIndex, '') as string
    if (videoUrl) {
      if (!isValidUrl(videoUrl)) {
        throw new Error('Video URL must be a valid http/https URL')
      }
      // Video is set via the data property in the JSON (Discord.js doesn't have setVideo)
      const embedData = embedBuilder.toJSON()
      embedData.video = { url: videoUrl }

      // Validate the complete embed
      validateEmbedLimits(embedData as unknown as IDataObject)

      return embedData as IDataObject
    }

    // Build final embed
    const embedData = embedBuilder.toJSON()

    // Validate embed content is not empty
    if (
      !embedData.title &&
      !embedData.description &&
      !embedData.author &&
      !embedData.footer &&
      !embedData.fields?.length &&
      !embedData.image &&
      !embedData.thumbnail
    ) {
      return undefined // Empty embed, don't send
    }

    // Validate against Discord limits
    validateEmbedLimits(embedData as unknown as IDataObject)

    return embedData as IDataObject
  } catch (error) {
    throw new NodeOperationError(context.getNode(), `Failed to build embed: ${error.message}`, {
      itemIndex,
      description: 'Check your embed configuration and ensure all URLs and base64 images are valid',
    })
  }
}

/**
 * Returns n8n node properties for the enhanced embed builder.
 *
 * Returns comprehensive node properties for the enhanced embed builder with all Discord.js fields.
 * Properties are organized logically and include helpful descriptions and validation.
 *
 * @returns Array of n8n node properties for embed configuration
 */
export function getEnhancedEmbedProperties(): INodeProperties[] {
  return [
    {
      displayName: 'Embed',
      name: 'embed',
      type: 'boolean',
      default: false,
      description: 'Whether to send a rich embed message with formatted content',
    },
    // Basic Content
    {
      displayName: 'Title',
      name: 'embedTitle',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      default: '',
      placeholder: 'Embed Title',
      description: `Title of the embed (max ${EMBED_LIMITS.TITLE} characters)`,
    },
    {
      displayName: 'Description',
      name: 'embedDescription',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      typeOptions: { rows: 4 },
      default: '',
      placeholder: 'Embed description text...',
      description: `Main text content of the embed (max ${EMBED_LIMITS.DESCRIPTION} characters). Supports Discord markdown.`,
    },
    {
      displayName: 'URL',
      name: 'embedUrl',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      default: '',
      placeholder: 'https://example.com',
      description: 'Makes the embed title a clickable link',
    },
    {
      displayName: 'Color',
      name: 'embedColor',
      type: 'color',
      displayOptions: { show: { embed: [true] } },
      default: '#0099ff',
      description: 'Accent color of the embed sidebar (left border)',
    },
    // Author Section
    {
      displayName: 'Author Name',
      name: 'embedAuthorName',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      default: '',
      placeholder: 'Author Name',
      description: `Author name displayed at the top of the embed (max ${EMBED_LIMITS.AUTHOR_NAME} characters)`,
    },
    {
      displayName: 'Author Icon',
      name: 'embedAuthorIcon',
      type: 'string',
      displayOptions: { show: { embed: [true], embedAuthorName: [''] } },
      default: '',
      placeholder: 'https://example.com/icon.png or data:image/png;base64,...',
      description: 'Author icon URL or base64 image. Displayed next to author name.',
    },
    {
      displayName: 'Author URL',
      name: 'embedAuthorUrl',
      type: 'string',
      displayOptions: { show: { embed: [true], embedAuthorName: [''] } },
      default: '',
      placeholder: 'https://example.com/author',
      description: 'Makes the author name a clickable link',
    },
    // Images
    {
      displayName: 'Thumbnail',
      name: 'embedThumbnail',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      default: '',
      placeholder: 'https://example.com/thumb.png or data:image/png;base64,...',
      description: 'Small image displayed in the top-right corner. Supports URLs or base64 data URIs.',
    },
    {
      displayName: 'Image',
      name: 'embedImage',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      default: '',
      placeholder: 'https://example.com/image.png or data:image/png;base64,...',
      description: 'Large image displayed at the bottom of the embed. Supports URLs or base64 data URIs.',
    },
    // Footer Section
    {
      displayName: 'Footer Text',
      name: 'embedFooterText',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      default: '',
      placeholder: 'Footer text',
      description: `Text displayed at the bottom of the embed (max ${EMBED_LIMITS.FOOTER_TEXT} characters)`,
    },
    {
      displayName: 'Footer Icon',
      name: 'embedFooterIcon',
      type: 'string',
      displayOptions: { show: { embed: [true], embedFooterText: [''] } },
      default: '',
      placeholder: 'https://example.com/icon.png or data:image/png;base64,...',
      description: 'Footer icon URL or base64 image. Displayed next to footer text.',
    },
    // Timestamp
    {
      displayName: 'Timestamp',
      name: 'embedTimestampOption',
      type: 'options',
      displayOptions: { show: { embed: [true] } },
      options: [
        { name: 'None', value: 'none' },
        { name: 'Current Time', value: 'current' },
        { name: 'Custom Time', value: 'custom' },
      ],
      default: 'none',
      description: 'Timestamp displayed in the footer',
    },
    {
      displayName: 'Custom Timestamp',
      name: 'embedCustomTimestamp',
      type: 'string',
      displayOptions: { show: { embed: [true], embedTimestampOption: ['custom'] } },
      default: '',
      placeholder: '2023-01-01T00:00:00Z',
      description: 'ISO 8601 timestamp (e.g., 2023-01-01T00:00:00Z or use {{$now}} for current time)',
    },
    // Fields
    {
      displayName: 'Fields',
      name: 'embedFields',
      placeholder: 'Add Field',
      type: 'fixedCollection',
      typeOptions: { multipleValues: true },
      displayOptions: { show: { embed: [true] } },
      default: {},
      description: `Add up to ${EMBED_LIMITS.FIELDS} fields to the embed. Empty fields create visual spacing.`,
      options: [
        {
          name: 'field',
          displayName: 'Field',
          values: [
            {
              displayName: 'Name',
              name: 'name',
              type: 'string',
              default: '',
              placeholder: 'Field Title',
              description: `Field title/name (max ${EMBED_LIMITS.FIELD_NAME} characters)`,
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              placeholder: 'Field content...',
              description: `Field content/value (max ${EMBED_LIMITS.FIELD_VALUE} characters)`,
            },
            {
              displayName: 'Inline',
              name: 'inline',
              type: 'boolean',
              default: false,
              description: 'Whether to display this field inline with others (up to 3 per row)',
            },
          ],
        },
      ],
    },
    // Video (advanced)
    {
      displayName: 'Video URL',
      name: 'embedVideoUrl',
      type: 'string',
      displayOptions: { show: { embed: [true] } },
      default: '',
      placeholder: 'https://example.com/video.mp4',
      description: 'Video URL for video embeds (Discord only renders videos from certain domains)',
    },
  ]
}
