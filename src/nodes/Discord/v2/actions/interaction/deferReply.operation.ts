/**
 * Discord Interaction Defer Reply Operation
 *
 * Acknowledges an interaction and defers the response
 * Buys time for processing (up to 15 minutes) while showing "Bot is thinking..."
 * Follow up with editReply or followUp operations
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import {
  applyEphemeralFlag,
  buildInteractionUrl,
  executeV2Operation,
  updateDisplayOptions,
  validateInteractionToken,
} from '../../helpers'

interface IDiscordBotCredentials {
  botToken: string
}

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['interaction'],
      operation: ['deferReply'],
    },
  },
  [
    {
      displayName: 'Interaction Token',
      name: 'interactionToken',
      type: 'string',
      default: '={{$json.token}}',
      required: true,
      description: 'The interaction token from the trigger event',
    },
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          displayName: 'Ephemeral',
          name: 'ephemeral',
          type: 'boolean',
          default: false,
          description: 'Whether the eventual response should be visible only to the user who triggered the interaction',
        },
      ],
    },
  ],
)

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2Operation<IDiscordBotCredentials>(this, {
    getCredentials: async (ctx) => {
      const credentials = await ctx.getCredentials('discordBotApi')
      return { botToken: credentials.botToken as string }
    },
    operation: async (ctx, credentials, itemIndex) => {
      const interactionToken = ctx.getNodeParameter('interactionToken', itemIndex) as string
      const options = ctx.getNodeParameter('options', itemIndex, {}) as IDataObject

      // Validate interaction token using helper
      validateInteractionToken(interactionToken, ctx, itemIndex)

      // Build request payload with ephemeral flag if needed
      const payload = applyEphemeralFlag({}, options)

      // Build interaction callback URL using helper
      const url = buildInteractionUrl('callback', { token: interactionToken })

      // Send deferred interaction response via Discord REST API
      await ctx.helpers.httpRequest({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bot ${credentials.botToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          type: 5, // InteractionCallbackType.DeferredChannelMessageWithSource
          data: payload,
        },
        json: true,
      })

      return {
        json: {
          success: true,
          deferred: true,
          interactionToken,
          ephemeral: options.ephemeral || false,
        },
        pairedItem: { item: itemIndex },
      }
    },
  })
}
