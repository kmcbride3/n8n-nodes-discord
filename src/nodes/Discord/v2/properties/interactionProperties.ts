/**
 * Discord Interaction Trigger Properties
 *
 * UI property definitions for the Discord Interaction trigger node
 */

import type { INodeProperties } from 'n8n-workflow'

export function getInteractionTriggerProperties(): INodeProperties[] {
  return [
    {
      displayName: 'Interaction Type',
      name: 'interactionType',
      type: 'options',
      options: [
        {
          name: 'Button Click',
          value: 'buttonInteraction',
          description: 'Trigger when a user clicks a button component',
        },
        {
          name: 'Select Menu',
          value: 'selectMenuInteraction',
          description: 'Trigger when a user makes a selection from a select menu',
        },
        {
          name: 'Modal Submit',
          value: 'modalInteraction',
          description: 'Trigger when a user submits a modal form',
        },
        {
          name: 'Slash Command',
          value: 'commandInteraction',
          description: 'Trigger when a slash command is executed',
        },
      ],
      default: 'buttonInteraction',
      description: 'The type of interaction to listen for',
    },
    {
      displayName: 'Custom ID Pattern',
      name: 'customIdPattern',
      type: 'string',
      default: '',
      description: 'Filter interactions by custom ID. Leave empty to trigger on all interactions of this type.',
      placeholder: 'approve_request',
      displayOptions: {
        show: {
          interactionType: ['buttonInteraction', 'selectMenuInteraction', 'modalInteraction'],
        },
      },
    },
    {
      displayName: 'Match Type',
      name: 'matchType',
      type: 'options',
      options: [
        {
          name: 'Exact Match',
          value: 'exact',
          description: 'Custom ID must match exactly',
        },
        {
          name: 'Starts With',
          value: 'startsWith',
          description: 'Custom ID must start with the pattern',
        },
        {
          name: 'Contains',
          value: 'contains',
          description: 'Custom ID must contain the pattern',
        },
        {
          name: 'Regular Expression',
          value: 'regex',
          description: 'Match using a regular expression pattern',
        },
      ],
      default: 'exact',
      description: 'How to match the custom ID pattern',
      displayOptions: {
        show: {
          interactionType: ['buttonInteraction', 'selectMenuInteraction', 'modalInteraction'],
        },
      },
    },
    {
      displayName: 'Command Name',
      name: 'commandName',
      type: 'string',
      default: '',
      description: 'Filter by slash command name. Leave empty to trigger on all slash commands.',
      placeholder: 'help',
      displayOptions: {
        show: {
          interactionType: ['commandInteraction'],
        },
      },
    },
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          displayName: 'Guild Filter',
          name: 'guildFilter',
          type: 'string',
          default: '',
          description: 'Only trigger for interactions in this guild (server) ID',
          placeholder: '123456789012345678',
        },
        {
          displayName: 'Channel Filter',
          name: 'channelFilter',
          type: 'string',
          default: '',
          description: 'Only trigger for interactions in this channel ID',
          placeholder: '123456789012345678',
        },
        {
          displayName: 'User Filter',
          name: 'userFilter',
          type: 'string',
          default: '',
          description: 'Only trigger for interactions from this user ID',
          placeholder: '123456789012345678',
        },
        {
          displayName: 'Ignore Bots',
          name: 'ignoreBots',
          type: 'boolean',
          default: true,
          description: 'Whether to ignore interactions from bot users',
        },
      ],
    },
  ]
}
