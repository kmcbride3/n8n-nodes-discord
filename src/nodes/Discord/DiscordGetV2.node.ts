/**
 * Discord Get V2 Node
 * Read-only operations for fetching Discord data
 */

import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

import * as get from './v2/actions/get'

export class DiscordGetV2 implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Discord Get',
    name: 'discordGetV2',
    icon: 'file:discord.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Fetch data from Discord (channels, messages, users, guilds, etc.)',
    defaults: {
      name: 'Discord Get',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'discordBotApi',
        required: true,
        displayOptions: {
          show: {
            authentication: ['botToken'],
          },
        },
      },
      {
        name: 'discordOAuth2Api',
        required: true,
        displayOptions: {
          show: {
            authentication: ['oAuth2'],
          },
        },
      },
    ],
    properties: [
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          {
            name: 'Bot Token',
            value: 'botToken',
          },
          {
            name: 'OAuth2',
            value: 'oAuth2',
          },
        ],
        default: 'botToken',
      },
      ...get.getProperties,
      ...get.description,
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return get.router.call(this)
  }
}
