import type {
  INodeType,
  INodeTypeBaseDescription,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
} from 'n8n-workflow'
import { NodeConnectionTypes } from 'n8n-workflow'

import { getAllLoadOptions } from './methods/loadOptions'
import { getInteractionTriggerProperties } from './properties/interactionProperties'
import { interactionRouter } from './triggers/interactionRouter'

export class DiscordInteractionV2 implements INodeType {
  description: INodeTypeDescription

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      displayName: 'Discord Interaction',
      name: 'discordInteraction',
      icon: 'file:discord.svg',
      group: ['trigger'],
      version: 2,
      subtitle: '={{$parameter["interactionType"] || "Discord interaction"}}',
      description: 'Handle Discord interactions (buttons, select menus, modals, commands)',
      defaults: {
        name: 'Discord Interaction',
      },
      inputs: [],
      outputs: [NodeConnectionTypes.Main],
      credentials: [
        {
          name: 'discordBotApi',
          required: true,
        },
      ],
      properties: getInteractionTriggerProperties(),
    }
  }

  methods = {
    loadOptions: {
      ...getAllLoadOptions(),
    },
  }

  /**
   * Event-driven interaction trigger using Discord.js WebSocket Gateway
   * Handles all interaction types: buttons, select menus, modals, slash commands
   * Uses persistent WebSocket connection - no webhook required
   */
  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {
    return await interactionRouter.call(this)
  }
}
