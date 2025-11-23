# V2 Operation Development Guide

## Overview

This guide provides comprehensive instructions for developing V2 Discord operations for n8n, covering architecture
patterns, implementation templates, and best practices.

## V2 Architecture Overview

### Design Principles

The V2 architecture is built on these core principles:

1. **Webhook-Based**: Stateless operations using Discord webhooks
2. **Discord.js Native First**: Prioritize Discord.js built-in methods
3. **Resource Efficient**: On-demand client creation with connection pooling
4. **Type-Safe**: Complete TypeScript integration
5. **n8n Compliant**: Full integration with n8n workflow patterns

### V2 vs V1 Comparison

| Aspect         | V1 Bot               | V2 Webhook     |
| -------------- | -------------------- | -------------- |
| Connection     | Persistent WebSocket | On-demand HTTP |
| State          | Persistent (cached)  | Stateless      |
| Resource Usage | Higher memory        | Lower memory   |
| Startup Time   | Slower               | Faster         |
| Best For       | Real-time events     | API operations |
| Scalability    | Limited              | High           |

## Operation Development Template

### Basic Operation Structure

```typescript
// src/nodes/Discord/v2/actions/[category]/[operation].operation.ts
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import { executeDiscordOperation } from '../../helpers/discord-operations'
import { isValidSnowflake } from '../../helpers/utils'

// Operation properties for n8n UI
export const operationProperties: INodeProperties[] = [
  {
    displayName: 'Guild ID',
    name: 'guildId',
    type: 'string',
    required: true,
    default: '',
    description: 'The ID of the Discord server (guild)',
    hint: 'Right-click on server name → Copy Server ID',
  },
  {
    displayName: 'User ID',
    name: 'userId',
    type: 'string',
    required: true,
    default: '',
    description: 'The ID of the user to perform action on',
    hint: 'Right-click on username → Copy User ID',
  },
  {
    displayName: 'Reason',
    name: 'reason',
    type: 'string',
    default: '',
    description: 'Reason for the action (will appear in audit log)',
  },
]

// Main operation execution function
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
  const items = this.getInputData()
  const results: INodeExecutionData[] = []

  for (let i = 0; i < items.length; i++) {
    try {
      // Extract parameters from workflow input
      const guildId = this.getNodeParameter('guildId', i) as string
      const userId = this.getNodeParameter('userId', i) as string
      const reason = this.getNodeParameter('reason', i, '') as string

      // Validate required parameters
      if (!isValidSnowflake(guildId)) {
        throw new NodeOperationError(this.getNode(), `Invalid guild ID: ${guildId}`, { itemIndex: i })
      }

      if (!isValidSnowflake(userId)) {
        throw new NodeOperationError(this.getNode(), `Invalid user ID: ${userId}`, { itemIndex: i })
      }

      // Get Discord credentials
      const credentials = await this.getCredentials('discordApi', i)

      // Execute Discord operation with managed client
      const result = await executeDiscordOperation(credentials, async (client) => {
        // Fetch Discord entities using Discord.js native methods
        const guild = await client.guilds.fetch(guildId)
        const member = await guild.members.fetch(userId)

        // Perform the actual Discord operation
        await member.ban({
          reason: reason || 'Banned via n8n workflow',
          deleteMessageSeconds: 0, // Don't delete messages by default
        })

        // Return structured result
        return {
          success: true,
          user: {
            id: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            banned: true,
          },
          guild: {
            id: guild.id,
            name: guild.name,
          },
          reason,
          timestamp: new Date().toISOString(),
        }
      })

      // Add result to output
      results.push({
        json: result,
        pairedItem: { item: i },
      })
    } catch (error) {
      // Handle errors according to n8n patterns
      if (this.continueOnFail()) {
        results.push({
          json: {
            error: error.message,
            success: false,
          },
          pairedItem: { item: i },
        })
      } else {
        throw error
      }
    }
  }

  return results
}
```

### Advanced Operation Template

