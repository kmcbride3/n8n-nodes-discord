import type {
  ICredentialsDecrypted,
  ICredentialTestFunctions,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeCredentialTestResult,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeBaseDescription,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow'
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow'

import { options } from '../Discord.node.options'
import { getChannelsForLoadOptions, getRolesForLoadOptions } from '../helpers/loadOptions'
import bot from './bot'
import { connection, ICredentials, ipcRequest } from './bot/helpers'

// we start the bot if we are in the main process
if (!process.send) bot()

const versionDescription = {
  version: 1,
  defaults: {
    name: 'Discord Send',
  },
  deprecated: true,
  notice: {
    type: 'warning' as const,
    title: 'V1 is Legacy - Use V2 Instead',
    content:
      'V1 uses IPC-based bot communication which is slower and more complex. **V2 uses direct Discord.js REST API integration** with better performance, type safety, and error handling. Please use V2 for all new workflows. [Migration Guide](https://github.com/kmcbride3/n8n-nodes-discord/blob/main/docs/migration/v1-to-v2.md)',
  },
  usableAsTool: true as const,
  inputs: [NodeConnectionTypes.Main],
  outputs: [NodeConnectionTypes.Main],
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
  workflowId?: string
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
  type?: string
  placeholder?: boolean
  apiKey?: string
  baseUrl?: string
  auditLogReason?: string
}

export interface IDiscordNodePromptParameters {
  executionId: string
  workflowId?: string
  triggerPlaceholder: boolean
  triggerChannel: boolean
  channelId: string
  mentionRoles: string[]
  content: string
  timeout: number
  placeholder: boolean
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
  workflowId?: string
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

export class DiscordV1 implements INodeType {
  description: INodeTypeDescription

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      ...versionDescription,
    }
  }

  methods = {
    loadOptions: {
      async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          return await getChannelsForLoadOptions.call(this)
        } catch (e) {
          throw new NodeOperationError(this.getNode(), e)
        }
      },
      async getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          return await getRolesForLoadOptions.call(this)
        } catch (e) {
          throw new NodeOperationError(this.getNode(), e)
        }
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
      const nodeParameters: Record<string, string | number | boolean | object> = {}

      // Get all node parameters
      Object.keys(this.getNode().parameters || {}).forEach((key) => {
        nodeParameters[key] = this.getNodeParameter(key, itemIndex, '') as string | number | boolean | object
      })

      nodeParameters.executionId = executionId
      const workflowId = this.getWorkflow().id
      if (workflowId) {
        nodeParameters.workflowId = workflowId
      }
      if (credentials.apiKey) {
        nodeParameters.apiKey = credentials.apiKey
      }
      nodeParameters.baseUrl = credentials.baseUrl
      nodeParameters.auditLogReason = this.getNodeParameter('auditLogReason', itemIndex, '') as string

      if (nodeParameters.channelId || nodeParameters.executionId) {
        // return the interaction result if there is one
        const res = await ipcRequest(
          `send:${
            ['select', 'button'].includes(nodeParameters.type as string)
              ? 'prompt'
              : nodeParameters.type === 'none'
                ? 'action'
                : nodeParameters.type
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

    return [returnData]
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
