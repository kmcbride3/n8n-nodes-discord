import type { INodeProperties } from 'n8n-workflow'

export function getAllProperties(): INodeProperties[] {
  return [
    {
      displayName: 'Trigger Type',
      name: 'type',
      type: 'options',
      default: 'message',
      placeholder: 'Choose trigger type',
      description: 'The type of Discord event to trigger on',
      options: [
        {
          name: 'New Message',
          value: 'message',
          description: 'Trigger when a new message is created in a channel',
        },
        {
          name: 'Message Update',
          value: 'message_update',
          description: 'Trigger when a message is updated',
        },
        {
          name: 'Direct Message',
          value: 'directMessage',
          description: 'Trigger when a direct message is sent to the bot',
        },
        {
          name: 'Reaction Add',
          value: 'reactionAdd',
          description: 'Trigger when a reaction is added to a message',
        },
        {
          name: 'Reaction Remove',
          value: 'reactionRemove',
          description: 'Trigger when a reaction is removed from a message',
        },
        {
          name: 'New Thread',
          value: 'thread',
          description: 'Trigger when a new thread is created',
        },
        {
          name: 'Thread Update',
          value: 'thread_update',
          description: 'Trigger when a thread is updated',
        },
        {
          name: 'Role Create',
          value: 'roleCreate',
          description: 'Trigger when a new role is created on the server',
        },
        {
          name: 'Role Delete',
          value: 'roleDelete',
          description: 'Trigger when a role is deleted from the server',
        },
        {
          name: 'Role Update',
          value: 'roleUpdate',
          description: 'Trigger when a role is updated on the server',
        },
        {
          name: 'User Joins',
          value: 'userJoins',
          description: 'Trigger when a user joins the server',
        },
        {
          name: 'User Leaves',
          value: 'userLeaves',
          description: 'Trigger when a user leaves the server',
        },
        {
          name: 'User Update',
          value: 'userUpdate',
          description: 'Trigger when a user is updated (roles, nickname, etc.)',
        },
        {
          name: 'Presence Update',
          value: 'presenceUpdate',
          description: "Trigger when a user's presence is updated",
        },
        {
          name: 'Command Interaction',
          value: 'command',
          description: 'Trigger when a slash command is used',
        },
        {
          name: 'Component Interaction',
          value: 'interaction',
          description: 'Trigger when a button or select menu is interacted with',
        },
      ],
    },
    {
      displayName: 'Listen to Channels',
      name: 'channelIds',
      type: 'multiOptions',
      typeOptions: {
        loadOptionsMethod: 'getChannels',
      },
      default: [],
      description: 'Select specific channels to listen to. If none selected, all channels will be monitored',
      displayOptions: {
        show: {
          type: ['message', 'message_update', 'reactionAdd', 'reactionRemove', 'thread', 'thread_update', 'command'],
        },
      },
    },
    {
      displayName: 'Guild Filter',
      name: 'guildId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getGuilds',
      },
      default: '',
      description: 'Filter events by specific guild/server. If not selected, events from all guilds will trigger',
      displayOptions: {
        show: {
          type: ['roleCreate', 'roleDelete', 'roleUpdate', 'userJoins', 'userLeaves', 'userUpdate', 'presenceUpdate'],
        },
      },
    },
    {
      displayName: 'Filter by Roles',
      name: 'roleIds',
      type: 'multiOptions',
      typeOptions: {
        loadOptionsMethod: 'getRoles',
      },
      default: [],
      description: 'Filter events by user roles. If none selected, events from all users will trigger',
      displayOptions: {
        show: {
          type: ['message', 'message_update', 'reactionAdd', 'reactionRemove', 'command'],
        },
      },
    },
    {
      displayName: 'Bot Filters',
      name: 'botFilters',
      type: 'collection',
      placeholder: 'Add Filter',
      default: {},
      description: 'Configure how bot activity triggers the workflow',
      displayOptions: {
        show: {
          type: ['message', 'message_update', 'directMessage', 'reactionAdd', 'reactionRemove'],
        },
      },
      options: [
        {
          displayName: 'Bot Trigger Behavior',
          name: 'botBehavior',
          type: 'options',
          default: 'ignoreAllBots',
          description: 'How to handle triggers from bots',
          options: [
            {
              name: 'Ignore All Bots',
              value: 'ignoreAllBots',
              description: 'Ignore triggers from all bots (default)',
            },
            {
              name: 'Ignore Self Only',
              value: 'ignoreSelf',
              description: 'Ignore triggers from this bot, but allow other bots',
            },
            {
              name: 'Ignore Other Bots Only',
              value: 'ignoreOthers',
              description: 'Only trigger on this bot and users, ignore other bots',
            },
            {
              name: 'Allow All Bots',
              value: 'allowAllBots',
              description: 'Trigger on all bots and users',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Message Filters',
      name: 'messageFilters',
      type: 'collection',
      placeholder: 'Add Filter',
      default: {},
      description: 'Additional filters for message events',
      displayOptions: {
        show: {
          type: ['message', 'message_update', 'directMessage'],
        },
      },
      options: [
        {
          displayName: 'Content Match Type',
          name: 'contentMatchType',
          type: 'options',
          default: 'any',
          description: 'How to match message content',
          options: [
            {
              name: 'Any Content',
              value: 'any',
              description: 'Match any message (no content filtering)',
            },
            {
              name: 'Contains',
              value: 'contains',
              description: 'Message contains the specified text (case-insensitive)',
            },
            {
              name: 'Exact Match',
              value: 'exact',
              description: 'Message exactly matches the specified text',
            },
            {
              name: 'Starts With',
              value: 'startsWith',
              description: 'Message starts with the specified text',
            },
            {
              name: 'Ends With',
              value: 'endsWith',
              description: 'Message ends with the specified text',
            },
            {
              name: 'Regex Pattern',
              value: 'regex',
              description: 'Message matches a regular expression pattern',
            },
            {
              name: 'Mentions User',
              value: 'mentionsUser',
              description: 'Message mentions a specific user (by ID or @mention)',
            },
            {
              name: 'Mentions Bot',
              value: 'mentionsBot',
              description: 'Message mentions this bot',
            },
            {
              name: 'Mentions Role',
              value: 'mentionsRole',
              description: 'Message mentions a specific role (by ID or name)',
            },
            {
              name: 'Mentions Channel',
              value: 'mentionsChannel',
              description: 'Message mentions a specific channel (by ID or #channel)',
            },
          ],
        },
        {
          displayName: 'Match Pattern',
          name: 'contentMatchPattern',
          type: 'string',
          default: '',
          placeholder: 'e.g. hello, ^!command, @user, <@123456789>',
          description: 'Pattern to match against message content',
          displayOptions: {
            show: {
              contentMatchType: ['contains', 'exact', 'startsWith', 'endsWith', 'regex', 'mentionsUser', 'mentionsRole', 'mentionsChannel'],
            },
          },
        },
        {
          displayName: 'Case Sensitive',
          name: 'caseSensitive',
          type: 'boolean',
          default: false,
          description: 'Whether matching should be case-sensitive',
          displayOptions: {
            show: {
              contentMatchType: ['contains', 'exact', 'startsWith', 'endsWith'],
            },
          },
        },
        {
          displayName: 'Has Attachments',
          name: 'hasAttachments',
          type: 'options',
          default: 'any',
          description: 'Filter by attachment presence',
          options: [
            {
              name: 'Any',
              value: 'any',
              description: 'Messages with or without attachments',
            },
            {
              name: 'With Attachments',
              value: 'with',
              description: 'Only messages with attachments',
            },
            {
              name: 'Without Attachments',
              value: 'without',
              description: 'Only messages without attachments',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Reaction Filters',
      name: 'reactionFilters',
      type: 'collection',
      placeholder: 'Add Filter',
      default: {},
      description: 'Additional filters for reaction events',
      displayOptions: {
        show: {
          type: ['reactionAdd', 'reactionRemove'],
        },
      },
      options: [
        {
          displayName: 'Specific Message IDs',
          name: 'messageIds',
          type: 'string',
          default: '',
          placeholder: 'e.g. 123456789012345678, 987654321098765432',
          description: 'Comma-separated list of message IDs to monitor. If empty, all messages will be monitored.',
        },
        {
          displayName: 'Specific Emoji',
          name: 'emojiFilter',
          type: 'string',
          default: '',
          placeholder: 'e.g. 👍, :custom_emoji:',
          description: 'Only trigger for this specific emoji. Leave empty to trigger on any emoji.',
        },
      ],
    },
  ]
}
