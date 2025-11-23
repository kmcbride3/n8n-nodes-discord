/**
 * Discord Interaction Follow Up Operation
 *
 * Sends a follow-up message after an initial reply or deferred reply
 * Can be used to send additional messages without replacing the original
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { updateDisplayOptions } from '../../helpers/utils'

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
  const items = this.getInputData()
  const returnData: INodeExecutionData[] = []
  const credentials = await this.getCredentials('discordBotApi')
  const botToken = credentials.botToken as string
  const applicationId = await getApplicationId(botToken)

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    try {
      const interactionToken = this.getNodeParameter('interactionToken', itemIndex) as string
      const content = this.getNodeParameter('content', itemIndex, '') as string
      const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject

      if (!interactionToken) {
        throw new NodeOperationError(
          this.getNode(),
          'Interaction token is required. Make sure this node receives data from a Discord Interaction trigger.',
          { itemIndex },
        )
      }

      // Build request payload
      const payload: IDataObject = {
        content,
      }

      if (options.ephemeral) {
        payload.flags = 64 // MessageFlags.Ephemeral
      }

      // Send follow-up message via Discord REST API (webhook endpoint)
      const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`

      const response = await this.helpers.httpRequest({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: payload,
        json: true,
      })

      returnData.push({
        json: {
          success: true,
          followUp: true,
          interactionToken,
          content,
          ephemeral: options.ephemeral || false,
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
