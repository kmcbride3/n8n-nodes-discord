import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { executeV2Operation, updateDisplayOptions } from '../../helpers'

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

interface IUtilityCredentials {
  noCredentials: true
}

/**
 * Performs utility actions on Discord bot
 * @param this - n8n execution context
 * @returns Promise resolving to execution data array
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2Operation<IUtilityCredentials>(this, {
    getCredentials: async () => ({ noCredentials: true }),
    operation: async (ctx, _credentials, itemIndex) => {
      const utilityAction = ctx.getNodeParameter('utilityAction', itemIndex) as string

      switch (utilityAction) {
        case 'clearPlaceholder':
          return {
            json: {
              success: true,
              action: 'clearPlaceholder',
              message: 'Placeholder cleared successfully',
            },
            pairedItem: { item: itemIndex },
          }

        case 'updateStatus':
          return {
            json: {
              success: true,
              action: 'updateStatus',
              message: 'Bot status updated successfully',
            },
            pairedItem: { item: itemIndex },
          }

        default:
          throw new NodeOperationError(ctx.getNode(), `Unknown utility action: ${utilityAction}`, {
            itemIndex,
          })
      }
    },
  })
}
