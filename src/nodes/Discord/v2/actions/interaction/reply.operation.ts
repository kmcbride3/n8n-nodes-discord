/**
 * Discord Interaction Reply Operation
 *
 * Sends an initial reply to a Discord interaction (button, select menu, modal, command)
 * Must be called within 3 seconds of receiving the interaction
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
      operation: ['reply'],
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
      displayName: 'Content',
      name: 'content',
      type: 'string',
      default: '',
      typeOptions: {
        rows: 4,
      },
      description: 'The message content to send',
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
          description: 'Whether the message should be visible only to the user who triggered the interaction',
        },
        {
          displayName: 'TTS',
          name: 'tts',
          type: 'boolean',
          default: false,
          description: 'Whether this message should be spoken aloud via text-to-speech',
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
      const content = ctx.getNodeParameter('content', itemIndex, '') as string
      const options = ctx.getNodeParameter('options', itemIndex, {}) as IDataObject

      // Validate interaction token using helper
      validateInteractionToken(interactionToken, ctx, itemIndex)

      // Build request payload
      let payload: IDataObject = {
        content,
      }

      // Apply ephemeral flag using helper (uses Discord.js MessageFlags constant)
      payload = applyEphemeralFlag(payload, options)

      if (options.tts) {
        payload.tts = true
      }

      // Build interaction callback URL using helper
      const url = buildInteractionUrl('callback', { token: interactionToken })

      // Send initial interaction response via Discord REST API
      await ctx.helpers.httpRequest({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bot ${credentials.botToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          type: 4, // InteractionCallbackType.ChannelMessageWithSource
          data: payload,
        },
        json: true,
      })

      return {
        json: {
          success: true,
          interactionToken,
          ephemeral: options.ephemeral || false,
          content,
        },
        pairedItem: { item: itemIndex },
      }
    },
  })
}
