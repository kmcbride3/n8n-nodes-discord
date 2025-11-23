/**
 * Discord Interaction Reply Operation
 *
 * Sends an initial reply to a Discord interaction (button, select menu, modal, command)
 * Must be called within 3 seconds of receiving the interaction
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { updateDisplayOptions } from '../../helpers/utils'

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
  const items = this.getInputData()
  const returnData: INodeExecutionData[] = []
  const credentials = await this.getCredentials('discordBotApi')
  const botToken = credentials.botToken as string

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

      if (options.tts) {
        payload.tts = true
      }

      // Send initial interaction response via Discord REST API
      // Note: interaction callback doesn't require application ID in URL
      const url = `https://discord.com/api/v10/interactions/${this.getNodeParameter('interactionToken', itemIndex)}/callback`

      await this.helpers.httpRequest({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          type: 4, // InteractionCallbackType.ChannelMessageWithSource
          data: payload,
        },
        json: true,
      })

      returnData.push({
        json: {
          success: true,
          interactionToken,
          ephemeral: options.ephemeral || false,
          content,
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
