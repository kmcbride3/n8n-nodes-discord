/**
 * Button Prompt Operation (Prompt Resource)
 *
 * ⚠️ ARCHITECTURE NOTE:
 * This operation differs from regular message sending by using a managed collector
 * via discordStateManager. This is intentional for the 'prompt' resource which is
 * designed for interactive prompt workflows.
 *
 * For standard message sending with buttons (where you handle responses separately),
 * use the 'message' resource sendMessage operation instead.
 *
 * The 'prompt' resource maintains collectors for immediate interaction handling,
 * making it suitable for bot-like interactive prompts. Collectors are managed
 * centrally and cleaned up automatically.
 */

import type { MessageComponentInteraction } from 'discord.js'
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import {
  createV2DiscordClient,
  discordStateManager,
  getV2DiscordCredentials,
  releaseV2DiscordClientByInstance,
  sendChannelMessage,
} from '../../helpers'
import { createActionRow, createButtonComponent } from '../../helpers/builders'
import { updateDisplayOptions } from '../../helpers/utils'

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
      description: 'Whether to wait for button interactions before completing the node',
    },
  ],
)

/**
 * Sends an interactive button prompt to a Discord channel
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
    throw new NodeOperationError(this.getNode(), 'Discord client is required for interactive button operations')
  }

  // Set client in state manager
  discordStateManager.setClient(client)

  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      // Get parameters from the node
      const channelId = this.getNodeParameter('channelId', itemIndex) as string
      const content = this.getNodeParameter('content', itemIndex) as string
      const buttonsData = this.getNodeParameter('buttons', itemIndex) as IDataObject
      const collectionMode = this.getNodeParameter('collectionMode', itemIndex) as string
      const timeoutSeconds = this.getNodeParameter('timeout', itemIndex) as number
      const waitForResponse = this.getNodeParameter('waitForResponse', itemIndex) as boolean

      // Extract button array from the fixedCollection structure
      const buttonArray = buttonsData.button as IDataObject[]

      if (!buttonArray || buttonArray.length === 0) {
        throw new NodeOperationError(this.getNode(), 'At least one button is required')
      }

      // Create button components
      const buttons = buttonArray.map((button) =>
        createButtonComponent(
          button.value as string, // customId
          button.label as string, // label
          (button.style as number) || 1, // style
          undefined, // emoji
          undefined, // url
          false, // disabled
        ),
      )

      // Create action row with buttons
      const components = [createActionRow(buttons)]

      // Send message with buttons using Discord.js with client
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
      const buttonValues = buttonArray.map((button) => button.value as string)
      const optimizedTimeout = Math.min(timeoutSeconds * 1000, 15 * 60 * 1000) // Max 15 minutes (Discord.js limit)
      const collectorOptions = {
        timeout: optimizedTimeout,
        persistent: collectionMode === 'persistent',
        workflowId,
        componentFilter: (interaction: MessageComponentInteraction) => {
          // Performance-optimized filter: early return for efficiency
          return buttonValues.includes(interaction.customId)
        },
      }

      const collector = discordStateManager.createInteractionCollector(this, channelId, messageId, collectorOptions)

      if (!collector) {
        throw new NodeOperationError(this.getNode(), 'Failed to create interaction collector')
      }

      const collectedInteractions: IDataObject[] = []

      if (waitForResponse) {
        // Wait for interactions based on collection mode
        const waitPromise = new Promise<void>((resolve) => {
          collector.on('collect', (interaction) => {
            const interactionData = {
              userId: interaction.user.id,
              userName: interaction.user.username,
              customId: interaction.customId,
              timestamp: new Date().toISOString(),
              channelId: interaction.channelId,
              messageId: interaction.message.id,
            }

            collectedInteractions.push(interactionData)

            // For single mode, resolve after first interaction
            if (collectionMode === 'single') {
              collector.stop('single_response_received')
              resolve()
            }
          })

          collector.on('end', (collected, reason) => {
            LoggerProxy.info(`Collector ended: ${reason}. Total interactions: ${collected.size}`)
            resolve()
          })

          // For persistent mode, we don't wait - the collector continues running
          if (collectionMode === 'persistent') {
            resolve()
          }
        })

        // Wait for the collection to complete
        await waitPromise
      }

      // Prepare return data
      const resultData: IDataObject = {
        messageId: response.id,
        channelId: response.channel_id || channelId,
        content: response.content,
        components: response.components,
        collectionMode,
        success: true,
        collectorActive: discordStateManager.hasActiveCollector(messageId),
      }

      // Add interaction data if we collected any
      if (collectedInteractions.length > 0) {
        resultData.interactions = collectedInteractions
        resultData.interactionCount = collectedInteractions.length
      }

      // Add enhanced state manager statistics and performance metrics
      resultData.stateStats = discordStateManager.getStats()
      resultData.performanceMetrics = discordStateManager.getPerformanceMetrics()
      resultData.memoryPressure = discordStateManager.getMemoryPressureStatus()

      returnData.push({
        json: resultData,
        pairedItem: { item: itemIndex },
      })
    }

    // Return collected results for successful execution
    return [returnData]
  } finally {
    // Clean up expired interactions
    try {
      discordStateManager.cleanupExpiredInteractions()
    } catch (err) {
      LoggerProxy.warn('Failed during discordStateManager.cleanupExpiredInteractions', { error: err })
    }

    try {
      // Release the pooled client by instance
      await releaseV2DiscordClientByInstance.call(this, client)
    } catch (err) {
      LoggerProxy.error('Failed to release Discord client instance', { error: err })
    }
  }
}