```typescript
// Advanced operation with complex parameters and validation
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export const advancedOperationProperties: INodeProperties[] = [
  // Basic parameters
  {
    displayName: 'Channel ID',
    name: 'channelId',
    type: 'string',
    required: true,
    default: '',
    description: 'The ID of the Discord channel',
  },

  // Complex parameter with options
  {
    displayName: 'Message Type',
    name: 'messageType',
    type: 'options',
    options: [
      { name: 'Simple Text', value: 'text' },
      { name: 'Rich Embed', value: 'embed' },
      { name: 'Interactive Components', value: 'components' },
    ],
    default: 'text',
    description: 'Type of message to send',
  },

  // Conditional parameters
  {
    displayName: 'Embed Configuration',
    name: 'embedConfig',
    type: 'collection',
    placeholder: 'Add Embed Field',
    displayOptions: {
      show: {
        messageType: ['embed', 'components'],
      },
    },
    default: {},
    options: [
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        description: 'Embed title (max 256 characters)',
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        description: 'Embed description (max 4096 characters)',
      },
      {
        displayName: 'Color',
        name: 'color',
        type: 'color',
        default: '#5865F2',
        description: 'Embed color',
      },
    ],
  },
]

export async function executeAdvanced(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
  const items = this.getInputData()
  const results: INodeExecutionData[] = []

  for (let i = 0; i < items.length; i++) {
    try {
      // Extract parameters
      const channelId = this.getNodeParameter('channelId', i) as string
      const messageType = this.getNodeParameter('messageType', i) as string
      const embedConfig = this.getNodeParameter('embedConfig', i, {}) as any

      // Validate parameters
      if (!isValidSnowflake(channelId)) {
        throw new NodeOperationError(this.getNode(), `Invalid channel ID: ${channelId}`, { itemIndex: i })
      }

      const credentials = await this.getCredentials('discordApi', i)

      const result = await executeDiscordOperation(credentials, async (client) => {
        const channel = await client.channels.fetch(channelId)

        if (!channel?.isTextBased()) {
          throw new NodeOperationError(this.getNode(), `Channel ${channelId} is not a text channel`, { itemIndex: i })
        }

        let messagePayload: any = {}

        // Build message based on type
        switch (messageType) {
          case 'text':
            messagePayload.content = 'Simple text message'
            break

          case 'embed':
            const embed = new EmbedBuilder()

            if (embedConfig.title) {
              embed.setTitle(embedConfig.title)
            }

            if (embedConfig.description) {
              embed.setDescription(embedConfig.description)
            }

            if (embedConfig.color) {
              embed.setColor(embedConfig.color)
            }

            messagePayload.embeds = [embed]
            break

          case 'components':
            // Create embed AND components
            const richEmbed = new EmbedBuilder()
              .setTitle(embedConfig.title || 'Interactive Message')
              .setDescription(embedConfig.description || 'Click a button below')
              .setColor(embedConfig.color || '#5865F2')

            const button = new ButtonBuilder()
              .setCustomId('interaction_button')
              .setLabel('Click Me!')
              .setStyle(ButtonStyle.Primary)

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

            messagePayload.embeds = [richEmbed]
            messagePayload.components = [row]
            break
        }

        // Send message using Discord.js
        const sentMessage = await channel.send(messagePayload)

        return {
          success: true,
          message: {
            id: sentMessage.id,
            content: sentMessage.content,
            embeds: sentMessage.embeds.length,
            components: sentMessage.components.length,
            url: sentMessage.url,
          },
          channel: {
            id: channel.id,
            name: channel.name,
            type: channel.type,
          },
          timestamp: sentMessage.createdAt.toISOString(),
        }
      })

      results.push({
        json: result,
        pairedItem: { item: i },
      })
    } catch (error) {
      if (this.continueOnFail()) {
        results.push({
          json: { error: error.message, success: false },
          pairedItem: { item: i },
        })
      } else {
        throw error
      }
    }
  }

  return results
}
```

## Parameter Definition Patterns

### Basic Parameter Types

