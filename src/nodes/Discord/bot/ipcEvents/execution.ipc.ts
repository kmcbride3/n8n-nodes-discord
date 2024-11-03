import axios from 'axios'

import { addLog, IExecutionData } from '../helpers'
import state from '../state'

export default async function (process: NodeJS.Process) {
  process.on('message', async (message: { type: string; data: IExecutionData }) => {
    if (message.type === 'execution') {
      const data = message.data
      try {
        if (process.send) {
          process.send({ type: 'execution', data: true })
        }
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
                accept: 'application/json',
                'X-N8N-API-KEY': apiKey,
              }
              const res = await axios.get(`${data.baseUrl}/executions/${executionId}`, { headers }).catch((e) => e)
              if (res && res.data && res.data.finished === false && res.data.stoppedAt === null) {
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
        addLog(`${e}`, state.client)
      }
    }
  })
}
