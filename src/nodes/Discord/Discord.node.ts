import { Client, GatewayIntentBits } from "discord.js"
import {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
} from "n8n-workflow"

import bot from "./bot"
import {
  connection,
  getChannels as getChannelsHelper,
  getRoles as getRolesHelper,
  ICredentials,
  triggerWorkflow,
} from "./bot/helpers"
import { options } from "./Discord.node.options"

// we start the bot if we are in the main process
if (!process.send) {
  bot()
}

const nodeDescription: INodeTypeDescription = {
  displayName: "Discord Send",
  name: "discord",
  group: ["discord"],
  version: 1,
  description: "Sends messages, embeds and prompts to Discord",
  defaults: {
    name: "Discord Send",
  },
  icon: "file:discord.svg",
  inputs: [NodeConnectionType.Main],
  outputs: [NodeConnectionType.Main],
  credentials: [
    {
      name: "discordApi",
      required: true,
    },
  ],
  properties: options,
}

export interface IDiscordNodeMessageParameters {
  executionId: string
  triggerPlaceholder: boolean
  triggerChannel: boolean
  channelId: string
  embed: boolean
  title: string
  description: string
  url: string
  color: string
  timestamp: string
  footerText: string
  footerIconUrl: string
  imageUrl: string
  thumbnailUrl: string
  authorName: string
  authorIconUrl: string
  authorUrl: string
  fields: {
    field?: {
      name: string
      value: string
      inline: boolean
    }[]
  }
  mentionRoles: string[]
  content: string
  files: {
    file?: {
      url: string
    }[]
  }
}

export interface IDiscordNodePromptParameters {
  executionId: string
  triggerPlaceholder: boolean
  triggerChannel: boolean
  channelId: string
  mentionRoles: string[]
  content: string
  timeout: number
  placeholder: string
  apiKey: string
  baseUrl: string
  buttons: {
    button?: {
      value: string
      label: string
      style: number
    }[]
  }
  select: {
    select?: {
      value: string
      label: string
      description: string
    }[]
  }
  persistent: boolean
  minSelect: number
  maxSelect: number
  updateMessageId: string
}

export interface IDiscordNodeActionParameters {
  executionId: string
  triggerPlaceholder: boolean
  triggerChannel: boolean
  channelId: string
  apiKey: string
  baseUrl: string
  actionType: string
  removeMessagesNumber: number
  userId?: string
  roleUpdateIds?: string[] | string
}

export class Discord implements INodeType {
  description: INodeTypeDescription = nodeDescription

  methods = {
    loadOptions: {
      async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const client = new Client({
          intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        })
        const credentials = (await this.getCredentials("discordApi").catch((e) => e)) as any as ICredentials
        await connection(credentials, client)
        return await getChannelsHelper(client).catch((e) => e)
      },
      async getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const client = new Client({
          intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        })
        const credentials = (await this.getCredentials("discordApi").catch((e) => e)) as any as ICredentials
        await connection(credentials, client)
        return await getRolesHelper(client).catch((e) => e)
      },
    },
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const executionId = this.getExecutionId()
    const returnData: INodeExecutionData[] = []

    // connection
    const credentials = (await this.getCredentials("discordApi").catch((e) => e)) as any as ICredentials
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    })
    await connection(credentials, client).catch((e) => {
      throw new Error(e)
    })

    // execution
    const items: INodeExecutionData[] = this.getInputData()
    for (let itemIndex: number = 0; itemIndex < items.length; itemIndex++) {
      const nodeParameters: any = {}
      Object.keys(this.getNode().parameters).forEach((key) => {
        nodeParameters[key] = this.getNodeParameter(key, itemIndex, "") as any
      })
      nodeParameters.executionId = executionId
      nodeParameters.apiKey = credentials.apiKey
      nodeParameters.baseUrl = credentials.baseUrl

      if (nodeParameters.channelId || nodeParameters.executionId) {
        // return the interaction result if there is one
        const res = await triggerWorkflow(
          nodeParameters.webhookId,
          null,
          nodeParameters.placeholderId,
          nodeParameters.baseUrl,
          undefined,
          nodeParameters.channelId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ).catch((e) => {
          throw new Error(e)
        })

        returnData.push({
          json: {
            value: res,
            channelId: nodeParameters.channelId,
            userId: nodeParameters.userId,
            userName: nodeParameters.userName,
            userTag: nodeParameters.userTag,
            messageId: nodeParameters.messageId,
            action: nodeParameters.action,
          },
        })
      }

      if (nodeParameters.placeholder) await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return this.prepareOutputData(returnData)
  }
}
