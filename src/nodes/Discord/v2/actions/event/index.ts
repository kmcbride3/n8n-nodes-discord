/**
 * Event Resource Index
 * Exports all event operations
 */

import type { INodeProperties } from 'n8n-workflow'

import * as getEventOp from './getEvent.operation'
import * as getEventUsersOp from './getEventUsers.operation'
import * as listEventsOp from './listEvents.operation'

export const getEvent = { execute: getEventOp.execute, properties: getEventOp.properties }
export const getEventUsers = { execute: getEventUsersOp.execute, properties: getEventUsersOp.properties }
export const listEvents = { execute: listEventsOp.execute, properties: listEventsOp.properties }

export const description: INodeProperties[] = [
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
        description: 'Get details about a specific scheduled event',
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
  },
  ...getEventOp.properties,
  ...getEventUsersOp.properties,
  ...listEventsOp.properties,
]
