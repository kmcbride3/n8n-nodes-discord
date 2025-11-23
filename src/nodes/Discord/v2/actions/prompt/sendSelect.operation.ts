import { MessageComponentInteraction } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import { generateUniqueId } from '../../../helpers'
import {
  createV2DiscordClient,
  discordStateManager,
  getV2DiscordCredentials,
  releaseV2DiscordClientByInstance,
  sendChannelMessage,
} from '../../helpers'
import { createActionRow, createSelectMenuComponent } from '../../helpers/builders'
import { updateDisplayOptions } from '../../helpers/utils'

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
  ],
)

/**
 * Sends an interactive select menu prompt to a Discord channel
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = []
  const items: INodeExecutionData[] = this.getInputData()

  // Get credentials and create Discord client
  const credentials = await getV2DiscordCredentials.call(this)
  const client = await createV2DiscordClient.call(this, credentials)

  if (!client) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for interactive select operations')
  }

  // Set client in state manager
  discordStateManager.setClient(client)

  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      // Get parameters from the node
      const channelId = this.getNodeParameter('channelId', itemIndex) as string
      const content = this.getNodeParameter('content', itemIndex) as string
      const selectData = this.getNodeParameter('select', itemIndex) as IDataObject

      // Extract options array from the fixedCollection structure
      const optionArray = selectData.select as IDataObject[]

      if (!optionArray || optionArray.length === 0) {
        throw new NodeOperationError(this.getNode(), 'At least one select option is required')
      }

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
        this,
        channelId,
        content,
        {
          components, // components
        },
        undefined, // files
        client, // Discord client
      )

      const messageId = response.id
      const workflowId = this.getWorkflow().id

      // Set up interaction collector with Discord.js Collections system and performance optimization
      const collector = discordStateManager.createInteractionCollector(this, channelId, messageId, {
        timeout: 5 * 60 * 1000, // 5 minutes optimized for select menu interactions
        persistent: false, // Default to single-use
        workflowId,
        componentFilter: (interaction: MessageComponentInteraction) => {
          // Performance-optimized filter: direct comparison
          return interaction.customId === customId
        },
      })

      if (!collector) {
        throw new NodeOperationError(this.getNode(), 'Failed to create interaction collector')
      }

      returnData.push({
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
      })
    }

    // Clean up expired interactions
    discordStateManager.cleanupExpiredInteractions()

    return [returnData]
  } finally {
    try {
      await releaseV2DiscordClientByInstance.call(this, client)
    } catch (e) {
      // Log but don't fail the node if release fails
      LoggerProxy && LoggerProxy.warn
        ? LoggerProxy.warn('Failed to release Discord client after select prompt operation', { error: e })
        : null
    }
  }
}
