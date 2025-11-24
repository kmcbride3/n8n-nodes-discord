/**
 * User Resource Index
 * Exports all user operations
 */

import type { INodeProperties } from 'n8n-workflow'

import * as getUserOp from './getUser.operation'

export const getUser = { execute: getUserOp.execute, properties: getUserOp.properties }

export const description: INodeProperties[] = [
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
        name: 'Get User',
        value: 'getUser',
        description: 'Get details about a specific user',
        action: 'Get a user',
      },
    ],
    default: 'getUser',
  },
  ...getUserOp.properties,
]
