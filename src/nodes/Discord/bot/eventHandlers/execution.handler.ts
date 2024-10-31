import { Client } from "discord.js"

import { addLog, IExecutionData } from "../helpers"
import state from "../state"

export default function executionHandler(client: Client) {
  client.on("execution", async (data: IExecutionData) => {
    try {
      client.emit("execution", true)
      if (data.executionId && data.channelId) {
        state.executionMatching[data.executionId] = {
          channelId: data.channelId,
          ...(data.userId ? { userId: data.userId } : {}),
        }
        if (data.placeholderId && data.apiKey && data.baseUrl) {
          state.executionMatching[data.executionId].placeholderId = data.placeholderId
          const checkExecution = async (
            placeholderId: string,
            executionId: string,
            apiKey: string,
            baseUrl: string,
          ) => {
            const headers = {
              accept: "application/json",
              "X-N8N-API-KEY": apiKey,
            }
            const response = await fetch(`${baseUrl}/executions/${executionId}`, { headers })
            const res = (await response.json()) as { finished: boolean; stoppedAt: string | null }
            if (res && res.finished === false && res.stoppedAt === null) {
              setTimeout(() => {
                if (state.placeholderMatching[placeholderId])
                  checkExecution(placeholderId, executionId, apiKey, baseUrl)
              }, 3000)
            } else {
              delete state.placeholderMatching[placeholderId]
              delete state.executionMatching[data.executionId]
            }
          }
          checkExecution(data.placeholderId, data.executionId, data.apiKey, data.baseUrl)
        }
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
