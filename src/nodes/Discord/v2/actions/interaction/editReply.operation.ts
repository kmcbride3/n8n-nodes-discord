/**
 * Discord Interaction Edit Reply Operation
 *
 * Edits the initial deferred or immediate reply to an interaction
 * Use this after deferReply() to update the "Bot is thinking..." message
 */

import type { Client } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import {
  buildInteractionUrl,
  createV2DiscordClient,
  executeV2Operation,
  getV2DiscordCredentials,
  releaseV2DiscordClientByInstance,
  updateDisplayOptions,
  validateInteractionToken,
} from '../../helpers'

interface IDiscordBotCredentials {
  token: string
  client: Client
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
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)
      return { token: credentials.token, client }
    },
    operation: async (ctx, credentials, itemIndex) => {
      const interactionToken = ctx.getNodeParameter('interactionToken', itemIndex) as string
      const content = ctx.getNodeParameter('content', itemIndex, '') as string

      // Validate interaction token using helper
      validateInteractionToken(interactionToken, ctx, itemIndex)

      const applicationId = credentials.client.application?.id
      if (!applicationId) {
        throw new NodeOperationError(ctx.getNode(), 'Could not resolve application ID from Discord client', {
          itemIndex,
          description: 'Ensure the bot is properly connected to Discord before using interaction operations.',
        })
      }

      // Build edit original message URL using helper
      const url = buildInteractionUrl('editOriginal', {
        applicationId,
        token: interactionToken,
      })

      // Edit the original interaction response via Discord REST API
      const response = await ctx.helpers.httpRequest({
        method: 'PATCH',
        url,
        headers: {
          Authorization: `Bot ${credentials.token}`,
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
    cleanup: async (_ctx, credentials) => {
      await releaseV2DiscordClientByInstance(credentials.client)
    },
  })
}
