import type { INodeProperties } from 'n8n-workflow'

import * as bulkDeleteMessagesOp from './bulkDeleteMessages.operation'
import * as deleteMessageOp from './deleteMessage.operation'
import * as getMessageOp from './getMessage.operation'
import * as getMessagesOp from './getMessages.operation'
import * as getPinnedMessagesOp from './getPinnedMessages.operation'
import * as getReactionsOp from './getReactions.operation'
import * as searchMessagesOp from './searchMessages.operation'
import * as sendMessageOp from './sendMessage.operation'

// Write operations
export const bulkDeleteMessages = { execute: bulkDeleteMessagesOp.execute, properties: bulkDeleteMessagesOp.properties }
export const deleteMessage = { execute: deleteMessageOp.execute, properties: deleteMessageOp.properties }
export const sendMessage = { execute: sendMessageOp.execute, properties: sendMessageOp.properties }

// Read operations
export const getMessage = { execute: getMessageOp.execute, properties: getMessageOp.properties }
export const getMessages = { execute: getMessagesOp.execute, properties: getMessagesOp.properties }
export const getPinnedMessages = { execute: getPinnedMessagesOp.execute, properties: getPinnedMessagesOp.properties }
export const getReactions = { execute: getReactionsOp.execute, properties: getReactionsOp.properties }
export const searchMessages = { execute: searchMessagesOp.execute, properties: searchMessagesOp.properties }

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
      {
        name: 'Get Message',
        value: 'getMessage',
        description: 'Get a single message by ID',
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
        description: 'Get users who reacted to a message',
        action: 'Get message reactions',
      },
      {
        name: 'Search Messages',
        value: 'searchMessages',
        description: 'Search for messages in a guild',
        action: 'Search messages',
      },
    ],
    default: 'send',
  },
  ...sendMessageOp.properties,
  ...deleteMessageOp.properties,
  ...bulkDeleteMessagesOp.properties,
  ...getMessageOp.properties,
  ...getMessagesOp.properties,
  ...getPinnedMessagesOp.properties,
  ...getReactionsOp.properties,
  ...searchMessagesOp.properties,
]
