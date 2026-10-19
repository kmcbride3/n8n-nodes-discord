import type { INodeProperties } from 'n8n-workflow'

import * as utility from './utility.operation'

export { utility }

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['utility'],
      },
    },
    options: [
      {
        name: 'Utility',
        value: 'utility',
        description: 'Perform utility actions like clearing placeholders or updating bot status',
        action: 'Perform utility action',
      },
    ],
    default: 'utility',
  },
  ...utility.properties,
]
