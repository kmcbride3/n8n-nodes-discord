/**
 * Discord Interaction Router
 *
 * Routes interaction events to appropriate handlers using Discord.js WebSocket
 * Handles button clicks, select menus, modal submissions, and slash commands
 */

import type { Interaction } from 'discord.js'
import type { IDataObject, ITriggerFunctions, ITriggerResponse } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import { getDiscordClient, type IDiscordCredentials, type InteractionTriggerType } from '../triggerHelpers'
import { INTERACTION_TRIGGER_REGISTRY } from './interactionTriggerRegistry'

/**
 * Main router for Discord interaction triggers
 */
export async function interactionRouter(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {
  const interactionType = this.getNodeParameter('interactionType') as InteractionTriggerType
  const credentials = (await this.getCredentials('discordBotApi')) as IDiscordCredentials

  const triggerConfig = INTERACTION_TRIGGER_REGISTRY[interactionType]
  if (!triggerConfig) {
    throw new NodeOperationError(this.getNode(), `Unknown interaction type: ${interactionType}`)
  }

  LoggerProxy.debug(`Setting up Discord interaction trigger: ${interactionType}`)

  // Get or create Discord client with required intents
  // Note: Using 'interaction' as TriggerType since all interactions need Guilds intent
  const client = await getDiscordClient.call(this, credentials, 'interaction') // Get optional filters
  const options = this.getNodeParameter('options', {}) as {
    guildFilter?: string
    channelFilter?: string
    userFilter?: string
    ignoreBots?: boolean
  }

  // Capture 'this' context for use in event handler
  const triggerContext = this

  // Setup interaction event handler
  const interactionHandler = async (interaction: Interaction) => {
    try {
      // Apply optional filters
      if (options.ignoreBots !== false && interaction.user.bot) {
        return
      }

      if (options.guildFilter && interaction.guildId !== options.guildFilter) {
        return
      }

      if (options.channelFilter && interaction.channelId !== options.channelFilter) {
        return
      }

      if (options.userFilter && interaction.user.id !== options.userFilter) {
        return
      }

      // Apply trigger-specific filter
      const shouldTrigger = await triggerConfig.filter(interaction, triggerContext)
      if (!shouldTrigger) {
        return
      }

      // Transform interaction data for n8n workflow
      const workflowData = triggerConfig.transform(interaction) as IDataObject

      // Emit to n8n workflow
      triggerContext.emit([
        [
          {
            json: workflowData,
          },
        ],
      ])

      const identifierKey =
        'customId' in interaction
          ? interaction.customId
          : 'commandName' in interaction
            ? interaction.commandName
            : 'N/A'
      LoggerProxy.debug(`Interaction triggered workflow: ${interactionType} (identifier: ${identifierKey})`)
    } catch (error) {
      LoggerProxy.error(`Error processing interaction (${interactionType}): ${error.message}`)
    }
  }

  // Register event listener
  client.on(triggerConfig.discordEvent, interactionHandler)

  // Cleanup function
  const closeFunction = async () => {
    LoggerProxy.debug(`Cleaning up Discord interaction trigger: ${interactionType}`)
    client.off(triggerConfig.discordEvent, interactionHandler)
  }

  return {
    closeFunction,
  }
}
