import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeBaseDescription,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
  NodeConnectionTypes,
} from 'n8n-workflow'

import { getAllLoadOptions } from './methods/loadOptions'
import { getTriggerProperties } from './properties'
import { executeRouter, router } from './triggers/router'
import { triggerVersionDescription } from './versionDescriptions'

export class DiscordTriggerV2 implements INodeType {
  description: INodeTypeDescription

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      ...triggerVersionDescription,
      version: 2,
      defaults: {
        name: 'Discord Trigger',
      },
      inputs: [],
      outputs: [NodeConnectionTypes.Main],
      properties: getTriggerProperties(),
    }
  }

  methods = {
    loadOptions: {
      ...getAllLoadOptions(),
    },
  }

  /**
   * Event-driven trigger setup using Discord.js WebSocket Gateway
   * All triggers (messages, commands, interactions, user events, threads) use
   * persistent WebSocket connection - no webhook/public internet access required
   */
  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {
    // Use existing event-driven router that leverages Discord.js WebSocket events
    return await router.call(this)
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return await executeRouter.call(this)
  }
}
