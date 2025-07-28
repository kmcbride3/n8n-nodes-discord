import {
  ICredentialsDecrypted,
  ICredentialTestFunctions,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeCredentialTestResult,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  JsonObject,
  NodeConnectionType,
  NodeOperationError,
} from 'n8n-workflow'

import bot from './bot'
import {
  connection,
  getChannels as getChannelsHelper,
  getRoles as getRolesHelper,
  ICredentials,
  ipcRequest,
} from './bot/helpers'
import { options } from './Discord.node.options'

// we start the bot if we are in the main process
if (!process.send) bot()

const nodeDescription: INodeTypeDescription = {
  displayName: 'Discord Send',
  name: 'discord',
  group: ['discord'],
  version: 1,
  description: 'Sends messages, embeds and prompts to Discord',
  defaults: {
    name: 'Discord Send',
  },
  icon: 'file:discord.svg',
  inputs: [NodeConnectionType.Main],
  outputs: [NodeConnectionType.Main],
  credentials: [
    {
      name: 'discordApi',
      required: true,
      testedBy: 'discordApiTest',
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
  auditLogReason: string
}

export class Discord implements INodeType {
  description: INodeTypeDescription = nodeDescription

  methods = {
    loadOptions: {
      async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = (await this.getCredentials('discordApi')) as ICredentials
        return await getChannelsHelper(credentials).catch((e) => {
          throw new NodeOperationError(this.getNode(), e)
        })
      },
      async getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = (await this.getCredentials('discordApi')) as ICredentials
        return await getRolesHelper(credentials).catch((e) => {
          throw new NodeOperationError(this.getNode(), e)
        })
      },
    },
    credentialTest: {
      discordApiTest,
    },
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const executionId = this.getExecutionId()
    const returnData: INodeExecutionData[] = []

    // connection
    const credentials = (await this.getCredentials('discordApi').catch((e) => {
      throw new NodeOperationError(this.getNode(), e)
    })) as unknown as ICredentials
    await connection(credentials).catch((e) => {
      throw new NodeOperationError(this.getNode(), e)
    })

    // execution
    const items: INodeExecutionData[] = this.getInputData()
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const nodeParameters: Record<string, object> = {}
      Object.keys(this.getNode().parameters).forEach((key) => {
        const value = this.getNodeParameter(key, itemIndex, '')
        nodeParameters[key] = typeof value === 'object' && value !== null ? value : { value }
      })
      nodeParameters.executionId = { value: executionId }
      nodeParameters.apiKey = { value: credentials.apiKey }
      nodeParameters.baseUrl = { value: credentials.baseUrl }
      nodeParameters.auditLogReason = { value: this.getNodeParameter('auditLogReason', itemIndex, '') }

      if (nodeParameters.channelId || nodeParameters.executionId) {
        // return the interaction result if there is one
        const res = await ipcRequest(
          `send:${
            ['select', 'button'].includes(
              typeof nodeParameters.type === 'object' && nodeParameters.type !== null && 'value' in nodeParameters.type
                ? String((nodeParameters.type as { value: unknown }).value)
                : '',
            )
              ? 'prompt'
              : (
                    typeof nodeParameters.type === 'object' &&
                    nodeParameters.type !== null &&
                    'value' in nodeParameters.type
                      ? (nodeParameters.type as { value: unknown }).value === 'none'
                      : typeof nodeParameters.type === 'string' && nodeParameters.type === 'none'
                  )
                ? 'action'
                : typeof nodeParameters.type === 'object' &&
                    nodeParameters.type !== null &&
                    'value' in nodeParameters.type
                  ? String((nodeParameters.type as { value: unknown }).value)
                  : String(nodeParameters.type)
          }`,
          nodeParameters,
        ).catch((e) => {
          handleExecutionError.call(this, e, itemIndex, returnData)
        })

        if (res) {
          returnData.push(createReturnData(res))
        }
      }

      if (nodeParameters.placeholder) await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return this.prepareOutputData(returnData)
  }
}

function handleExecutionError(this: IExecuteFunctions, e: Error, itemIndex: number, returnData: INodeExecutionData[]) {
  if (this.continueOnFail()) {
    returnData.push({
      json: this.getInputData(itemIndex)[0].json,
      error: new NodeOperationError(this.getNode(), e),
      pairedItem: itemIndex,
    })
  } else {
    throw new NodeOperationError(this.getNode(), e, {
      itemIndex,
    })
  }
}

function createReturnData(res: {
  value?: string
  channelId?: string
  userId?: string
  userName?: string
  userTag?: string
  messageId?: string
  action?: string
}): INodeExecutionData {
  return {
    json: {
      value: res?.value,
      channelId: res?.channelId,
      userId: res?.userId,
      userName: res?.userName,
      userTag: res?.userTag,
      messageId: res?.messageId,
      action: res?.action,
    },
  }
}

async function discordApiTest(
  this: ICredentialTestFunctions,
  credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
  const requestOptions = {
    method: 'GET',
    uri: 'https://discord.com/api/v10/oauth2/@me',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'DiscordBot (https://www.discord.com, 1)',
      Authorization: `Bot ${credential.data?.token}`,
    },
    json: true,
  }

  try {
    await this.helpers.request(requestOptions)
  } catch (error) {
    return {
      status: 'Error',
      message: `Connection details not valid: ${(error as JsonObject).message}`,
    }
  }
  return {
    status: 'OK',
    message: 'Authentication successful!',
  }
}
