import { Client } from "discord.js"
import { EventEmitter } from "events" // Using Node.js EventEmitter

import { addLog, IExecutionData, IExecutionResponse } from "../helpers"
import state from "../state"

// Create a new instance of EventEmitter for inter-module communication
const eventEmitter = new EventEmitter()

export const setupExecutionListener = (client: Client) => {
  // Listen for execution events
  eventEmitter.on("execution", async (data: IExecutionData) => {
    try {
      if (data.executionId && data.channelId) {
        state.executionMatching[data.executionId] = {
          channelId: data.channelId,
          ...(data.userId ? { userId: data.userId } : {}),
        }

        if (data.placeholderId && data.apiKey && data.baseUrl) {
          state.executionMatching[data.executionId].placeholderId = data.placeholderId

          // Define a function to check execution status
          const checkExecution = async (
            placeholderId: string,
            executionId: string,
            apiKey: string,
            baseUrl: string,
          ) => {
            try {
              const response = await fetch(`${baseUrl}/executions/${executionId}`, {
                method: "GET",
                headers: {
                  accept: "application/json",
                  "X-N8N-API-KEY": apiKey,
                },
              })

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
              }

              const res: IExecutionResponse = (await response.json()) as IExecutionResponse

              if (res && !res.finished && res.stoppedAt === null) {
                setTimeout(() => {
                  if (state.placeholderMatching[placeholderId]) {
                    checkExecution(placeholderId, executionId, apiKey, baseUrl)
                  }
                }, 3000)
              } else {
                delete state.placeholderMatching[placeholderId]
                delete state.executionMatching[data.executionId]
              }
            } catch (error) {
              addLog(`Error checking execution: ${error}`, client)
            }
          }

          checkExecution(data.placeholderId, data.executionId, data.apiKey, data.baseUrl)
        }
      }
    } catch (error) {
      addLog(`${error}`, client)
    }
  })
}

// Function to trigger execution events from other parts of your application
export const triggerExecution = (data: IExecutionData) => {
  eventEmitter.emit("execution", data)
}
