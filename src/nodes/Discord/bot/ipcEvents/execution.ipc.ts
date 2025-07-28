import axios from 'axios'
import { Client } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

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
        })

        if (data.placeholderId && data.apiKey && data.baseUrl) {
          state.executionMatching.get(data.executionId)!.placeholderId = data.placeholderId

          // Track execution timeouts to prevent memory leaks
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
            if (!state.placeholderMatching[placeholderId]) {
              return
            }

            const headers = {
              accept: 'application/json',
              'X-N8N-API-KEY': apiKey,
            }

            axios
              .get(`${baseUrl}/executions/${executionId}`, { headers })
              .then((res) => {
                // If execution is still running, schedule another check
                if (res?.data?.finished === false && res.data.stoppedAt === null) {
                  // Store timeout reference for cleanup
                  const timeout = setTimeout(() => {
                    if (state.placeholderMatching[placeholderId]) {
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
              .catch((error) => {
                addLog(`Execution check error: ${error instanceof Error ? error.message : String(error)}`, client)

                // Clean up on error to prevent memory leaks
                Reflect.deleteProperty(state.placeholderMatching, placeholderId)
                Reflect.deleteProperty(state.executionMatching, data.executionId)
              })
          }

          checkExecution(data.placeholderId, data.executionId, data.apiKey, data.baseUrl)
        }
      }
    } catch (error) {
      addLog(`Error in execution handler: ${error instanceof Error ? error.message : String(error)}`, client)
    }
  })
}
