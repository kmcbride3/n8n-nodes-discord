import type { INodeProperties } from 'n8n-workflow'

import {
  execute as bulkDeleteMessagesExecute,
  properties as bulkDeleteMessagesProperties,
} from './bulkDeleteMessages.operation'
import { execute as deleteMessageExecute, properties as deleteMessageProperties } from './deleteMessage.operation'
import { execute as sendMessageExecute, properties as sendMessageProperties } from './sendMessage.operation'

export const bulkDeleteMessages = { execute: bulkDeleteMessagesExecute, properties: bulkDeleteMessagesProperties }
export const deleteMessage = { execute: deleteMessageExecute, properties: deleteMessageProperties }
export const sendMessage = { execute: sendMessageExecute, properties: sendMessageProperties }

export const description: INodeProperties[] = [
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
        name: 'Send',
        value: 'send',
        description: 'Send a message to a channel',
        action: 'Send a message',
      },
      {
        name: 'Delete',
        value: 'deleteMessage',
        description: 'Delete a message in a channel',
        action: 'Delete a message',
      },
      {
        name: 'Bulk Delete',
        value: 'removeMessages',
        description: 'Delete multiple messages from a channel',
        action: 'Bulk delete messages',
      },
    ],
    default: 'send',
  },
  ...sendMessageProperties,
  ...deleteMessageProperties,
  ...bulkDeleteMessagesProperties,
]
