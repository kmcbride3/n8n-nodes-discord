import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import { discordStateManager } from '../../helpers'
import { updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['utility'],
      operation: ['interactionManager'],
    },
  },
  [
    {
      displayName: 'Operation',
      name: 'subOperation',
      type: 'options',
      options: [
        {
          name: 'Get Pending Interactions',
          value: 'getPending',
          description: 'Retrieve all pending interactions from Discord.js Collections',
        },
        {
          name: 'Get State Statistics',
          value: 'getStats',
          description: 'Get statistics about active collectors and interactions',
        },
        {
          name: 'Get Active Collectors',
          value: 'getCollectors',
          description: 'List all active interaction collectors',
        },
        {
          name: 'Cleanup Expired Interactions',
          value: 'cleanup',
          description: 'Remove expired interactions from the Collections',
        },
      ],
      default: 'getPending',
      description: 'The interaction manager operation to perform',
    },
    {
      displayName: 'Workflow ID Filter',
      name: 'workflowIdFilter',
      type: 'string',
      default: '',
      displayOptions: {
        show: {
          subOperation: ['getPending'],
        },
      },
      description: 'Filter interactions by workflow ID (leave empty for all)',
    },
    {
      displayName: 'Max Age (minutes)',
      name: 'maxAgeMinutes',
      type: 'number',
      default: 5,
      displayOptions: {
        show: {
          subOperation: ['cleanup'],
        },
      },
      description: 'Remove interactions older than this many minutes',
    },
  ],
)

/**
 * Manages Discord interaction collectors and state
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const returnData: INodeExecutionData[] = []
  const items: INodeExecutionData[] = this.getInputData()

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const subOperation = this.getNodeParameter('subOperation', itemIndex) as string

    let resultData: IDataObject = {}

    switch (subOperation) {
      case 'getPending': {
        const workflowIdFilter = this.getNodeParameter('workflowIdFilter', itemIndex) as string
        const pendingInteractions = discordStateManager.getPendingInteractions(workflowIdFilter || undefined)

        resultData = {
          operation: 'getPending',
          workflowIdFilter: workflowIdFilter || null,
          totalInteractions: pendingInteractions.length,
          interactions: pendingInteractions,
          timestamp: new Date().toISOString(),
        }
        break
      }

      case 'getStats': {
        const stats = discordStateManager.getStats()

        resultData = {
          operation: 'getStats',
          stats,
          timestamp: new Date().toISOString(),
        }
        break
      }

      case 'getCollectors': {
        const activeCollectors = discordStateManager.getActiveCollectors()
        const collectorsData = Array.from(activeCollectors.entries()).map(([messageId, state]) => ({
          messageId,
          persistent: state.persistent,
          timeout: state.timeout,
          workflowId: state.workflowId,
          componentCount: state.components.length,
          collectorActive: !!state.collector,
        }))

        resultData = {
          operation: 'getCollectors',
          totalCollectors: activeCollectors.size,
          collectors: collectorsData,
          timestamp: new Date().toISOString(),
        }
        break
      }

      case 'cleanup': {
        const maxAgeMinutes = this.getNodeParameter('maxAgeMinutes', itemIndex) as number
        const maxAgeMs = maxAgeMinutes * 60 * 1000

        const statsBefore = discordStateManager.getStats()
        discordStateManager.cleanupExpiredInteractions(maxAgeMs)
        const statsAfter = discordStateManager.getStats()

        resultData = {
          operation: 'cleanup',
          maxAgeMinutes,
          statsBefore,
          statsAfter,
          interactionsRemoved: statsBefore.pendingInteractions - statsAfter.pendingInteractions,
          triggersRemoved: statsBefore.workflowTriggers - statsAfter.workflowTriggers,
          timestamp: new Date().toISOString(),
        }
        break
      }

      default:
        resultData = {
          error: `Unknown sub-operation: ${subOperation}`,
          timestamp: new Date().toISOString(),
        }
    }

    returnData.push({
      json: resultData,
      pairedItem: { item: itemIndex },
    })
  }

  return [returnData]
}
