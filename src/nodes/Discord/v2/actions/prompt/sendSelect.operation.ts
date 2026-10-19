import type { Client, MessageCreateOptions } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import { generateUniqueId } from '../../../helpers'
import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, updateDisplayOptions } from '../../helpers'
import { createActionRow, createSelectMenuComponent } from '../../helpers/builders'
import { buildFileAttachments, getFileAttachmentProperty } from '../../helpers/file-attachments'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['prompt'],
      operation: ['select'],
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
      description: 'The channel to send the select prompt to.',
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
      description: 'The message content to display with the select menu.',
    },
    {
      displayName: 'Select Options',
      name: 'select',
      type: 'fixedCollection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          name: 'select',
          displayName: 'Option',
          values: [
            {
              displayName: 'Label',
              name: 'label',
              type: 'string',
              default: '',
              description: 'The text to display for this option',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'The value returned when this option is selected',
            },
            {
              displayName: 'Description',
              name: 'description',
              type: 'string',
              default: '',
              description: 'Optional description for this option',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Timeout (seconds)',
      name: 'timeout',
      type: 'number',
      default: 300,
      description: 'How long to wait for a response before timing out',
    },
    getFileAttachmentProperty(),
  ],
)

interface ISelectPromptCredentials extends IV2DiscordCredentials {
  client: Client
}

/**
 * Sends an interactive select menu prompt to a Discord channel
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<ISelectPromptCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials } = await import('../../helpers')
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)
      return { ...credentials, client }
    },
    operation: async (ctx, { client }, itemIndex) => {
      const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
      const content = ctx.getNodeParameter('content', itemIndex) as string
      const selectData = ctx.getNodeParameter('select', itemIndex) as IDataObject

      const optionArray = selectData.select as IDataObject[]
      if (!optionArray || optionArray.length === 0) {
        throw new NodeOperationError(ctx.getNode(), 'At least one select option is required', { itemIndex })
      }

      const files = await buildFileAttachments(ctx, itemIndex)

      const options = optionArray.map((option) => ({
        label: option.label as string,
        value: option.value as string,
        description: (option.description as string) || undefined,
      }))

      const customId = generateUniqueId(8)
      const selectMenu = createSelectMenuComponent(customId, 'Choose an option...', options, false, 1, 1)
      const components = [createActionRow([selectMenu])]

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

      const timeoutSeconds = ctx.getNodeParameter('timeout', itemIndex) as number
      const timeMs = Math.min(timeoutSeconds * 1000, 15 * 60 * 1000)

      const collector = sentMessage.createMessageComponentCollector({
        filter: (i) => i.customId === customId,
        time: timeMs,
        max: 1,
      })

      const selectedValues = await new Promise<string[]>((resolve) => {
        collector.on('collect', (interaction) => {
          const values = interaction.isStringSelectMenu() ? interaction.values : []
          interaction
            .deferUpdate()
            .catch((err: unknown) => LoggerProxy.error('Failed to defer select interaction', { error: err }))
          resolve(values)
        })
        collector.on('end', (_collected, reason) => {
          if (reason !== 'limit') {
            LoggerProxy.debug('Select collector ended without response', { messageId: sentMessage.id, reason })
            resolve([])
          }
        })
      })

      return {
        json: {
          messageId: sentMessage.id,
          channelId,
          content: sentMessage.content,
          customId,
          selectedValues,
          success: true,
        } as IDataObject,
        pairedItem: { item: itemIndex },
      }
    },
    cleanup: async (_ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client).catch((err) =>
        LoggerProxy.warn('Failed to release Discord client after select prompt operation', { error: err }),
      )
    },
  })
}
