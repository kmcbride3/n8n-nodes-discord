/**
 * Discord Interaction Edit Reply Operation
 *
 * Edits the initial deferred or immediate reply to an interaction
 * Use this after deferReply() to update the "Bot is thinking..." message
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { updateDisplayOptions } from '../../helpers/utils'

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
  const items = this.getInputData()
  const returnData: INodeExecutionData[] = []
  const credentials = await this.getCredentials('discordBotApi')
  const botToken = credentials.botToken as string
  const applicationId = await getApplicationId(botToken)

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    try {
      const interactionToken = this.getNodeParameter('interactionToken', itemIndex) as string
      const content = this.getNodeParameter('content', itemIndex, '') as string

      if (!interactionToken) {
        throw new NodeOperationError(
          this.getNode(),
          'Interaction token is required. Make sure this node receives data from a Discord Interaction trigger.',
          { itemIndex },
        )
      }

      // Edit the original interaction response via Discord REST API
      const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`

      const response = await this.helpers.httpRequest({
        method: 'PATCH',
        url,
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          content,
        },
        json: true,
      })

      returnData.push({
        json: {
          success: true,
          edited: true,
          interactionToken,
          content,
          message: response as IDataObject,
        },
        pairedItem: { item: itemIndex },
      })
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({
          json: {
            error: error.message,
            interactionToken: this.getNodeParameter('interactionToken', itemIndex, ''),
          },
          pairedItem: { item: itemIndex },
        })
      } else {
        throw new NodeOperationError(this.getNode(), error.message, { itemIndex })
      }
    }
  }

  return [returnData]
}

async function getApplicationId(botToken: string): Promise<string> {
  const parts = botToken.split('.')
  if (parts.length < 3) {
    throw new Error('Invalid bot token format')
  }
  return Buffer.from(parts[0], 'base64').toString('utf-8')
}
