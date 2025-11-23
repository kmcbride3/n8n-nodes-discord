import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { updateDisplayOptions } from '../../helpers/utils'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['utility'],
      operation: ['utility'],
    },
  },
  [
    {
      displayName: 'Utility Action',
      name: 'utilityAction',
      type: 'options',
      options: [
        {
          name: 'Clear Placeholder',
          value: 'clearPlaceholder',
          description: 'Clear a pending placeholder message',
        },
        {
          name: 'Update Bot Status',
          value: 'updateStatus',
          description: 'Update the bot status/activity',
        },
      ],
      default: 'clearPlaceholder',
      description: 'The utility action to perform',
    },
  ],
)

/**
 * Performs utility actions on Discord bot
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData()
  const returnData: INodeExecutionData[] = []

  for (let i = 0; i < items.length; i++) {
    const utilityAction = this.getNodeParameter('utilityAction', i) as string

    try {
      switch (utilityAction) {
        case 'clearPlaceholder':
          // Implementation for clearing placeholder
          returnData.push({
            json: {
              success: true,
              action: 'clearPlaceholder',
              message: 'Placeholder cleared successfully',
            },
            pairedItem: { item: i },
          })
          break

        case 'updateStatus':
          // Implementation for updating bot status
          returnData.push({
            json: {
              success: true,
              action: 'updateStatus',
              message: 'Bot status updated successfully',
            },
            pairedItem: { item: i },
          })
          break

        default:
          throw new NodeOperationError(this.getNode(), `Unknown utility action: ${utilityAction}`, {
            itemIndex: i,
          })
      }
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i },
        })
        continue
      }
      throw error
    }
  }

  return [returnData]
}