```typescript
// String parameter with validation
{
  displayName: 'User ID',
  name: 'userId',
  type: 'string',
  required: true,
  default: '',
  description: 'Discord user ID (snowflake)',
  hint: 'Right-click username → Copy User ID',
  placeholder: '123456789012345678'
}

// Number parameter with limits
{
  displayName: 'Message Count',
  name: 'messageCount',
  type: 'number',
  required: true,
  default: 10,
  typeOptions: {
    minValue: 1,
    maxValue: 100
  },
  description: 'Number of messages to process (1-100)'
}

// Boolean parameter
{
  displayName: 'Include Bot Messages',
  name: 'includeBots',
  type: 'boolean',
  default: false,
  description: 'Whether to include messages from bots'
}

// Options parameter
{
  displayName: 'Action Type',
  name: 'actionType',
  type: 'options',
  options: [
    { name: 'Ban', value: 'ban', description: 'Permanently ban the user' },
    { name: 'Kick', value: 'kick', description: 'Remove user from server' },
    { name: 'Timeout', value: 'timeout', description: 'Temporarily mute user' }
  ],
  default: 'kick',
  description: 'Type of moderation action to perform'
}
```

### Collection Parameters

```typescript
// Collection for complex nested data
{
  displayName: 'Embed Fields',
  name: 'embedFields',
  type: 'collection',
  placeholder: 'Add Field',
  typeOptions: {
    multipleValues: true,
    sortable: true
  },
  default: {},
  options: [
    {
      displayName: 'Field Name',
      name: 'name',
      type: 'string',
      required: true,
      default: '',
      description: 'Field title (max 256 characters)'
    },
    {
      displayName: 'Field Value',
      name: 'value',
      type: 'string',
      required: true,
      default: '',
      description: 'Field content (max 1024 characters)'
    },
    {
      displayName: 'Inline',
      name: 'inline',
      type: 'boolean',
      default: false,
      description: 'Display field inline with others'
    }
  ]
}
```

### Conditional Parameters

```typescript
// Parameters that show/hide based on other selections
{
  displayName: 'Timeout Duration',
  name: 'timeoutDuration',
  type: 'options',
  displayOptions: {
    show: {
      actionType: ['timeout']
    }
  },
  options: [
    { name: '1 Minute', value: 60 },
    { name: '5 Minutes', value: 300 },
    { name: '10 Minutes', value: 600 },
    { name: '1 Hour', value: 3600 },
    { name: '1 Day', value: 86400 },
    { name: '1 Week', value: 604800 }
  ],
  default: 600,
  description: 'How long to timeout the user'
}
```

## Error Handling Patterns

### Discord.js Error Handling

```typescript
import { DiscordAPIError, RateLimitError, HTTPError } from 'discord.js'

async function handleDiscordOperation<T>(
  operation: () => Promise<T>,
  context: IExecuteFunctions,
  itemIndex: number,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Handle specific Discord.js errors
    if (error instanceof DiscordAPIError) {
      const userMessage = getDiscordErrorMessage(error.code) || error.message

      throw new NodeOperationError(context.getNode(), `Discord API Error: ${userMessage}`, {
        itemIndex,
        description: `HTTP ${error.status}: ${error.method} ${error.url}`,
        httpCode: error.status,
        cause: error,
        discordErrorCode: error.code,
      })
    }

    if (error instanceof RateLimitError) {
      throw new NodeOperationError(context.getNode(), 'Discord rate limit exceeded', {
        itemIndex,
        description: `Rate limited for ${error.retryAfter}ms. Discord.js will retry automatically.`,
        retryAfter: error.retryAfter,
        cause: error,
      })
    }

    if (error instanceof HTTPError) {
      throw new NodeOperationError(context.getNode(), 'Discord connection error', {
        itemIndex,
        description: `Network error: ${error.message}`,
        httpCode: error.status,
        cause: error,
      })
    }

    // Re-throw unknown errors
    throw error
  }
}

// User-friendly error messages
function getDiscordErrorMessage(code: number): string | null {
  const messages = {
    10003: 'Channel not found - it may have been deleted',
    10004: 'Guild not found - server may be unavailable',
    10007: 'Member not found - user may have left the server',
    10008: 'Message not found - it may have been deleted',
    50001: 'Missing access - check bot permissions',
    50013: 'Missing permissions to perform this action',
    50035: 'Invalid request data - check your parameters',
  }

  return messages[code] || null
}
```

### Parameter Validation

