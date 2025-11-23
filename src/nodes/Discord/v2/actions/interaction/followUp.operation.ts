/**
 * Discord Interaction Follow Up Operation
 *
 * Sends a follow-up message after an initial reply or deferred reply
 * Can be used to send additional messages without replacing the original
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import {
  applyEphemeralFlag,
  buildInteractionUrl,
  executeV2Operation,
  getApplicationId,
  updateDisplayOptions,
  validateInteractionToken,
} from '../../helpers'

interface IDiscordBotCredentials {
  botToken: string
  applicationId: string
}

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['interaction'],
      operation: ['followUp'],
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
      description: 'The follow-up message content',
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
      ],
    },
  ],
)

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2Operation<IDiscordBotCredentials>(this, {
    getCredentials: async (ctx) => {
      const credentials = await ctx.getCredentials('discordBotApi')
      const botToken = credentials.botToken as string
      const applicationId = getApplicationId(botToken)
      return { botToken, applicationId }
    },
    operation: async (ctx, credentials, itemIndex) => {
      const interactionToken = ctx.getNodeParameter('interactionToken', itemIndex) as string
      const content = ctx.getNodeParameter('content', itemIndex, '') as string
      const options = ctx.getNodeParameter('options', itemIndex, {}) as IDataObject

      // Validate interaction token using helper
      validateInteractionToken(interactionToken, ctx, itemIndex)

      // Build request payload with ephemeral flag if needed
      const payload: IDataObject = {
        content,
      }
      const finalPayload = applyEphemeralFlag(payload, options)

      // Build webhook URL using helper
      const url = buildInteractionUrl('webhook', {
        applicationId: credentials.applicationId,
        token: interactionToken,
      })

      // Send follow-up message via Discord REST API (webhook endpoint)
      const response = await ctx.helpers.httpRequest({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bot ${credentials.botToken}`,
          'Content-Type': 'application/json',
        },
        body: finalPayload,
        json: true,
      })

      return {
        json: {
          success: true,
          followUp: true,
          interactionToken,
          content,
          ephemeral: options.ephemeral || false,
          message: response as IDataObject,
        },
        pairedItem: { item: itemIndex },
      }
    },
  })
}
