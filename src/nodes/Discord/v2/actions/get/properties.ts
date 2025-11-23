/**
 * Discord Get Node Properties
 * Defines all resources and operations for the Discord Get node
 */

import type { INodeProperties } from 'n8n-workflow'

export const getProperties: INodeProperties[] = [
  {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    noDataExpression: true,
    options: [
      {
        name: 'Channel',
        value: 'channel',
        description: 'Get information about Discord channels',
      },
      {
        name: 'Event',
        value: 'event',
        description: 'Get information about scheduled events',
      },
      {
        name: 'Guild',
        value: 'guild',
        description: 'Get information about Discord guilds (servers)',
      },
      {
        name: 'Message',
        value: 'message',
        description: 'Get information about messages',
      },
      {
        name: 'Role',
        value: 'role',
        description: 'Get information about roles',
      },
      {
        name: 'User',
        value: 'user',
        description: 'Get information about users and members',
      },
    ],
    default: 'message',
    required: true,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['channel'],
      },
    },
    options: [
      {
        name: 'Get Channel',
        value: 'getChannel',
        description: 'Get information about a specific channel',
        action: 'Get a channel',
      },
      {
        name: 'Get Permissions',
        value: 'getPermissions',
        description: 'Get permission overwrites for a channel',
        action: 'Get channel permissions',
      },
      {
        name: 'Get Thread Members',
        value: 'getThreadMembers',
        description: 'Get members of a thread channel',
        action: 'Get thread members',
      },
      {
        name: 'List Threads',
        value: 'listThreads',
        description: 'List all threads in a channel',
        action: 'List threads',
      },
      {
        name: 'List Webhooks',
        value: 'listWebhooks',
        description: 'List all webhooks in a channel',
        action: 'List channel webhooks',
      },
    ],
    default: 'getChannel',
    required: true,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['event'],
      },
    },
    options: [
      {
        name: 'Get Event',
        value: 'getEvent',
        description: 'Get information about a scheduled event',
        action: 'Get an event',
      },
      {
        name: 'Get Event Users',
        value: 'getEventUsers',
        description: 'Get users interested in a scheduled event',
        action: 'Get event users',
      },
      {
        name: 'List Events',
        value: 'listEvents',
        description: 'List all scheduled events in a guild',
        action: 'List events',
      },
    ],
    default: 'getEvent',
    required: true,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['guild'],
      },
    },
    options: [
      {
        name: 'Get Audit Log',
        value: 'getAuditLog',
        description: 'Get audit log entries for a guild',
        action: 'Get audit log',
      },
      {
        name: 'Get Guild',
        value: 'getGuild',
        description: 'Get information about a guild',
        action: 'Get a guild',
      },
      {
        name: 'List Bans',
        value: 'listBans',
        description: 'List all bans in a guild',
        action: 'List bans',
      },
      {
        name: 'List Channels',
        value: 'listChannels',
        description: 'List all channels in a guild',
        action: 'List channels',
      },
      {
        name: 'List Emojis',
        value: 'listEmojis',
        description: 'List all custom emojis in a guild',
        action: 'List emojis',
      },
      {
        name: 'List Invites',
        value: 'listInvites',
        description: 'List all invites for a guild',
        action: 'List invites',
      },
      {
        name: 'List Roles',
        value: 'listRoles',
        description: 'List all roles in a guild',
        action: 'List roles',
      },
      {
        name: 'List Webhooks',
        value: 'listWebhooks',
        description: 'List all webhooks in a guild',
        action: 'List guild webhooks',
      },
    ],
    default: 'getGuild',
    required: true,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['message'],
      },
    },
    options: [
      {
        name: 'Get Message',
        value: 'getMessage',
        description: 'Get a specific message by ID',
        action: 'Get a message',
      },
      {
        name: 'Get Messages',
        value: 'getMessages',
        description: 'Get multiple messages from a channel',
        action: 'Get messages',
      },
      {
        name: 'Get Pinned Messages',
        value: 'getPinnedMessages',
        description: 'Get all pinned messages in a channel',
        action: 'Get pinned messages',
      },
      {
        name: 'Get Reactions',
        value: 'getReactions',
        description: 'Get reaction data for a message',
        action: 'Get reactions',
      },
      {
        name: 'Search Messages',
        value: 'searchMessages',
        description: 'Search for messages with filters',
        action: 'Search messages',
      },
    ],
    default: 'getMessage',
    required: true,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['role'],
      },
    },
    options: [
      {
        name: 'Get Role',
        value: 'getRole',
        description: 'Get information about a specific role',
        action: 'Get a role',
      },
      {
        name: 'Get Role Members',
        value: 'getRoleMembers',
        description: 'Get all members with a specific role',
        action: 'Get role members',
      },
      {
        name: 'Get Role Permissions',
        value: 'getRolePermissions',
        description: 'Get permissions for a role',
        action: 'Get role permissions',
      },
      {
        name: 'List Roles',
        value: 'listRoles',
        description: 'List all roles in a guild',
        action: 'List roles',
      },
    ],
    default: 'getRole',
    required: true,
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['user'],
      },
    },
    options: [
      {
        name: 'Get Member',
        value: 'getMember',
        description: 'Get information about a guild member',
        action: 'Get a member',
      },
      {
        name: 'Get Member Roles',
        value: 'getMemberRoles',
        description: 'Get all roles for a guild member',
        action: 'Get member roles',
      },
      {
        name: 'Get User',
        value: 'getUser',
        description: 'Get information about a user',
        action: 'Get a user',
      },
      {
        name: 'List Members',
        value: 'listMembers',
        description: 'List all members in a guild',
        action: 'List members',
      },
      {
        name: 'Search Members',
        value: 'searchMembers',
        description: 'Search for members in a guild',
        action: 'Search members',
      },
    ],
    default: 'getUser',
    required: true,
  },
]
