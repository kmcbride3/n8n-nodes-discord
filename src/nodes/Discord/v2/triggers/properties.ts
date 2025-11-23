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
          description: 'Trigger when a new message is created',
        },
        {
          name: 'Message Update',
          value: 'message_update',
          description: 'Trigger when a message is updated',
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
          type: ['message', 'message_update', 'thread', 'thread_update', 'command'],
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
          type: ['message', 'message_update', 'userJoins', 'userLeaves', 'userUpdate', 'presenceUpdate', 'command'],
        },
      },
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
          type: ['message', 'message_update'],
        },
      },
      options: [
        {
          displayName: 'Ignore Bot Messages',
          name: 'ignoreBots',
          type: 'boolean',
          default: true,
          description: 'Whether to ignore messages from bots',
        },
        {
          displayName: 'Required Content',
          name: 'requiredContent',
          type: 'string',
          default: '',
          description: 'Only trigger if message contains this text (case-insensitive)',
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
  ]
}
