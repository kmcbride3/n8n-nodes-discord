import type { INodeProperties } from 'n8n-workflow'

import * as interactionManager from './interactionManager.operation'
import * as utility from './utility.operation'

export { interactionManager, utility }

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
      {
        name: 'Interaction Manager',
        value: 'interactionManager',
        description: 'Manage Discord.js Collections and interaction state',
        action: 'Manage interactions',
      },
    ],
    default: 'utility',
  },
  ...utility.properties,
  ...interactionManager.properties,
]
