# n8n-nodes-discord Development Guide

## Documentation Standards

**Do not create summary or documentation files** when making changes to the codebase unless specifically requested by
the user. Changes should be reported directly in responses without generating additional markdown files in the
workspace.

## Technology Stack & Versions

- **`discord.js` v14.22.1** - Primary Discord API integration with comprehensive type safety
  - Official Discord API types from `discord-api-types/v10`
  - Built-in REST API client with automatic rate limiting
  - WebSocket management for real-time events
  - Rich helper functions and utilities
- **`Node.js` v24.9.0** - Runtime environment
- **`n8n-core` v1.113.1** - Core n8n functionality and workflow execution
- **`n8n-workflow` v1.111.0** - Workflow integration and node development framework
- **`TypeScript` v5.9.3** - Type safety with strict configuration
- **`node-ipc` v12.0.0** - Inter-process communication (minimal usage for essential coordination only)
- **`Jest` v30.2.0** - Testing framework for unit and integration tests
- **`pnpm` v9.12.3** - Package management
-

### Integration Priority

1. **Primary**: Discord.js REST API and WebSocket events
2. **Secondary**: Direct HTTP requests to Discord API (when Discord.js doesn't support specific endpoints)
3. **Fallback**: IPC communication (only for bot lifecycle and cross-process coordination)

## Code Standards

- Never use the `any` type in TypeScript; use `unknown` only when necessary
- **Always use official Discord.js types and interfaces** - Never create custom Discord interfaces when Discord.js
  provides official API types:
  - Use Discord.js helper functions, constants, and utilities wherever available
  - Leverage Discord.js's comprehensive type definitions from `discord-api-types/v10`
  - Use Discord.js built-in validation (e.g., `verifyString`, `SnowflakeUtil.generate()`)
  - Leverage Discord.js formatters (e.g., `userMention()`, `channelMention()`, `time()`)
  - Use Discord.js builders (e.g., `EmbedBuilder`, `ActionRowBuilder`, `ButtonBuilder`)
- **Always use n8n-workflow and n8n-core built-ins** - Never recreate functionality that already exists:
  - Use `NodeOperationError` for all operation errors instead of generic Error
  - Use `NodeApiError` for API-related errors with proper HTTP status codes
  - Use `NodeSSLError` for SSL/TLS related connection errors
  - Leverage `IExecuteFunctions` methods like `getCredentials()`, `getInputData()`, `getNodeParameter()`
  - Use `ILoadOptionsFunctions` for dynamic option loading
  - Use `ITriggerFunctions` for trigger node implementations
  - Use n8n's built-in binary data handling with `IBinaryData` and `IBinaryKeyData`
  - Leverage n8n's pagination helpers and request utilities where available
- **Prefer Discord.js built-in functionality**:
  - Use Discord.js native functionality where possible
  - Use Discord.js REST API handling only when native Discord.js functionality does not exist
  - Leverage Discord.js WebSocket management for real-time events
  - **Minimize IPC usage** - Prefer direct Discord.js native functionality, WebSocket or REST API calls (in that order)
    over IPC communication when possible
  - Use Discord.js `Collection` over native JavaScript `Map`
  - Utilize Discord.js helper methods for formatting, validation, and data transformation
  - **Never implement custom timeout/retry logic** - Discord.js handles this automatically (15s timeout, 3 retries, rate
    limiting)
  - **Never implement custom rate limiting** - Discord.js has sophisticated built-in rate limit handling
- **Leverage n8n patterns and conventions**:
  - Use n8n's credential system instead of custom credential handling
  - Follow n8n's node parameter patterns and validation
  - Use n8n's workflow execution context properly
  - Implement proper pairedItem relationships for data flow
  - Use n8n's continue-on-fail error handling patterns
- Follow ESLint and Prettier rules configured in the project:
  - Use single quotes for strings
  - Use semicolons at the end of statements
  - 2-space indentation
  - Maximum line length of 100 characters
  - No unused variables or imports
  - Avoid `eslint-disable` comments unless absolutely necessary
  - Follow n8n-nodes-base plugin guidelines for node implementations
  - Use simple-import-sort plugin ordering for imports
- Avoid adding unnecessary comments to show where code was added
- Avoid using deprecated methods from imported packages
- Avoid object injection sinks to prevent security vulnerabilities

## Architecture Overview

This package provides n8n nodes for Discord integration with these primary components:

### V2 Architecture (Current)

The V2 architecture introduces a modular, action-based design with enhanced type safety:

1. **Discord Send Node** (`Discord.node.ts`)
   - Action-based node structure with organized operations under `/v2/actions/`
   - Resource-based organization: `message`, `prompt`, `user`, etc.
   - Operations: `send`, `edit`, `remove`, `button`, `select`, etc.
   - Enhanced type safety using official Discord.js API types
   - **Direct Discord.js integration** - Uses Discord.js REST API and WebSocket connections directly where possible
   - IPC communication only when necessary for bot state management or cross-process coordination

2. **Discord Trigger Node** (`DiscordTrigger.node.ts`)
   - Event-driven trigger node for Discord events
   - **Primary method**: Direct Discord.js WebSocket event handling for real-time events
   - **Secondary method**: IPC-based event handling only when WebSocket access is not available
   - Real-time event processing with Discord.js WebSocket integration

3. **Bot Service** (`/bot/` folder)
   - Background Discord bot maintaining persistent connection
   - **Primary role**: Discord.js client management and WebSocket connection maintenance
   - Command registration and slash command handling via Discord.js REST API
   - **Limited IPC usage**: Only for essential cross-process communication (trigger registration, bot status)
   - State management for triggers and connections

### V2 Design Principles

- **Official Discord.js Integration**: Leverage Discord.js v14.22.1's full feature set including:
  - Official API type definitions (`APIChannel`, `APIGuild`, `APIMessage`, etc.)
  - Built-in REST API handling with automatic rate limiting
  - WebSocket management for real-time events
  - Helper functions for embeds, components, and formatting
- **Direct API Communication**: Minimize IPC overhead by using Discord.js REST/WebSocket directly
- **Modular Action System**: Operations organized by resource type with clear separation of concerns
- **Type Safety**: Comprehensive TypeScript integration with Discord.js types
- **Enhanced Error Handling**: Robust error handling with proper n8n integration patterns
- **IPC Minimization**: Use IPC only when absolutely necessary (bot state, cross-process coordination)

## Event Handling Architecture

### IPC Event Handling (`ipcEvents` folder)

The `ipcEvents` folder contains handlers for IPC communication between n8n nodes and the Discord bot:

- **`trigger.ipc.ts`**: Manages trigger registration, connection tracking, and command registration

  ```typescript
  ipc.server.on('trigger', (data, socket) => {
    state.triggers[data.webhookId] = {
      /* ... */
    }
    triggerConnections.set(data.webhookId, socket)
  })
  ```

- Other IPC handlers manage interactions, messages, and bot status updates

### Discord Event Handling (`discordClientEvents` folder)

The `discordClientEvents` folder contains handlers for Discord.js events that integrate with n8n triggers:

- **Direct Event Processing**: Events are captured from Discord.js client and processed directly in trigger context when
  possible
- **Type Safety**: Use Discord.js event parameter types (e.g., `Message`, `GuildMember`, `Interaction`)
- **Minimal IPC**: Avoid IPC event forwarding; prefer direct trigger execution within event handlers
- **Discord.js Integration**: Leverage Discord.js event system and built-in data structures

Example Discord.js event handler with direct trigger execution:

```typescript
// Use Discord.js types for event parameters and direct trigger execution
export function handleMessageCreate(message: Message, triggerContext: ITriggerFunctions) {
  // Leverage Discord.js helper methods and properties
  if (message.author.bot) return

  // Use Discord.js data structures
  const eventData = {
    messageId: message.id,
    content: message.content,
    author: message.author.toJSON(),
    channel: message.channel.toJSON(),
    guild: message.guild?.toJSON(),
    // Use Discord.js Collections and methods
    attachments: message.attachments.map((attachment) => attachment.toJSON()),
    embeds: message.embeds.map((embed) => embed.toJSON()),
  }

  // Direct trigger execution (preferred over IPC)
  triggerContext.emit([{ json: eventData }])

  // Avoid IPC forwarding unless absolutely necessary
  // broadcastTriggerEvent('messageCreate', eventData);
}
```

Common Discord.js events handled:

- `messageCreate`, `messageUpdate` - Message events with full Discord.js Message objects
- `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate` - Member events with GuildMember objects
- `presenceUpdate` - Presence changes with Presence objects
- `interactionCreate` - Slash commands and components with Interaction objects
- `threadCreate`, `threadUpdate` - Thread events with ThreadChannel objects

## Built-in Functionality Guidelines

### Discord.js Built-ins (Always Use These)

**Validation and Utilities:**

```typescript
import { verifyString, SnowflakeUtil, PermissionsBitField, ChannelType } from 'discord.js'

// Use Discord.js validation instead of custom regex
const isValidSnowflake = SnowflakeUtil.isValid(id)
const cleanString = verifyString(userInput) // Prevents injection attacks

// Use Discord.js permission handling
const permissions = new PermissionsBitField(memberPermissions)
const canManageMessages = permissions.has(PermissionsBitField.Flags.ManageMessages)

// Use Discord.js constants instead of magic numbers
if (channel.type === ChannelType.GuildText) {
  /* ... */
}
```

**Formatters and Builders:**

```typescript
import { userMention, channelMention, time, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js'

// Use Discord.js formatters instead of string templates
const mention = userMention(userId) // <@123456789>
const channelRef = channelMention(channelId) // <#123456789>
const timestamp = time(new Date(), 'R') // <t:1234567890:R>

// Use Discord.js builders instead of raw objects
const embed = new EmbedBuilder().setTitle('Title').setDescription('Description').setColor(0x00ae86)

const button = new ButtonBuilder().setCustomId('button_id').setLabel('Click Me').setStyle(ButtonStyle.Primary)

const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)
```

**Collections and Data Structures:**

```typescript
import { Collection } from 'discord.js'

// Use Discord.js Collection instead of Map
const cache = new Collection<string, any>()
cache.set('key', value)
const filtered = cache.filter((item) => item.active)
const mapped = cache.map((item) => item.name)
```

### n8n Built-ins (Always Use These)

**Error Handling:**

```typescript
import { NodeOperationError, NodeApiError, NodeSSLError } from 'n8n-workflow'

// Use specific n8n error types instead of generic Error
throw new NodeOperationError(this.getNode(), 'Operation failed', { itemIndex })
throw new NodeApiError(this.getNode(), error, { httpCode: 400, itemIndex })
throw new NodeSSLError(this.getNode(), 'SSL certificate error')
```

**Parameter and Data Handling:**

```typescript
// Use n8n's built-in parameter methods
const channelId = this.getNodeParameter('channelId', itemIndex) as string
const credentials = await this.getCredentials('discordApi')
const inputData = this.getInputData()

// Use n8n's binary data handling
const binaryData: IBinaryData = {
  data: buffer.toString('base64'),
  mimeType: 'image/png',
  fileName: 'image.png',
}
```

**Credential Management:**

```typescript
// Use n8n's credential system instead of custom handling
const credentials = (await this.getCredentials('discordApi')) as ICredentialDataDecryptedObject
const token = credentials.botToken as string

// Never store or cache credentials manually
// Let n8n handle credential encryption and storage
```

**Workflow Context and Data Flow:**

```typescript
// Use proper pairedItem relationships
returnData.push({
  json: responseData,
  pairedItem: { item: itemIndex }, // Essential for data flow
  binary: binaryData, // Use n8n's binary handling
})

// Use n8n's continue-on-fail pattern
if (this.continueOnFail()) {
  returnData.push({
    json: { error: error.message },
    pairedItem: { item: itemIndex },
  })
} else {
  throw error
}
```

### What NOT to Implement (Use Built-ins Instead)

**❌ Never Create Custom:**

- Timeout/retry logic (Discord.js handles this)
- Rate limiting (Discord.js handles this automatically)
- Permission bit manipulation (use `PermissionsBitField`)
- Snowflake validation (use `SnowflakeUtil`)
- String sanitization (use `verifyString`)
- HTTP request handling for Discord API (use Discord.js REST)
- Credential encryption/storage (use n8n's credential system)
- Error classes (use `NodeOperationError`, `NodeApiError`, etc.)
- Binary data encoding (use n8n's `IBinaryData`)
- Collection utilities (use Discord.js `Collection`)

## Key Communication Patterns

### Discord.js Integration Best Practices

Always leverage Discord.js built-in capabilities and minimize IPC usage:

- **REST API Operations**: Use Discord.js REST client with automatic rate limiting (preferred over IPC)

  ```typescript
  // Preferred: Direct Discord.js REST API calls
  const channel = await getChannel.call(this, channelId)
  const message = await sendMessage.call(this, channelId, content, { embeds, components })

  // Avoid: IPC calls for simple REST operations
  // ipc.of.bot.emit('sendMessage', { channelId, content, embeds });
  ```

- **WebSocket Events**: Use Discord.js event system directly (preferred over IPC event forwarding)

  ```typescript
  // Preferred: Direct Discord.js WebSocket events
  client.on('messageCreate', (message: Message) => {
    // Process event directly in trigger context
    this.emit([transformMessageToNodeData(message)])
  })

  // Avoid: IPC event forwarding unless absolutely necessary
  // ipc.server.emit(socket, 'triggerEvent', eventData);
  ```

- **Type Safety**: Use official Discord.js API types

  ```typescript
  // Preferred: Official Discord.js types
  import { APIChannel, APIMessage, APIGuild } from 'discord.js'

  // Avoid: Custom interface definitions
  interface IDiscordChannel {
    /* ... */
  }
  ```

- **When to Use IPC**: Only for essential cross-process operations

  ```typescript
  // Acceptable IPC usage: Bot status, credential updates, trigger registration
  ipc.of.bot.emit('updateCredentials', { credentials })
  ipc.of.bot.emit('registerTrigger', { webhookId, eventTypes })

  // Avoid IPC for: Message sending, channel fetching, user operations
  ```

### IPC Communication (Minimal Usage)

Use IPC only when Discord.js direct communication is not possible:

- **Essential IPC Operations**: Bot lifecycle, credential management, trigger coordination

- **Trigger Registration** (when WebSocket access is unavailable):

  ```typescript
  ipc.of.bot.emit('trigger', {
    ...parameters,
    baseUrl,
    webhookId,
    active: this.getWorkflow().active,
    credentials,
  })
  ```

- **Event Broadcasting** (fallback when direct WebSocket is not available):

  ```typescript
  ipc.server.on('sendTriggerEvent', (data) => {
    const socket = triggerConnections.get(data.webhookId)
    if (socket && state.triggers[webhookId]?.active) {
      ipc.server.emit(socket, 'triggerEvent', eventData)
    }
  })
  ```

**Note**: Always prefer Discord.js REST API calls and direct WebSocket event handling over IPC communication.

### V2 Action Pattern

The V2 architecture uses a standardized action pattern with direct Discord.js and n8n built-ins:

```typescript
// Action structure in /v2/actions/{resource}/{operation}.operation.ts
import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow'
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, verifyString } from 'discord.js'

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
  const items = this.getInputData() // Use n8n built-in
  const returnData: INodeExecutionData[] = []

  for (let i = 0; i < items.length; i++) {
    try {
      // Use n8n's parameter handling
      const channelId = this.getNodeParameter('channelId', i) as string
      const content = this.getNodeParameter('content', i) as string

      // Use Discord.js builders instead of raw objects
      const embed = new EmbedBuilder()
        .setTitle(this.getNodeParameter('embedTitle', i, '') as string)
        .setDescription(verifyString(content)) // Use Discord.js validation
        .setColor(this.getNodeParameter('embedColor', i, 0x00ae86) as number)

      // Use Discord.js components
      const button = new ButtonBuilder()
        .setCustomId(generateUniqueId(8)) // Shared utility
        .setLabel(this.getNodeParameter('buttonLabel', i) as string)
        .setStyle(ButtonStyle.Primary)

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

      // Direct Discord.js REST API call with built-in rate limiting
      const response = await sendMessage.call(this, channelId, {
        content: verifyString(content),
        embeds: [embed],
        components: [row],
      })

      // Use n8n's data flow pattern
      returnData.push({
        json: response.toJSON(), // Use Discord.js serialization
        pairedItem: { item: i }, // Essential for n8n data flow
      })
    } catch (error) {
      // Use n8n error handling instead of generic Error
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i },
        })
      } else {
        throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i })
      }
    }
  }

  return returnData
}
```

## Workflow Execution Recording

- Workflows are recorded in n8n by using `this.emit([data])` in the trigger method
- In `DiscordTrigger.node.ts`, the `triggerEvent` IPC event handler emits data to n8n

## Error Handling

Use n8n's built-in error handling patterns with Discord.js integration:

```typescript
try {
  // Use Discord.js types for type safety
  const response: APIMessage = await sendMessage.call(this, channelId, content, additionalFields)

  returnData.push({
    json: response,
    pairedItem: { item: itemIndex },
  })
} catch (error) {
  // Use n8n's built-in error types instead of generic Error
  if (error instanceof DiscordAPIError) {
    // Handle specific Discord API errors (rate limits, permissions, etc.)
    if (error.status === 429) {
      // Rate limit error - let Discord.js handle retry automatically
      throw new NodeApiError(this.getNode(), error, {
        message: `Discord API rate limit reached. Discord.js will retry automatically.`,
        httpCode: error.status,
        itemIndex,
      })
    } else if (error.status === 403) {
      // Permission error
      throw new NodeOperationError(this.getNode(), `Missing permissions for Discord operation: ${error.message}`, {
        itemIndex,
        description: 'Check bot permissions in Discord server settings',
      })
    } else if (error.status >= 400 && error.status < 500) {
      // Client error
      throw new NodeApiError(this.getNode(), error, {
        message: `Discord API client error: ${error.message}`,
        httpCode: error.status,
        itemIndex,
      })
    } else {
      // Server error
      throw new NodeApiError(this.getNode(), error, {
        message: `Discord API server error: ${error.message}`,
        httpCode: error.status,
        itemIndex,
      })
    }
  } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    // Network connectivity error
    throw new NodeApiError(this.getNode(), error, {
      message: 'Unable to connect to Discord API. Check your internet connection.',
      itemIndex,
    })
  } else if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
    // SSL/TLS error
    throw new NodeSSLError(this.getNode(), error.message)
  } else {
    // Generic operation error
    throw new NodeOperationError(this.getNode(), error.message || 'Unknown error occurred', {
      itemIndex,
      description: error.description || 'An unexpected error occurred during Discord operation',
    })
  }
}
```

### n8n Error Types (Use These Instead of Generic Error)

- **`NodeOperationError`**: General operation errors with context and item index
- **`NodeApiError`**: API-related errors with HTTP status codes and detailed context
- **`NodeSSLError`**: SSL/TLS related connection errors
- **Continue-on-fail**: Let n8n handle error continuation based on user settings

### Discord.js Error Types (Handled Automatically)

- **`DiscordAPIError`**: HTTP errors from Discord API (rate limits, permissions, invalid data)
- **`RateLimitError`**: Specific rate limiting errors (handled automatically by Discord.js - no custom handling needed)
- **`HTTPError`**: General HTTP errors in REST operations

### Error Handling Best Practices

1. **Use appropriate n8n error types** based on the error category
2. **Provide item index** for data flow context in workflows
3. **Include helpful descriptions** for user troubleshooting
4. **Let Discord.js handle retries** - don't implement custom retry logic
5. **Map HTTP status codes** to appropriate n8n error types
6. **Preserve original error context** while providing user-friendly messages

## Reconnection Logic

Include reconnection handling for Discord.js client (primary) and minimal IPC communication (secondary):

### Discord.js Client Reconnection (Primary)

```typescript
// Discord.js handles WebSocket reconnection automatically
client.on('disconnect', () => {
  console.log('Discord client disconnected, will attempt reconnection...')
})

client.on('reconnecting', () => {
  console.log('Discord client reconnecting...')
})

client.on('ready', () => {
  console.log('Discord client reconnected successfully')
  // Re-establish direct trigger connections if needed
  reestablishTriggerConnections()
})
```

### IPC Reconnection (Fallback Only)

```typescript
// Only use IPC reconnection for essential bot coordination
ipc.of.bot.on('disconnect', () => {
  setTimeout(() => {
    if (this.getWorkflow().active === true) {
      // Re-establish IPC connection only for essential operations
      connectToBot()
    }
  }, 5000)
})
```

## V2 Migration Guidelines

When updating or creating new functionality, prioritize built-in functionality:

### Built-in First Approach

1. **Discord.js Built-ins First**: Always check Discord.js documentation before implementing custom logic
   - Use Discord.js builders (`EmbedBuilder`, `ActionRowBuilder`, etc.)
   - Use Discord.js utilities (`verifyString`, `SnowflakeUtil`, etc.)
   - Use Discord.js constants (`ChannelType`, `ButtonStyle`, etc.)
   - Leverage Discord.js automatic rate limiting and error handling

2. **n8n Built-ins Second**: Use n8n's established patterns and utilities
   - Use n8n error types (`NodeOperationError`, `NodeApiError`, `NodeSSLError`)
   - Use n8n parameter methods (`getNodeParameter`, `getCredentials`, etc.)
   - Use n8n data flow patterns (`pairedItem`, continue-on-fail)
   - Use n8n binary data handling (`IBinaryData`)

3. **Custom Logic Last Resort**: Only implement custom logic when no built-in exists
   - Document why built-ins cannot be used
   - Ensure custom logic follows established patterns
   - Consider if functionality should be contributed upstream

### Development Priorities

1. **Use V2 Action Structure**: Place new operations in `/v2/actions/{resource}/{operation}.operation.ts`
2. **Leverage Discord.js Types**: Import and use official API types from Discord.js (never create custom Discord
   interfaces)
3. **Minimize IPC Dependencies**: Use Discord.js REST API and WebSocket events directly whenever possible
4. **Use n8n Patterns**: Follow n8n's credential, parameter, and error handling patterns
5. **Follow Resource Organization**: Group related operations under logical resources (message, user, guild, etc.)
6. **Maintain Backward Compatibility**: V1 operations should continue to work while V2 provides enhanced functionality
7. **Type Safety First**: Never use `any` types; leverage Discord.js comprehensive type definitions
8. **Direct API Communication**: Prefer Discord.js REST/WebSocket over IPC for all Discord operations

### Built-in Validation Checklist

Before implementing any new functionality, verify:

- ✅ Does Discord.js provide this functionality? (Check builders, utilities, constants)
- ✅ Does n8n-workflow provide this pattern? (Check error types, parameter handling)
- ✅ Can Discord.js handle the error/retry/timeout automatically?
- ✅ Are we using official Discord.js types instead of custom interfaces?
- ✅ Are we following n8n's established data flow patterns?

### Example V2 Operation File Structure

```
/v2/actions/
├── message/
│   ├── send.operation.ts
│   ├── edit.operation.ts
│   └── remove.operation.ts
├── prompt/
│   ├── button.operation.ts
│   └── select.operation.ts
└── user/
    ├── get.operation.ts
    └── update.operation.ts
```
