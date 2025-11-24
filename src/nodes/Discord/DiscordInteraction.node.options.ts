import { INodeProperties } from 'n8n-workflow'

// Global options that apply across all Discord Interaction trigger types
// Interaction-specific parameters are defined in interactionProperties.ts
export const options: INodeProperties[] = [
  {
    displayName: 'Response Options',
    name: 'responseOptions',
    type: 'collection',
    placeholder: 'Add Response Option',
    default: {},
    options: [
      {
        displayName: 'Defer Response',
        name: 'deferResponse',
        type: 'boolean',
        default: false,
        description:
          'Whether to defer the response. Useful for long-running operations. Discord requires response within 3 seconds.',
      },
      {
        displayName: 'Ephemeral Response',
        name: 'ephemeralResponse',
        type: 'boolean',
        default: false,
        description: 'Whether the response should only be visible to the user who triggered the interaction',
      },
      {
        displayName: 'Suppress Embeds',
        name: 'suppressEmbeds',
        type: 'boolean',
        default: false,
        description: 'Whether to suppress embeds in the response message',
      },
    ],
  },
  {
    displayName: 'Error Handling',
    name: 'errorHandling',
    type: 'collection',
    placeholder: 'Add Error Option',
    default: {},
    options: [
      {
        displayName: 'Continue on Fail',
        name: 'continueOnFail',
        type: 'boolean',
        default: false,
        description: 'Whether to continue executing if handling the interaction fails',
      },
      {
        displayName: 'Error Message',
        name: 'errorMessage',
        type: 'string',
        default: 'An error occurred while processing your interaction.',
        description: 'Message to display to the user when an error occurs',
        typeOptions: {
          rows: 2,
        },
      },
    ],
  },
  {
    displayName: 'Advanced Options',
    name: 'advancedOptions',
    type: 'collection',
    placeholder: 'Add Advanced Option',
    default: {},
    options: [
      {
        displayName: 'Include Raw Data',
        name: 'includeRawData',
        type: 'boolean',
        default: false,
        description: 'Whether to include the full raw Discord.js interaction object in the output',
      },
      {
        displayName: 'Simplify Output',
        name: 'simplifyOutput',
        type: 'boolean',
        default: true,
        description: 'Whether to return simplified output or full Discord API response',
      },
    ],
  },
]
