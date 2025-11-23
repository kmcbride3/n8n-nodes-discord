/**
 * Discord Interaction Defer Reply Operation
 *
 * Acknowledges an interaction and defers the response
 * Buys time for processing (up to 15 minutes) while showing "Bot is thinking..."
 * Follow up with editReply or followUp operations
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { updateDisplayOptions } from '../../helpers/utils'

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
  const items = this.getInputData()
  const returnData: INodeExecutionData[] = []
  const credentials = await this.getCredentials('discordBotApi')
  const botToken = credentials.botToken as string

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    try {
      const interactionToken = this.getNodeParameter('interactionToken', itemIndex) as string
      const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject

      if (!interactionToken) {
        throw new NodeOperationError(
          this.getNode(),
          'Interaction token is required. Make sure this node receives data from a Discord Interaction trigger.',
          { itemIndex },
        )
      }

      // Build request payload
      const payload: IDataObject = {}

      if (options.ephemeral) {
        payload.flags = 64 // MessageFlags.Ephemeral
      }

      // Send deferred interaction response via Discord REST API
      const url = `https://discord.com/api/v10/interactions/${interactionToken}/callback`

      await this.helpers.httpRequest({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          type: 5, // InteractionCallbackType.DeferredChannelMessageWithSource
          data: payload,
        },
        json: true,
      })

      returnData.push({
        json: {
          success: true,
          deferred: true,
          interactionToken,
          ephemeral: options.ephemeral || false,
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
