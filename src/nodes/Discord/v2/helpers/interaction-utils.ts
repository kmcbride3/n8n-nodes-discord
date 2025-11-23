/**
 * Discord Interaction Utilities
 *
 * Shared utilities for Discord interaction operations to eliminate code duplication
 * and provide consistent interaction handling across all interaction-based operations.
 */

import { MessageFlags } from 'discord.js'
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Extract application ID from Discord bot token
 *
 * Discord bot tokens are encoded as base64(applicationId).timestamp.hmac
 * This function decodes the application ID from the token.
 *
 * @param botToken - Discord bot token
 * @returns Application ID extracted from token
 * @throws Error if token format is invalid
 *
 * @example
 * const appId = getApplicationId('MTIzNDU2Nzg5MDEyMzQ1Njc4.GhjKLm.xyz123...')
 * // Returns: '123456789012345678'
 */
export function getApplicationId(botToken: string): string {
  const parts = botToken.split('.')
  if (parts.length < 3) {
    throw new Error('Invalid bot token format - expected format: base64(appId).timestamp.hmac')
  }

  try {
    return Buffer.from(parts[0], 'base64').toString('utf-8')
  } catch (error) {
    throw new Error(`Failed to decode application ID from token: ${error.message}`)
  }
}

/**
 * Validate interaction token and throw appropriate error if missing
 *
 * @param token - Interaction token to validate
 * @param context - n8n execution context for error throwing
 * @param itemIndex - Current item index for error context
 * @throws NodeOperationError if token is missing or invalid
 *
 * @example
 * validateInteractionToken(interactionToken, this, itemIndex)
 */
export function validateInteractionToken(
  token: string | undefined,
  context: IExecuteFunctions,
  itemIndex: number,
): asserts token is string {
  if (!token || token.trim() === '') {
    throw new NodeOperationError(
      context.getNode(),
      'Interaction token is required. Make sure this node receives data from a Discord Interaction trigger.',
      { itemIndex },
    )
  }
}

/**
 * Apply ephemeral flag to interaction payload using Discord.js constants
 *
 * Uses Discord.js MessageFlags.Ephemeral constant instead of magic numbers
 * to ensure compatibility with Discord API changes.
 *
 * @param payload - Interaction payload object to modify
 * @param options - Options object that may contain ephemeral setting
 * @returns Modified payload with ephemeral flag if applicable
 *
 * @example
 * const payload = { content: 'Hello' }
 * applyEphemeralFlag(payload, { ephemeral: true })
 * // payload now has: { content: 'Hello', flags: 64 }
 */
export function applyEphemeralFlag(payload: IDataObject, options: IDataObject): IDataObject {
  if (options.ephemeral === true) {
    payload.flags = MessageFlags.Ephemeral // Discord.js constant = 64
  }
  return payload
}

/**
 * Build interaction API URL for Discord REST API v10
 *
 * Generates the appropriate URL for interaction endpoints based on operation type.
 *
 * @param type - Type of interaction endpoint
 * @param params - Parameters for URL construction
 * @returns Fully qualified Discord API URL
 *
 * @example
 * // Initial callback
 * buildInteractionUrl('callback', { token: 'xyz...' })
 * // Returns: 'https://discord.com/api/v10/interactions/xyz.../callback'
 *
 * // Webhook message
 * buildInteractionUrl('webhook', { applicationId: '123', token: 'xyz...' })
 * // Returns: 'https://discord.com/api/v10/webhooks/123/xyz...'
 *
 * // Edit original message
 * buildInteractionUrl('editOriginal', { applicationId: '123', token: 'xyz...' })
 * // Returns: 'https://discord.com/api/v10/webhooks/123/xyz.../messages/@original'
 */
export function buildInteractionUrl(
  type: 'callback' | 'webhook' | 'editOriginal' | 'deleteOriginal',
  params: { token: string; applicationId?: string; messageId?: string },
): string {
  const baseUrl = 'https://discord.com/api/v10'

  switch (type) {
    case 'callback':
      // Initial interaction callback: POST /interactions/{token}/callback
      return `${baseUrl}/interactions/${params.token}/callback`

    case 'webhook':
      // Follow-up messages: POST /webhooks/{application.id}/{token}
      if (!params.applicationId) {
        throw new Error('applicationId required for webhook URL')
      }
      return `${baseUrl}/webhooks/${params.applicationId}/${params.token}`

    case 'editOriginal':
      // Edit original message: PATCH /webhooks/{application.id}/{token}/messages/@original
      if (!params.applicationId) {
        throw new Error('applicationId required for editOriginal URL')
      }
      return `${baseUrl}/webhooks/${params.applicationId}/${params.token}/messages/@original`

    case 'deleteOriginal':
      // Delete original message: DELETE /webhooks/{application.id}/{token}/messages/@original
      if (!params.applicationId) {
        throw new Error('applicationId required for deleteOriginal URL')
      }
      return `${baseUrl}/webhooks/${params.applicationId}/${params.token}/messages/@original`

    default:
      throw new Error(`Unknown interaction URL type: ${type}`)
  }
}

/**
 * Extract interaction token from node parameter with validation
 *
 * Helper to safely extract and validate interaction token from node parameters.
 *
 * @param context - n8n execution context
 * @param itemIndex - Current item index
 * @returns Validated interaction token
 * @throws NodeOperationError if token is missing or invalid
 *
 * @example
 * const token = getValidatedInteractionToken(this, itemIndex)
 */
export function getValidatedInteractionToken(context: IExecuteFunctions, itemIndex: number): string {
  const token = context.getNodeParameter('interactionToken', itemIndex, '') as string
  validateInteractionToken(token, context, itemIndex)
  return token
}
