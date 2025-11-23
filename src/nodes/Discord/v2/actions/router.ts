import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { addRole, banUser, kickUser, removeRole, timeoutUser } from './member'
import { bulkDeleteMessages, deleteMessage, sendMessage } from './message'
import { sendButton, sendSelect } from './prompt'
import { interactionManager, utility } from './utility'
import { createWebhook, sendWebhook } from './webhook'

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const resource = this.getNodeParameter('resource', 0) as string
  const operation = this.getNodeParameter('operation', 0) as string

  let executionData: INodeExecutionData[][]

  try {
    switch (resource) {
      case 'message':
        switch (operation) {
          case 'send':
            executionData = await sendMessage.execute.call(this)
            break
          case 'deleteMessage':
            executionData = await deleteMessage.execute.call(this)
            break
          case 'removeMessages':
            executionData = await bulkDeleteMessages.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown message operation: ${operation}`)
        }
        break

      case 'prompt':
        switch (operation) {
          case 'button':
            executionData = await sendButton.execute.call(this)
            break
          case 'select':
            executionData = await sendSelect.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown prompt operation: ${operation}`)
        }
        break

      case 'action':
        switch (operation) {
          case 'addRole':
            executionData = await addRole.execute.call(this)
            break
          case 'removeRole':
            executionData = await removeRole.execute.call(this)
            break
          case 'kickMember':
            executionData = await kickUser.execute.call(this)
            break
          case 'banMember':
            executionData = await banUser.execute.call(this)
            break
          case 'timeoutMember':
            executionData = await timeoutUser.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown action operation: ${operation}`)
        }
        break

      case 'webhook':
        switch (operation) {
          case 'create':
            executionData = await createWebhook.execute.call(this)
            break
          case 'send':
            executionData = await sendWebhook.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown webhook operation: ${operation}`)
        }
        break

      case 'utility':
        switch (operation) {
          case 'utility':
            executionData = await utility.execute.call(this)
            break
          case 'interactionManager':
            executionData = await interactionManager.execute.call(this)
            break
          default:
            throw new NodeOperationError(this.getNode(), `Unknown utility operation: ${operation}`)
        }
        break

      default:
        throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`)
    }
  } catch (error) {
    // Don't double-wrap NodeOperationErrors - preserve original context
    if (error instanceof NodeOperationError) {
      throw error
    }
    throw new NodeOperationError(this.getNode(), error as Error, {
      description: `Error executing Discord ${resource} operation: ${operation}`,
    })
  }

  return executionData
}