```typescript
function validateOperationParameters(params: {
  guildId?: string
  channelId?: string
  userId?: string
  messageId?: string
}): void {
  // Validate snowflake IDs
  Object.entries(params).forEach(([key, value]) => {
    if (value && !isValidSnowflake(value)) {
      throw new NodeOperationError(this.getNode(), `Invalid ${key}: ${value}`, {
        description: 'Discord IDs must be valid snowflake format (18-19 digits)',
      })
    }
  })
}

function validateEmbedData(embed: any): void {
  const limits = {
    title: 256,
    description: 4096,
    fieldName: 256,
    fieldValue: 1024,
    footerText: 2048,
    authorName: 256,
    totalLength: 6000,
  }

  if (embed.title && embed.title.length > limits.title) {
    throw new NodeOperationError(
      this.getNode(),
      `Embed title too long (${embed.title.length}/${limits.title} characters)`,
    )
  }

  if (embed.description && embed.description.length > limits.description) {
    throw new NodeOperationError(
      this.getNode(),
      `Embed description too long (${embed.description.length}/${limits.description} characters)`,
    )
  }

  // Calculate total embed length
  const totalLength = [
    embed.title || '',
    embed.description || '',
    embed.footer?.text || '',
    embed.author?.name || '',
    ...(embed.fields || []).flatMap((f) => [f.name, f.value]),
  ].join('').length

  if (totalLength > limits.totalLength) {
    throw new NodeOperationError(
      this.getNode(),
      `Total embed content too long (${totalLength}/${limits.totalLength} characters)`,
    )
  }
}
```

## Response Formatting

### Standard Response Format

```typescript
interface DiscordOperationResult {
  success: boolean
  timestamp: string
  operation: string

  // Entity information
  user?: {
    id: string
    username: string
    discriminator: string
    avatar?: string
  }

  guild?: {
    id: string
    name: string
    icon?: string
  }

  channel?: {
    id: string
    name: string
    type: number
  }

  message?: {
    id: string
    content: string
    embeds: number
    attachments: number
    url: string
  }

  // Operation-specific data
  [key: string]: any
}

// Example usage
const result: DiscordOperationResult = {
  success: true,
  timestamp: new Date().toISOString(),
  operation: 'memberBan',

  user: {
    id: member.user.id,
    username: member.user.username,
    discriminator: member.user.discriminator,
    avatar: member.user.displayAvatarURL(),
  },

  guild: {
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL(),
  },

  // Operation-specific
  reason: banReason,
  deleteMessageSeconds: 0,
  auditLogId: auditLog?.id,
}
```

### Binary Data Handling

```typescript
// Handle file attachments from workflow
function processAttachments(binaryData: IBinaryKeyData): AttachmentBuilder[] {
  return Object.entries(binaryData).map(([key, data]) => {
    return new AttachmentBuilder(data.data, {
      name: data.fileName || `attachment_${key}`,
      description: `Binary data from workflow: ${key}`,
    })
  })
}

// Include binary data in response
function createResponseWithAttachments(message: Message, attachments: Attachment[]): any {
  const binaryData: IBinaryKeyData = {}

  message.attachments.forEach((attachment, index) => {
    const key = `attachment_${index}`
    binaryData[key] = {
      data: Buffer.from(attachment.url), // In real implementation, fetch the file
      mimeType: attachment.contentType || 'application/octet-stream',
      fileName: attachment.name,
      fileExtension: attachment.name?.split('.').pop() || 'bin',
    }
  })

  return {
    json: {
      success: true,
      message: {
        id: message.id,
        content: message.content,
        attachments: message.attachments.size,
      },
    },
    binary: binaryData,
  }
}
```

## Testing V2 Operations

### Unit Test Template

```typescript
// tests/v2/operations/memberBan.test.ts
import { banMember } from '../../../src/nodes/Discord/v2/actions/member/banMember.operation'
import { createMockExecuteFunction, createMockClient } from '../../helpers/mocks'

describe('V2 Member Ban Operation', () => {
  let mockExecuteFunction: IExecuteFunctions

  beforeEach(() => {
    mockExecuteFunction = createMockExecuteFunction({
      guildId: '123456789',
      userId: '987654321',
      reason: 'Test ban',
    })
  })

  test('should ban member successfully', async () => {
    const results = await banMember.execute.call(mockExecuteFunction)

    expect(results).toHaveLength(1)
    expect(results[0].json.success).toBe(true)
    expect(results[0].json.user.banned).toBe(true)
  })

  test('should handle invalid guild ID', async () => {
    mockExecuteFunction.getNodeParameter = jest
      .fn()
      .mockReturnValueOnce('invalid-id') // guildId
      .mockReturnValueOnce('987654321') // userId
      .mockReturnValueOnce('Test') // reason

    await expect(banMember.execute.call(mockExecuteFunction)).rejects.toThrow('Invalid guild ID')
  })
})
```

