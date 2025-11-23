import { Attachment } from 'discord.js'
import {
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
  ITriggerFunctions,
  IWebhookFunctions,
  IWebhookResponseData,
  JsonObject,
  LoggerProxy,
  NodeConnectionTypes,
  NodeOperationError,
} from 'n8n-workflow'
import ipc from 'node-ipc'

import { options } from '../DiscordTrigger.node.options'
import { getChannelsForLoadOptions, getRolesForLoadOptions } from '../helpers/loadOptions'
import { connection, execution, ICredentials } from './bot/helpers'

const versionDescription = {
  version: 1,
  deprecated: true,
  notice: {
    type: 'warning' as const,
    title: 'V1 is Legacy - Use V2 Instead',
    content:
      'V1 uses IPC-based bot communication which is slower and requires a persistent bot process. **V2 uses Discord webhooks with direct Discord.js integration** for better reliability and simpler architecture. Please use V2 for all new workflows. [Migration Guide](https://github.com/kmcbride3/n8n-nodes-discord/blob/main/docs/migration/v1-to-v2.md)',
  },
  eventTriggerDescription: '',
  mockManualExecution: true as const,
  activationMessage: 'Your workflow will now trigger executions on the event you have defined.',
  defaults: {
    name: 'Discord Trigger',
  },
  inputs: [],
  outputs: [NodeConnectionTypes.Main],
  credentials: [
    {
      name: 'discordApi',
      required: true,
      testedBy: 'discordApiTest',
    },
  ],
  webhooks: [
    {
      name: 'default' as const,
      httpMethod: 'POST' as const,
      responseMode: 'onReceived' as const,
      path: 'webhook',
    },
  ],
  properties: options,
}

export class DiscordTriggerV1 implements INodeType {
  description: INodeTypeDescription

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      ...versionDescription,
    }
  }

  methods = {
    credentialTest: {
      discordApiTest: async function (
        this: ICredentialTestFunctions,
        credential: ICredentialsDecrypted,
      ): Promise<INodeCredentialTestResult> {
        return await discordApiTest.call(this, credential)
      },
    },
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
  }

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject()
    const { body } = require('../helpers/request-utils').normalizeRequest(req)

    return {
      workflowData: [await this.helpers.returnJsonArray(body)],
    }
  }

  async trigger(this: ITriggerFunctions): Promise<undefined> {
    const activationMode = this.getActivationMode() as 'activate' | 'update' | 'init' | 'manual'
    if (activationMode !== 'manual') {
      let baseUrl = ''

      const credentials = (await this.getCredentials('discordApi').catch((e) => {
        throw new NodeOperationError(this.getNode(), e)
      })) as unknown as ICredentials
      await connection(credentials).catch((e) => {
        throw new NodeOperationError(this.getNode(), e)
      })

      try {
        const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^/\n?]+)/gim
        let match
        while ((match = regex.exec(credentials.baseUrl)) != null) {
          baseUrl = match[0]
        }
      } catch (e) {
        LoggerProxy.warn('Failed to parse Discord base URL', { error: e instanceof Error ? e.message : String(e) })
      }

      ipc.connectTo('bot', () => {
        const { webhookId } = this.getNode()

        const parameters: Record<string, string | number | boolean | object> = {}
        Object.keys(this.getNode().parameters).forEach((key) => {
          parameters[key] = this.getNodeParameter(key, '') as string | number | boolean | object
        })

        ipc.of.bot.emit('trigger', {
          ...parameters,
          baseUrl,
          webhookId,
          active: this.getWorkflow().active,
          workflowId: this.getWorkflow().id,
          credentials,
        })
      })
    }
    return
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const executionId = this.getExecutionId()
    const input = this.getInputData()
    const credentials = (await this.getCredentials('discordApi').catch((e) => {
      throw new NodeOperationError(this.getNode(), e)
    })) as unknown as ICredentials
    const placeholderId = input[0].json?.placeholderId as string
    const channelId = input[0].json?.channelId as string
    const userId = input[0].json?.userId as string
    const userName = input[0].json?.userName as string
    const userTag = input[0].json?.userTag as string
    const messageId = input[0].json?.messageId as string
    const content = input[0].json?.content as string
    const presence = input[0].json?.presence as string
    const nick = input[0].json?.nick as string
    const addedRoles = input[0].json?.addedRoles as string
    const removedRoles = input[0].json?.removedRoles as string
    const interactionMessageId = input[0].json?.interactionMessageId as string
    const interactionValues = input[0].json?.interactionValues as string[]
    const userRoles = input[0].json?.userRoles as string[]
    const attachments = input[0].json?.attachments as Attachment[]

    const workflowId = this.getWorkflow().id

    await execution(
      executionId,
      placeholderId,
      channelId,
      credentials.apiKey,
      credentials.baseUrl,
      userId,
      workflowId,
    ).catch((e) => handleExecutionError.call(this, e, 0, []))
    const returnData: INodeExecutionData[] = []
    returnData.push({
      json: {
        content,
        channelId,
        userId,
        userName,
        userTag,
        messageId,
        presence,
        nick,
        addedRoles,
        removedRoles,
        interactionMessageId,
        interactionValues,
        userRoles,
        ...(attachments?.length ? { attachments } : {}),
      },
    })
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
