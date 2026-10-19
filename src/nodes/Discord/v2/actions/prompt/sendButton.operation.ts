/**
 * Button Prompt Operation (Prompt Resource)
 *
 * Sends an interactive button message and collects responses using Discord.js
 * native message component collectors.
 *
 * For standard message sending with buttons (where you handle responses separately),
 * use the 'message' resource sendMessage operation instead.
 */

import type { Client, MessageComponentInteraction, MessageCreateOptions } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, updateDisplayOptions } from '../../helpers'
import { createActionRow, createButtonComponent } from '../../helpers/builders'
import { buildFileAttachments, getFileAttachmentProperty } from '../../helpers/file-attachments'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['prompt'],
      operation: ['button'],
    },
  },
  [
    {
      displayName: 'Send to',
      name: 'channelId',
      required: true,
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getChannels',
      },
      default: '',
      description: 'The channel to send the button prompt to.',
    },
    {
      displayName: 'Content',
      name: 'content',
      type: 'string',
      required: true,
      typeOptions: {
        rows: 4,
      },
      default: '',
      description: 'The message content to display with the buttons.',
    },
    {
      displayName: 'Buttons',
      name: 'buttons',
      type: 'fixedCollection',
      placeholder: 'Add Button',
      default: {},
      options: [
        {
          name: 'button',
          displayName: 'Button',
          values: [
            {
              displayName: 'Label',
              name: 'label',
              type: 'string',
              default: '',
              description: 'The text to display on the button',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'The value returned when the button is clicked',
            },
            {
              displayName: 'Style',
              name: 'style',
              type: 'options',
              options: [
                {
                  name: 'Primary',
                  value: 1,
                },
                {
                  name: 'Secondary',
                  value: 2,
                },
                {
                  name: 'Success',
                  value: 3,
                },
                {
                  name: 'Danger',
                  value: 4,
                },
              ],
              default: 1,
              description: 'The visual style of the button',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Collection Mode',
      name: 'collectionMode',
      type: 'options',
      options: [
        {
          name: 'Single Response',
          value: 'single',
          description: 'Wait for one interaction and then stop collecting',
        },
        {
          name: 'Multiple Responses',
          value: 'multiple',
          description: 'Collect multiple interactions until timeout',
        },
        {
          name: 'Persistent',
          value: 'persistent',
          description: 'Keep collecting interactions indefinitely (until manually stopped)',
        },
      ],
      default: 'single',
      description: 'How to handle button interactions',
    },
    {
      displayName: 'Timeout (seconds)',
      name: 'timeout',
      type: 'number',
      default: 60,
      displayOptions: {
        show: {
          collectionMode: ['single', 'multiple'],
        },
      },
      description: 'How long to wait for interactions before stopping (0 = no timeout)',
    },
    {
      displayName: 'Wait for Response',
      name: 'waitForResponse',
      type: 'boolean',
      default: true,
      description: 'Whether to wait for button clicks before continuing the workflow',
    },
    getFileAttachmentProperty(),
  ],
)

interface IButtonPromptCredentials extends IV2DiscordCredentials {
  client: Client
}

/**
 * Sends an interactive button prompt to a Discord channel
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<IButtonPromptCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials } = await import('../../helpers')
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)
      return { ...credentials, client }
    },
    operation: async (ctx, { client }, itemIndex) => {
      const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
      const content = ctx.getNodeParameter('content', itemIndex) as string
      const buttonsData = ctx.getNodeParameter('buttons', itemIndex) as IDataObject
      const collectionMode = ctx.getNodeParameter('collectionMode', itemIndex) as string
      const timeoutSeconds = ctx.getNodeParameter('timeout', itemIndex) as number
      const waitForResponse = ctx.getNodeParameter('waitForResponse', itemIndex) as boolean

      const buttonArray = buttonsData.button as IDataObject[]
      if (!buttonArray || buttonArray.length === 0) {
        throw new NodeOperationError(ctx.getNode(), 'At least one button is required', { itemIndex })
      }

      const files = await buildFileAttachments(ctx, itemIndex)

      const buttons = buttonArray.map((button) =>
        createButtonComponent(
          button.value as string,
          button.label as string,
          (button.style as number) || 1,
          undefined,
          undefined,
          false,
        ),
      )
      const components = [createActionRow(buttons)]

      // Fetch channel and send message directly to get the native Message object
      const channel = await client.channels.fetch(channelId)
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        throw new NodeOperationError(ctx.getNode(), `Channel ${channelId} does not support sending messages`, {
          itemIndex,
        })
      }

      const messageOptions: MessageCreateOptions = {
        content,
        components: components as unknown as MessageCreateOptions['components'],
      }
      if (files.length > 0) messageOptions.files = files as MessageCreateOptions['files']
      const sentMessage = await channel.send(messageOptions)

      const buttonValues = buttonArray.map((b) => b.value as string)
      const timeMs = Math.min(timeoutSeconds * 1000, 15 * 60 * 1000)

      const collector = sentMessage.createMessageComponentCollector({
        filter: (i: MessageComponentInteraction) => buttonValues.includes(i.customId),
        ...(collectionMode !== 'persistent' && { time: timeMs }),
        ...(collectionMode === 'single' && { max: 1 }),
      })

      const collectedInteractions: IDataObject[] = []

      if (waitForResponse) {
        await new Promise<void>((resolve) => {
          collector.on('collect', (interaction) => {
            collectedInteractions.push({
              userId: interaction.user.id,
              userName: interaction.user.username,
              customId: interaction.customId,
              timestamp: new Date().toISOString(),
              channelId: interaction.channelId,
              messageId: interaction.message.id,
            })
            interaction
              .deferUpdate()
              .catch((err: unknown) => LoggerProxy.error('Failed to defer button interaction', { error: err }))
            if (collectionMode === 'single') {
              collector.stop()
            }
          })

          collector.on('end', (_collected, reason) => {
            LoggerProxy.debug('Button collector ended', { messageId: sentMessage.id, reason })
            resolve()
          })

          if (collectionMode === 'persistent') resolve()
        })
      }

      return {
        json: {
          messageId: sentMessage.id,
          channelId,
          content: sentMessage.content,
          collectionMode,
          success: true,
          ...(collectedInteractions.length > 0 && {
            interactions: collectedInteractions,
            interactionCount: collectedInteractions.length,
          }),
        },
        pairedItem: { item: itemIndex },
      }
    },
    cleanup: async (_ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client).catch((err) =>
        LoggerProxy.error('Failed to release Discord client instance', { error: err }),
      )
    },
  })
}
