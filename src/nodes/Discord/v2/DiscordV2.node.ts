import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeBaseDescription,
  INodeTypeDescription,
} from 'n8n-workflow'
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow'

import { router } from './actions/router'
import { getAllLoadOptions } from './methods/loadOptions'
import { getAllProperties } from './properties'
import { nodeVersionDescription } from './versionDescriptions'

export class DiscordV2 implements INodeType {
  description: INodeTypeDescription

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      ...nodeVersionDescription,
      version: 2,
      defaults: {
        name: 'Discord',
      },
      inputs: [NodeConnectionTypes.Main],
      outputs: [NodeConnectionTypes.Main],
      properties: getAllProperties(),
    }
  }

  methods = {
    loadOptions: {
      ...getAllLoadOptions(),
    },
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    try {
      return await router.call(this)
    } catch (error) {
      if (error instanceof NodeOperationError) {
        throw error
      }
      throw new NodeOperationError(this.getNode(), `Discord operation failed: ${error.message}`, {
        description: 'An unexpected error occurred while executing the Discord operation',
      })
    }
  }
}
