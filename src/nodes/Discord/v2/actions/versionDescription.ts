import type { INodeProperties } from 'n8n-workflow'

import * as member from './member'
import * as message from './message'
import * as prompt from './prompt'
import * as utility from './utility'
import * as webhook from './webhook'

export const versionDescription = {
  version: 2,
  defaults: {
    name: 'Discord Send',
  },
  usableAsTool: true as const,
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
    {
      name: 'discordWebhookApi',
      displayOptions: {
        show: {
          authentication: ['webhook'],
        },
      },
    },
    {
      name: 'discordApi',
      required: true,
      testedBy: 'discordApiTest',
      displayOptions: {
        show: {
          authentication: ['custom'],
        },
      },
    },
  ],
  properties: [
    {
      displayName: 'Connection Type',
      name: 'authentication',
      type: 'options',
      options: [
        {
          name: 'Bot Token',
          value: 'botToken',
          description: 'Manage messages, channels, and members on a server',
        },
        {
          name: 'OAuth2',
          value: 'oAuth2',
          description: "Same features as 'Bot Token' with easier Bot installation",
        },
        {
          name: 'Webhook',
          value: 'webhook',
          description: 'Send messages to a specific channel',
        },
        {
          name: 'Custom (Legacy)',
          value: 'custom',
          description: 'Custom Discord API with n8n integration (legacy)',
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
          name: 'Message',
          value: 'message',
          description: 'Send a message to a Discord channel',
        },
        {
          name: 'Prompt',
          value: 'prompt',
          description: 'Send interactive prompts with buttons or select menus',
        },
        {
          name: 'Action',
          value: 'action',
          description: 'Perform Discord actions like role management or message cleanup',
        },
        {
          name: 'Webhook',
          value: 'webhook',
          description: 'Create or send messages through Discord webhooks',
        },
        {
          name: 'Utility',
          value: 'utility',
          description: 'Perform utility actions like clearing placeholders or updating bot status',
        },
      ],
      default: 'message',
    },
    ...message.description,
    ...prompt.description,
    ...member.description,
    ...webhook.description,
    ...utility.description,
  ] as INodeProperties[],
}
