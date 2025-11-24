/**
 * Discord Get V2 Node
 * Read-only operations for fetching Discord data
 */

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeBaseDescription,
  INodeTypeDescription,
} from 'n8n-workflow'

import { options } from '../DiscordGet.node.options'
import * as channel from './actions/channel'
import * as event from './actions/event'
import * as guild from './actions/guild'
import * as member from './actions/member'
import * as message from './actions/message'
import * as role from './actions/role'
import { router } from './actions/router'
import * as user from './actions/user'
import { versionDescription } from './actions/versionDescription'
import { getAllLoadOptions } from './methods/loadOptions'

export class DiscordGetV2 implements INodeType {
  description: INodeTypeDescription

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      version: 2,
      defaults: {
        name: 'Discord Get',
      },
      inputs: ['main'],
      outputs: ['main'],
      credentials: versionDescription.credentials.filter((cred) =>
        ['discordBotApi', 'discordOAuth2Api'].includes(cred.name),
      ),
      properties: [
        {
          displayName: 'Authentication',
          name: 'authentication',
          type: 'options',
          options: [
            {
              name: 'Bot Token',
              value: 'botToken',
              description: 'Authenticate using a Discord bot token',
            },
            {
              name: 'OAuth2',
              value: 'oAuth2',
              description: 'Authenticate using OAuth2',
            },
          ],
          default: 'botToken',
        },
        {
          displayName: 'Resource',
          name: 'resource',
          type: 'options',
          noDataExpression: true,
          options: [
            {
              name: 'Channel',
              value: 'channel',
              description: 'Get channel information, permissions, threads, and webhooks',
            },
            {
              name: 'Event',
              value: 'event',
              description: 'Get scheduled events and event participants',
            },
            {
              name: 'Guild',
              value: 'guild',
              description: 'Get guild information, channels, roles, and audit logs',
            },
            {
              name: 'Member',
              value: 'member',
              description: 'Get guild member information and roles',
            },
            {
              name: 'Message',
              value: 'message',
              description: 'Get messages, reactions, and search message history',
            },
            {
              name: 'Role',
              value: 'role',
              description: 'Get role information, members, and permissions',
            },
            {
              name: 'User',
              value: 'user',
              description: 'Get global Discord user information',
            },
          ],
          default: 'channel',
        },
        ...channel.description,
        ...event.description,
        ...guild.description,
        ...member.description,
        ...message.description,
        ...role.description,
        ...user.description,
        ...options,
      ],
    }
  }

  methods = {
    loadOptions: {
      ...getAllLoadOptions(),
    },
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return await router.call(this)
  }
}
