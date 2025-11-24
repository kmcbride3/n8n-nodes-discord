import { INodeProperties } from 'n8n-workflow'

// Node-level options that apply across operations
// These appear in the UI alongside operation-specific parameters
// Operation-specific parameters (like limit, filters, simplify) are defined in each operation file
export const options: INodeProperties[] = [
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    options: [
      {
        displayName: 'Include Metadata',
        name: 'includeMetadata',
        type: 'boolean',
        default: false,
        description: 'Whether to include additional metadata in the response (timestamps, IDs, etc.)',
      },
      {
        displayName: 'Cache Results',
        name: 'cacheResults',
        type: 'boolean',
        default: false,
        description: 'Whether to use cached data when available (faster but may not reflect latest changes)',
      },
      {
        displayName: 'Timeout (seconds)',
        name: 'timeout',
        type: 'number',
        default: 30,
        description: 'Maximum time to wait for the request to complete',
        typeOptions: {
          minValue: 1,
          maxValue: 300,
        },
      },
    ],
  },
]