### Integration Test Template

```typescript
// tests/v2/integration/memberOperations.test.ts
describe('V2 Member Operations Integration', () => {
  test('should execute full member ban workflow', async () => {
    const mockExecuteFunction = createMockExecuteFunction([
      { guildId: '123', userId: '456', reason: 'Violation 1' },
      { guildId: '123', userId: '789', reason: 'Violation 2' },
    ])

    const results = await banMember.execute.call(mockExecuteFunction)

    expect(results).toHaveLength(2)
    results.forEach((result, index) => {
      expect(result.json.success).toBe(true)
      expect(result.json.reason).toBe(`Violation ${index + 1}`)
      expect(result.pairedItem.item).toBe(index)
    })
  })
})
```

## Operation Registration

### Adding to Router

```typescript
// src/nodes/Discord/v2/actions/member/router.ts
import * as banMember from './banMember.operation'
import * as kickMember from './kickMember.operation'

export const router: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['member'],
      },
    },
    options: [
      {
        name: 'Ban',
        value: 'ban',
        description: 'Ban a member from the server',
        action: 'Ban a member',
      },
      {
        name: 'Kick',
        value: 'kick',
        description: 'Kick a member from the server',
        action: 'Kick a member',
      },
    ],
    default: 'ban',
  },

  // Operation-specific properties
  ...banMember.properties,
  ...kickMember.properties,
]

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', 0)

  switch (operation) {
    case 'ban':
      return banMember.execute.call(this)
    case 'kick':
      return kickMember.execute.call(this)
    default:
      throw new NodeOperationError(this.getNode(), `Unknown member operation: ${operation}`)
  }
}
```

### Version Description Update

```typescript
// src/nodes/Discord/v2/versionDescriptions.ts
export const versionDescription: INodeTypeDescription = {
  displayName: 'Discord',
  name: 'discord',
  icon: 'file:discord.svg',
  group: ['communication'],
  version: 2,
  subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
  description: 'Consume Discord API (v2)',
  defaults: {
    name: 'Discord',
  },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'discordApi',
      required: true,
    },
  ],
  properties: [
    // Resource selection
    {
      displayName: 'Resource',
      name: 'resource',
      type: 'options',
      noDataExpression: true,
      options: [
        {
          name: 'Member',
          value: 'member',
        },
        {
          name: 'Message',
          value: 'message',
        },
        // Add new resources here
      ],
      default: 'member',
    },

    // Include all router properties
    ...memberRouter.properties,
    ...messageRouter.properties,
  ],
}
```

## Best Practices Summary

### Development Guidelines

1. **Use Discord.js Native Methods**: Always prioritize Discord.js built-in functionality
2. **Validate Parameters Early**: Check snowflake IDs and required fields before Discord API calls
3. **Handle Errors Gracefully**: Convert Discord.js errors to user-friendly n8n errors
4. **Structure Responses Consistently**: Use standard response format for all operations
5. **Test Thoroughly**: Include unit and integration tests for all operations
6. **Document Parameters**: Provide clear descriptions and hints for all parameters
7. **Support Batch Operations**: Handle multiple input items efficiently
8. **Use Type Safety**: Leverage TypeScript for better development experience

### Performance Guidelines

1. **Use Connection Pooling**: Leverage the shared client manager
2. **Minimize API Calls**: Batch operations where possible
3. **Cache Wisely**: Use Discord.js caching appropriately
4. **Handle Rate Limits**: Let Discord.js handle automatic retries
5. **Clean Up Resources**: Ensure proper cleanup of collectors and connections

### Security Guidelines

1. **Validate All Inputs**: Never trust user input without validation
2. **Use Proper Error Handling**: Don't expose sensitive information in errors
3. **Follow n8n Patterns**: Use n8n credential system and error types
4. **Sanitize Outputs**: Ensure response data is safe for workflow processing
5. **Implement Proper Permissions**: Check Discord permissions before operations

This comprehensive guide provides everything needed to develop high-quality V2 Discord operations that follow best
practices and integrate seamlessly with n8n workflows.
