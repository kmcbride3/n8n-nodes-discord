import { Client } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { extractDiscordContext, handleV1BotError } from '../../../v2/helpers/error-handling'
import { checkExecutionStatus, type IExecutionStatusResponse } from '../../helpers/http-client'
import { addLog, IExecutionData } from '../helpers'
import state from '../state'

export default function (ipc: typeof Ipc, client: Client): void {
  ipc.server.on('execution', (data: IExecutionData, socket: Socket) => {
    try {
      ipc.server.emit(socket, 'execution', true)
      if (data.executionId && data.channelId) {
        state.executionMatching.set(data.executionId, {
          channelId: data.channelId,
          ...(data.userId ? { userId: data.userId } : {}),
          ...(data.workflowId ? { workflowId: data.workflowId } : {}),
        })

        if (data.placeholderId && data.apiKey && data.baseUrl) {
          const executionData = state.executionMatching.get(data.executionId)
          if (executionData) {
            executionData.placeholderId = data.placeholderId
            state.executionMatching.set(data.executionId, executionData)
          }

          // Track n8n execution status polling (not Discord API operations)
          // Note: This is NOT Discord API timeout/retry logic - Discord.js handles that automatically
          // This is for polling n8n workflow execution status to manage placeholder messages
          const executionTimeouts = new Map<string, NodeJS.Timeout>()

          const checkExecution = (
            placeholderId: string,
            executionId: string,
            apiKey: string,
            baseUrl: string,
          ): void => {
            // Clear any existing timeout for this execution
            if (executionTimeouts.has(executionId)) {
              clearTimeout(executionTimeouts.get(executionId))
              executionTimeouts.delete(executionId)
            }

            // Prevent checks if placeholder no longer exists
            if (!state.placeholderMatching.get(placeholderId)) {
              return
            }

            checkExecutionStatus(baseUrl, executionId, apiKey)
              .then((result: IExecutionStatusResponse | null) => {
                if (!result) {
                  // Clean up on null result (error occurred)
                  Reflect.deleteProperty(state.placeholderMatching, placeholderId)
                  Reflect.deleteProperty(state.executionMatching, data.executionId)
                  return
                }

                // If execution is still running, schedule another check
                if (result.finished === false && result.stoppedAt === null) {
                  // Store timeout reference for cleanup
                  const timeout = setTimeout(() => {
                    if (state.placeholderMatching.get(placeholderId)) {
                      checkExecution(placeholderId, executionId, apiKey, baseUrl)
                    }
                  }, 3000)

                  executionTimeouts.set(executionId, timeout)
                } else {
                  // Clean up when execution completes
                  Reflect.deleteProperty(state.placeholderMatching, placeholderId)
                  Reflect.deleteProperty(state.executionMatching, data.executionId)

                  // Ensure any pending timeout is cleared
                  if (executionTimeouts.has(executionId)) {
                    clearTimeout(executionTimeouts.get(executionId))
                    executionTimeouts.delete(executionId)
                  }
                }
              })
              .catch((error: Error) => {
                // Use enhanced error handling for V1 bot operations
                handleV1BotError(error, 'Discord execution check', { workflowId: data.executionId })
                addLog(`Execution check error: ${error.message}`, client, 'error')

                // Clean up on error to prevent memory leaks
                Reflect.deleteProperty(state.placeholderMatching, placeholderId)
                Reflect.deleteProperty(state.executionMatching, data.executionId)
              })
          }

          checkExecution(data.placeholderId, data.executionId, data.apiKey, data.baseUrl)
        }
      }
    } catch (error) {
      // Use enhanced error handling for V1 bot operations
      handleV1BotError(error, 'Discord execution handler', extractDiscordContext(client))
      addLog(`Error in execution handler: ${error instanceof Error ? error.message : String(error)}`, client, 'error')
    }
  })
}
