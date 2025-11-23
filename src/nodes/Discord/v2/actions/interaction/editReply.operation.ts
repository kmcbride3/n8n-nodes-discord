/**
 * Discord Interaction Edit Reply Operation
 *
 * Edits the initial deferred or immediate reply to an interaction
 * Use this after deferReply() to update the "Bot is thinking..." message
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import {
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
      operation: ['editReply'],
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
      description: 'The new message content',
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

      // Validate interaction token using helper
      validateInteractionToken(interactionToken, ctx, itemIndex)

      // Build edit original message URL using helper
      const url = buildInteractionUrl('editOriginal', {
        applicationId: credentials.applicationId,
        token: interactionToken,
      })

      // Edit the original interaction response via Discord REST API
      const response = await ctx.helpers.httpRequest({
        method: 'PATCH',
        url,
        headers: {
          Authorization: `Bot ${credentials.botToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          content,
        },
        json: true,
      })

      return {
        json: {
          success: true,
          edited: true,
          interactionToken,
          content,
          message: response as IDataObject,
        },
        pairedItem: { item: itemIndex },
      }
    },
  })
}
