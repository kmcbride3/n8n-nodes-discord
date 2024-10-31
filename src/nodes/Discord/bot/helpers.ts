import { ChannelType, Client, GuildChannel, Message, User } from "discord.js"
import https from "https"
import { INodePropertyOptions } from "n8n-workflow"

import state from "./state"

export interface ICredentials {
  clientId: string
  token: string
  apiKey: string
  baseUrl: string
}

export const connection = async (credentials: ICredentials, client: Client): Promise<void> => {
  if (!credentials || !credentials.token || !credentials.clientId) {
    throw new Error("credentials missing")
  }

  await client.login(credentials.token)
}

export const getChannels = async (client: Client): Promise<INodePropertyOptions[]> => {
  const channels = client.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildText)
    .map((channel) => ({
      name: (channel as GuildChannel).name,
      value: channel.id,
    }))

  if (channels.length === 0) {
    throw new Error("Your Discord server has no text channels, please add at least one text channel.")
  }

  return channels
}

export const getRoles = async (client: Client): Promise<INodePropertyOptions[]> => {
  const roles = client.guilds.cache
    .first()
    ?.roles.cache.filter((role) => role.name !== "@everyone")
    .map((role) => ({
      name: role.name,
      value: role.id,
    }))

  if (!roles || roles.length === 0) {
    throw new Error(
      "Your Discord server has no roles, please add at least one if you want to restrict the trigger to specific users.",
    )
  }

  return roles
}

export const triggerWorkflow = async (
  webhookId: string,
  message: Message | null,
  placeholderId: string,
  baseUrl: string,
  user?: User,
  channelId?: string,
  presence?: string,
  nick?: string,
  addedRoles?: string[],
  removedRoles?: string[],
  interactionMessageId?: string,
  interactionValues?: string[],
  userRoles?: string[],
): Promise<boolean> => {
  const data = JSON.stringify({
    content: message?.content,
    channelId: message?.channelId ?? channelId,
    placeholderId,
    userId: message?.author.id ?? user?.id,
    userName: message?.author.username ?? user?.username,
    userTag: message?.author.tag ?? user?.tag,
    messageId: message?.id,
    attachments: message?.attachments,
    presence,
    nick,
    addedRoles,
    removedRoles,
    interactionMessageId,
    interactionValues,
    userRoles,
  })

  const options = {
    hostname: new URL(baseUrl).hostname,
    port: 443,
    path: `/webhook${state.testMode ? "-test" : ""}/${webhookId}/webhook`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.on("data", (d) => {
        process.stdout.write(d)
      })

      res.on("end", () => {
        resolve(true)
      })
    })

    req.on("error", (e) => {
      console.error(e)
      if (state.triggers[webhookId] && !state.testMode) {
        state.triggers[webhookId].active = false
      }
      reject(false)
    })

    req.write(data)
    req.end()
  })
}

export const addLog = (message: string, client: Client) => {
  console.log(message)
  if (state.logs.length > 99) state.logs.shift()
  const log = `${new Date().toISOString()} -  ${message}`
  state.logs.push(log)

  if (state.ready && state.autoLogs) {
    const channel = client.channels.cache.get(state.autoLogsChannelId) as any
    if (channel) channel.send("**" + log + "**")
  }
}

export const pollingPromptData = (message: any, content: string, seconds: number, client: any): Promise<boolean> => {
  return new Promise((resolve) => {
    let i = 1
    const waiting = async () => {
      if (state.promptData[message.id]?.value || (seconds && i > seconds)) {
        if (!state.promptData[message.id]?.value) {
          await message.edit({ content: content, components: [] }).catch((e: any) => e)
          const channel = client.channels.cache.get(message.channelId) as any
          if (channel) await channel.send("Timeout reached").catch((e: any) => e)
        }
        resolve(true)
        return
      } else if (seconds && !state.promptData[message.id]?.value) {
        await message.edit({ content: content + ` (${seconds - i}s)` }).catch((e: any) => e)
      }
      i++
      setTimeout(() => waiting(), 1000)
    }
    waiting()
  })
}

export interface IExecutionData {
  executionId: string
  placeholderId: string
  channelId: string
  apiKey: string
  baseUrl: string
  userId?: string
}

export const execution = async (
  executionId: string,
  placeholderId: string,
  channelId: string,
  apiKey: string,
  baseUrl: string,
  userId?: string,
): Promise<boolean> => {
  const data = JSON.stringify({
    executionId,
    placeholderId,
    channelId,
    apiKey,
    baseUrl,
    userId,
  })

  const options = {
    hostname: new URL(baseUrl).hostname,
    port: 443,
    path: `/execution`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = ""

      res.on("data", (chunk) => {
        responseData += chunk
      })

      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(true)
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`))
        }
      })
    })

    req.on("error", (e) => {
      console.error(e)
      reject(false)
    })

    req.write(data)
    req.end()
  })
}

export interface IExecutionResponse {
  finished: boolean // Indicates if the execution has finished
  stoppedAt: Date | null // The time the execution was stopped, or null if still running
}

export const placeholderLoading = async (placeholder: Message, placeholderMatchingId: string, txt: string) => {
  state.placeholderMatching[placeholderMatchingId] = placeholder.id
  state.placeholderWaiting[placeholderMatchingId] = true
  let i = 0
  const waiting = async () => {
    i++
    if (i > 3) i = 0
    let content = txt + ""
    for (let j = 0; j < i; j++) content += "."

    if (!state.placeholderMatching[placeholderMatchingId]) {
      await placeholder.edit(txt).catch((e: any) => e)
      delete state.placeholderWaiting[placeholderMatchingId]
      return
    }
    await placeholder.edit(content).catch((e: any) => e)
    setTimeout(async () => {
      if (state.placeholderMatching[placeholderMatchingId]) waiting()
      else {
        await placeholder.edit(txt).catch((e: any) => e)
        delete state.placeholderWaiting[placeholderMatchingId]
      }
    }, 800)
  }
  waiting()
}

export function withTimeout<T>(promise: Promise<T>, ms: number) {
  const timeout = new Promise((resolve, reject) => setTimeout(() => reject(`Timed out after ${ms} ms.`), ms))
  return Promise.race([promise, timeout])
}
