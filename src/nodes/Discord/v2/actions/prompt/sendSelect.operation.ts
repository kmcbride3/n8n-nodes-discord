import type { Client, MessageComponentInteraction } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import { generateUniqueId } from '../../../helpers'
import type { IV2DiscordCredentials } from '../../helpers'
import {
  discordStateManager,
  executeV2OperationWithClient,
  sendChannelMessage,
  updateDisplayOptions,
} from '../../helpers'
import { buildFileAttachments, getFileAttachmentProperty } from '../../helpers/file-attachments'
import { createActionRow, createSelectMenuComponent } from '../../helpers/builders'

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

      if (!client) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client is required for interactive select operations')
      }

      // Set client in state manager
      discordStateManager.setClient(client)

      return { ...credentials, client }
    },
    operation: async (ctx, { client }, itemIndex) => {
      // Get parameters from the node
      const channelId = ctx.getNodeParameter('channelId', itemIndex) as string
      const content = ctx.getNodeParameter('content', itemIndex) as string
      const selectData = ctx.getNodeParameter('select', itemIndex) as IDataObject

      // Extract options array from the fixedCollection structure
      const optionArray = selectData.select as IDataObject[]

      if (!optionArray || optionArray.length === 0) {
        throw new NodeOperationError(ctx.getNode(), 'At least one select option is required')
      }

      // Process file attachments
      const files = await buildFileAttachments(ctx, itemIndex)

      // Create select menu options
      const options = optionArray.map((option) => ({
        label: option.label as string,
        value: option.value as string,
        description: (option.description as string) || undefined,
      }))

      // Create select menu component with consistent customId
      const customId = generateUniqueId(8)
      const selectMenu = createSelectMenuComponent(
        customId, // customId
        'Choose an option...', // placeholder
        options, // options
        false, // disabled
        1, // minValues
        1, // maxValues
      )

      // Create action row with select menu
      const components = [createActionRow([selectMenu])]

      // Send message with select menu using Discord.js with client
      const response = await sendChannelMessage.call(
        ctx,
        channelId,
        content,
        {
          components, // components
        },
        files.length > 0 ? files : undefined, // files
        client, // Discord client
      )

      const messageId = response.id
      const workflowId = ctx.getWorkflow().id

      // Set up interaction collector with Discord.js Collections system and performance optimization
      const collector = discordStateManager.createInteractionCollector(ctx, channelId, messageId, {
        timeout: 5 * 60 * 1000, // 5 minutes optimized for select menu interactions
        persistent: false, // Default to single-use
        workflowId,
        componentFilter: (interaction: MessageComponentInteraction) => {
          // Performance-optimized filter: direct comparison
          return interaction.customId === customId
        },
      })

      if (!collector) {
        throw new NodeOperationError(ctx.getNode(), 'Failed to create interaction collector')
      }

      return {
        json: {
          messageId: response.id,
          channelId: response.channel_id || channelId,
          content: response.content,
          components: response.components,
          customId,
          collectorActive: discordStateManager.hasActiveCollector(messageId),
          success: true,
          // Include enhanced state manager statistics and performance metrics
          stateStats: discordStateManager.getStats(),
          performanceMetrics: discordStateManager.getPerformanceMetrics(),
          memoryPressure: discordStateManager.getMemoryPressureStatus(),
        },
        pairedItem: { item: itemIndex },
      }
    },
    cleanup: async (ctx, { client }) => {
      // Clean up expired interactions
      discordStateManager.cleanupExpiredInteractions()

      try {
        const { releaseV2DiscordClientByInstance } = await import('../../helpers')
        await releaseV2DiscordClientByInstance(client)
      } catch (e) {
        LoggerProxy?.warn('Failed to release Discord client after select prompt operation', { error: e })
      }
    },
  })
}
