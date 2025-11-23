import type { INodeProperties } from 'n8n-workflow'

import * as createWebhook from './createWebhook.operation'
import * as sendWebhook from './sendWebhook.operation'

export { createWebhook, sendWebhook }

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['webhook'],
      },
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new webhook',
        action: 'Create webhook',
      },
      {
        name: 'Send',
        value: 'send',
        description: 'Send a message through an existing webhook',
        action: 'Send webhook message',
      },
    ],
    default: 'send',
  },
  ...createWebhook.properties,
  ...sendWebhook.properties,
]
