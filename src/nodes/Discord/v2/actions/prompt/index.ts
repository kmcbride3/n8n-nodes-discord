import type { INodeProperties } from 'n8n-workflow'

import { execute as sendButtonExecute, properties as sendButtonProperties } from './sendButton.operation'
import { execute as sendSelectExecute, properties as sendSelectProperties } from './sendSelect.operation'

export const sendButton = { execute: sendButtonExecute, properties: sendButtonProperties }
export const sendSelect = { execute: sendSelectExecute, properties: sendSelectProperties }

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['prompt'],
      },
    },
    options: [
      {
        name: 'Send Button',
        value: 'button',
        description: 'Send interactive buttons that users can click',
        action: 'Send button prompt',
      },
      {
        name: 'Send Select Menu',
        value: 'select',
        description: 'Send a select menu for users to choose from',
        action: 'Send select menu prompt',
      },
    ],
    default: 'button',
  },
  ...sendButtonProperties,
  ...sendSelectProperties,
]
