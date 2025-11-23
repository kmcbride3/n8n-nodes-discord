/**
 * Discord Get V2 Node
 * Read-only operations for fetching Discord data
 */

import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

import * as get from './v2/actions/get'
import * as channel from './v2/actions/get/channel'
import * as event from './v2/actions/get/event'
import * as guild from './v2/actions/get/guild'
import * as message from './v2/actions/get/message'
import * as role from './v2/actions/get/role'
import * as user from './v2/actions/get/user'

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
      // Channel operations
      ...channel.getChannel.properties,
      ...channel.getPermissions.properties,
      ...channel.getThreadMembers.properties,
      ...channel.listThreads.properties,
      ...channel.listWebhooks.properties,
      // Event operations
      ...event.getEvent.properties,
      ...event.getEventUsers.properties,
      ...event.listEvents.properties,
      // Guild operations
      ...guild.getAuditLog.properties,
      ...guild.getGuild.properties,
      ...guild.listBans.properties,
      ...guild.listChannels.properties,
      ...guild.listEmojis.properties,
      ...guild.listInvites.properties,
      ...guild.listRoles.properties,
      ...guild.listWebhooks.properties,
      // Message operations
      ...message.getMessage.properties,
      ...message.getMessages.properties,
      ...message.getPinnedMessages.properties,
      ...message.getReactions.properties,
      ...message.searchMessages.properties,
      // Role operations
      ...role.getRole.properties,
      ...role.getRoleMembers.properties,
      ...role.getRolePermissions.properties,
      ...role.listRoles.properties,
      // User operations
      ...user.getMember.properties,
      ...user.getMemberRoles.properties,
      ...user.getUser.properties,
      ...user.listMembers.properties,
      ...user.searchMembers.properties,
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return get.router.call(this)
  }
}
