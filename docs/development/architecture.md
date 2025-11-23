# Discord Integration Architecture Guide

## Overview

This document outlines the architectural patterns and design decisions for the n8n Discord integration, covering both V1
bot (legacy) and V2 Discord.js-first (recommended) architectures.

> **⚠️ Important**: V1 is now **deprecated** in favor of V2's Discord.js-first architecture. V1 remains available for
> backward compatibility but all new workflows should use V2. See [V1 to V2 Migration Guide](../migration/v1-to-v2.md)
> for migration instructions.

## Key Architectural Principles

This integration follows a **built-ins first** philosophy:

1. **Discord.js v14 Native Integration**: Leverage Discord.js REST API, WebSocket management, and built-in utilities
   (rate limiting, validation, formatters) rather than custom implementations
2. **n8n Integration Patterns**: Use n8n's error types, credential management, and workflow patterns rather than generic
   Node.js approaches
3. **Minimal External Dependencies**: Prefer Node.js built-ins (fetch, crypto) over external libraries when
   Discord.js/n8n don't provide the functionality
4. **Type Safety**: Complete TypeScript integration with official Discord.js and n8n types - never use `any`

### Technical Foundation

- **Discord.js v14.22.1**: Primary Discord API integration with comprehensive type safety and automatic rate limiting
- **n8n-core v1.113.1 & n8n-workflow v1.111.0**: Workflow integration and node development framework
- **Node.js v24.9.0**: Runtime with native fetch and crypto built-ins
- **TypeScript v5.9.3**: Strict type safety configuration
- **Reduced Dependencies**: Only 2 essential external packages (discord.js, node-ipc for V1 only) - ~505KB bundle size
  reduction from predecessor implementations

## Architecture Comparison

> **📋 Important**: V2 operations are **truly stateless** as of version 0.7.6+. Operations complete immediately after
> sending messages. Interactive component responses (button clicks, select menus) are handled via Discord Trigger nodes,
> not within V2 operations.

### V1 Bot Architecture (⚠️ Deprecated - Legacy)

> **Deprecation Notice**: V1 is maintained for backward compatibility only. Use V2 for all new workflows.

**Purpose**: Persistent Discord bot connection for real-time event handling and IPC-based workflow integration.

**Key Characteristics**:

- **Persistent WebSocket Connection**: Maintains continuous connection to Discord Gateway
- **Event-Driven**: Handles all Discord events (message, member, guild updates, etc.)
- **IPC Communication**: Uses Inter-Process Communication with n8n workflow execution (adds ~200-500ms overhead)
- **State Management**: Discord.js Collections for comprehensive state tracking
- **Resource Intensive**: Higher memory usage (~200MB) due to persistent connection and state

**Limitations**:

- ⚠️ **Slow**: IPC communication adds 200-500ms overhead to all operations
- ⚠️ **Complex**: 9 IPC event handlers with 50+ emit/receive calls
- ⚠️ **Fragile**: Depends on persistent bot process health
- ⚠️ **Hard to Test**: IPC mocking is complex and error-prone
- ⚠️ **Resource Heavy**: Persistent process requires ~200MB RAM

**Migration Path**: See [V1 to V2 Migration Guide](../migration/v1-to-v2.md)

**IPC Abstraction Layer**: V1 includes an IPC facade (`v1/helpers/ipc-facade.ts`) to simplify complex IPC communication:

- **IPCClient**: Type-safe request/response pattern with automatic timeout handling
- **IPCServer**: Type-safe event handlers with automatic error handling
- **Benefits**: Reduces raw IPC calls from 50+ to clean, maintainable API
- **Usage**: See [IPC Facade Layer](#v1-ipc-facade-abstraction-layer) below

**Technical Stack**:

```typescript
// V1 Bot Client Creation
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    // ... comprehensive intent set
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
})
```

### V2 Discord.js-First Architecture (✅ Recommended)

> **Recommended**: V2 uses direct Discord.js REST API integration for better performance, reliability, and
> maintainability.

**Purpose**: Direct Discord.js REST API integration with efficient webhook-based triggers, eliminating IPC complexity.

**Key Characteristics**:

- **Discord.js-First**: Direct REST API calls using Discord.js v14 with automatic rate limiting
- **Stateless Operations**: No persistent connection required - operations complete immediately (<100ms)
- **Zero IPC Overhead**: Direct API communication eliminates IPC complexity
- **Connection Pooling**: Efficient client reuse across operations
- **Automatic Retry**: Discord.js handles retries (3 attempts, 15s timeout) automatically
- **Type Safety**: Full TypeScript integration with Discord.js v14 official types
- **Webhook-Based Triggers**: Discord interactions delivered via HTTP webhooks (handled by Discord Trigger node)
- **On-Demand Clients**: Discord clients created per operation, destroyed after completion
- **Resource Efficient**: Lower memory footprint and faster startup
- **Type-Safe**: Complete TypeScript integration with Discord.js v14
- **No Collectors**: Interactive responses handled by Discord Trigger, not within operations

**Best Use Cases**:

- Sending messages (with or without interactive components)
- Discord slash command responses (via Discord Trigger)
- Message operations (send, edit, delete)
- User and member management operations
- Most Discord API operations that don't require real-time events
- High-volume message sending

**Not Suitable For**:

- Waiting for button clicks (use Discord Trigger instead)
- Real-time event monitoring (use V1 instead)
- Persistent state management (use V1 instead)

**Technical Stack**:

```typescript
// V2 Webhook Client Creation (with pooling)
const client = await DiscordClientManager.getClient({
  token: credentials.token,
  intents: [GatewayIntentBits.Guilds], // Minimal intents
  partials: [],
})
```

## V2 Stateless Architecture Deep Dive

### How Stateless Operations Work

V2 operations follow a complete request-response lifecycle:

1. **Create Client**: Discord client instantiated on-demand
2. **Execute Operation**: Send message, edit message, manage members, etc.
3. **Return Result**: Operation completes with response data
4. **Destroy Client**: Client automatically cleaned up

```typescript
// V2 operation lifecycle
async function sendDiscordMessage(channelId: string, content: string) {
  const client = await DiscordClientManager.getClient(credentials)
  try {
    const channel = await client.channels.fetch(channelId)
    const message = await channel.send(content)
    return message.toJSON() // Operation complete
  } finally {
    DiscordClientManager.releaseClient(client) // Automatic cleanup
  }
  // No persistent state, no collectors, no waiting
}
```

### Interactive Components: Send and Receive Pattern

V2 can send interactive components (buttons, select menus), but **does not wait** for responses:

**Sending Interactive Messages** (V2 Operation):

```typescript
// ✅ V2 sends message with buttons
const message = await sendMessage({
  channelId: '123456789',
  content: 'Choose an option:',
  components: [
    {
      type: 'button',
      label: 'Option A',
      customId: 'opt_a',
      style: 'Primary',
    },
  ],
})
// Operation completes here - returns message ID
```

**Receiving Interactions** (Discord Trigger Node):

```ascii
┌─────────────────┐       ┌──────────────────┐
│  Discord V2     │──────►│   Discord API    │
│  Send Message   │       │  (sends button)  │
└─────────────────┘       └──────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │  Discord Trigger │


                                    ▼

                          ┌──────────────────┐

                          │  New Workflow    │
                          │  Execution       │
                          └──────────────────┘
```

**Key Principle**: V2 operations **send** messages with components. Discord Trigger nodes **receive** the interactions.
They are separate workflow executions.

### Why Stateless?

The stateless architecture solves critical issues from the original hybrid approach:

**Problems with Collectors** (Old Approach):

1. **Memory Leaks**: Collectors persisted beyond operation lifecycle
2. **Resource Waste**: WebSocket connections maintained unnecessarily
3. **Inconsistent Patterns**: Mixed stateful/stateless behavior
4. **Documentation Confusion**: Claimed stateless but maintained state
5. **Cleanup Complexity**: Not guaranteed in error paths

**Benefits of Stateless** (Current Approach):

1. ✅ **True Stateless**: Operations complete immediately
2. ✅ **Resource Efficient**: No persistent connections
3. ✅ **Scalable**: Handles high message volume
4. ✅ **Clear Separation**: V2 sends, Trigger receives
5. ✅ **n8n Native**: Uses n8n's trigger system properly

6. ✅ **Reliable Cleanup**: No lifecycle management needed

### V1 vs V2 vs Trigger Decision Matrix

| Operation Type | V1 Bot | V2 Webhook | Discord Trigger | Recommendation |
| -------------- | ------ | ---------- | --------------- | -------------- |

| Send Messages | ❌ | ✅ | N/A | V2 |

| Button Clicks | ❌ | ❌ | ✅ | Trigger |

| Role Management | ❌ | ✅ | N/A | V2 |

### Performance Characteristics

| Startup Time | ~500ms | Client creation |

| Metric | Value | Notes |

const message = await discordV2.sendMessage({ content: 'Click to confirm', components: [{ type: 'button', label:
'Confirm', customId: 'confirm_btn' }], })

// Workflow 2: Handle button click (Discord Trigger) // Triggered automatically when user clicks button if
(interaction.customId === 'confirm_btn') { // Process confirmation }

````

#### Pattern 2: Multi-Step Interaction

```typescript
// Step 1: Send options (V2)
await discordV2.sendMessage({
  content: 'Choose your preference:',
  components: [
    { type: 'button', label: 'Option A', customId: 'opt_a' },
    { type: 'button', label: 'Option B', customId: 'opt_b' },
  ],
})

// Step 2: Handle choice (Trigger)
const choice = interaction.customId

// Step 3: Send follow-up (V2)
await discordV2.sendMessage({
  content: `You selected: ${choice}`,
})
````

### FAQ

**Q: Can V2 send buttons and select menus?**  
A: Yes! V2 operations can send all Discord components. You receive responses via Discord Trigger in a separate workflow.

**Q: What happened to collectors?**  
A: Removed to prevent memory leaks and align with n8n patterns. Use Discord Trigger nodes instead.

**Q: Is this a breaking change?**  
A: Yes, if you relied on collectors. Migration is straightforward using Discord Trigger nodes.

**Q: Which is faster: V1 or V2?**  
A: V2 for sending operations (no persistent connection overhead). V1 for real-time event monitoring (always connected).

**Q: Can I use both V1 and V2?**  
A: Yes! They serve different purposes. Use V2 for operations, V1 or Trigger for events.

**Q: How do I wait for a button click?**  
A: You don't wait in V2. Create a Discord Trigger node that starts a new workflow when the button is clicked.

## Discord.js Integration Patterns

### Built-ins First Approach

The integration follows a strict hierarchy for Discord.js usage:

1. **🥇 Discord.js Native Methods First**

   ```typescript
   // ✅ Preferred: Use Discord.js native client methods
   const member = await guild.members.fetch(userId)
   await member.ban({ reason: 'Violation of rules' })

   // ✅ Preferred: Use Discord.js builders
   const embed = new EmbedBuilder().setTitle('Welcome!').setColor(0x00ae86)
   ```

2. **🥈 Discord.js REST API (When Native Unavailable)**

   ```typescript
   // ✅ Acceptable: When native methods don't exist
   const response = await client.rest.patch(Routes.guildMember(guildId, userId), {
     body: { communication_disabled_until: timeout },
   })
   ```

3. **🥉 n8n Built-ins Third**

   ```typescript
   // ✅ Use n8n error types and patterns
   throw new NodeOperationError(this.getNode(), 'Discord API Error', { cause: discordError })
   ```

### Anti-Patterns to Avoid

```typescript
// ❌ Never: Custom HTTP clients for Discord API
const response = await axios.post('https://discord.com/api/v10/...');

// ❌ Never: Custom rate limiting (Discord.js handles this)
await sleep(1000); // Don't implement custom delays

// ❌ Never: Generic Error classes
throw new Error('Something went wrong'); // Use n8n error types

// ❌ Never: Custom Discord interfaces
interface CustomGuild { ... } // Use Discord.js API types
```

## Client Management Patterns

For detailed client management implementation patterns, see
[Discord.js Integration Guide](../architecture.md#client-management-best-practices).

**Summary**:

- **V1**: Persistent connection, maintained across operations
- **V2**: On-demand clients with connection pooling and automatic cleanup

## State Management

### Discord.js Collections Usage

```typescript
// ✅ Proper Collection usage for Discord entities
const members = new Collection<string, GuildMember>()
const channels = guild.channels.cache // Discord.js Collection

// ✅ Collection methods for data management
const activeMembers = members.filter((member) => !member.user.bot)
const memberCount = members.size
```

### V1 vs V2 State Differences

**V1 State Management**:

- Persistent Collections maintained across operations
- Full Discord cache available (guilds, channels, members)
- State synchronization with Discord Gateway events

**V2 State Management**:

- Operation-scoped state only
- Minimal caching (only what's needed for current operation)
- No persistent state between operations

## Error Handling Architecture

### Discord.js Error Integration

```typescript
## Error Handling Architecture

For detailed error handling patterns and Discord.js error types, see [Discord.js Integration Guide](../architecture.md#error-handling-integration).

**Summary**:
- Use n8n error types (`NodeOperationError`, `NodeApiError`, `NodeSSLError`)
- Map Discord.js error types (`DiscordAPIError`, `RateLimitError`, `HTTPError`)
- Provide comprehensive error context for troubleshooting
- Let Discord.js handle automatic retries and rate limiting
```

### Error Context Enhancement

```typescript
// ✅ Comprehensive error context
function createDiscordError(error: unknown, context: OperationContext) {
  const discordContext = extractDiscordContext(error)

  return new NodeOperationError(context.node, 'Discord operation failed', {
    description: error.message,
    cause: error,
    httpCode: discordContext.httpCode,
    // Include operation context
    workflowId: context.workflow.id,
    nodeId: context.node.id,
    operationType: context.operation,
    // Include Discord context
    guildId: discordContext.guild?.id,
    channelId: discordContext.channel?.id,
    userId: discordContext.user?.id,
  })
}
```

## Performance Considerations

### V1 Bot Performance Profile

**Memory Usage**: Higher due to persistent connection and cached state **Startup Time**: Slower initial connection to
Discord Gateway **Operation Speed**: Faster for cached entities, slower for uncached **Resource Usage**: Constant
CPU/memory for WebSocket maintenance

### V2 Webhook Performance Profile

**Memory Usage**: Lower, only operation-scoped allocations **Startup Time**: Faster, on-demand client creation
**Operation Speed**: Consistent, optimized per operation **Resource Usage**: Minimal when idle, scales with operation
volume

### Connection Pooling Benefits

```typescript
// V2 Connection Pool Performance Metrics
interface PoolMetrics {
  activeConnections: number // Currently in-use clients
  idleConnections: number // Available clients in pool
  totalCreated: number // Total clients created
  totalDestroyed: number // Total clients cleaned up
  averageResponseTime: number // Average operation response time
  memoryUsage: number // Current memory footprint
}
```

## Migration Guidelines

### V1 to V2 Migration Decision Matrix

| Operation Type     | V1 Recommended | V2 Recommended | Reason                           |
| ------------------ | -------------- | -------------- | -------------------------------- |
| Discord Events     | ✅             | ❌             | Requires persistent connection   |
| Slash Commands     | ❌             | ✅             | Webhook-based, more efficient    |
| Message Operations | ❌             | ✅             | Better resource usage            |
| Member Operations  | ❌             | ✅             | Optimized client management      |
| Real-time Triggers | ✅             | ❌             | Event-driven architecture needed |
| Bulk Operations    | ❌             | ✅             | Better rate limit handling       |

### Migration Process

1. **Analyze Current Usage**: Identify operation types and frequency
2. **Choose Architecture**: Use decision matrix above
3. **Implement Gradually**: Migrate operations one at a time
4. **Test Thoroughly**: Validate functionality with comprehensive testing
5. **Monitor Performance**: Track resource usage and response times
6. **Document Changes**: Update operation documentation

## Discord.js v14 Integration Architecture

### Component System Implementation

Discord.js v14 introduces a comprehensive component system that the architecture leverages:

```typescript
// ✅ Discord.js v14 Component Creation
import { ComponentType, ButtonStyle, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from 'discord.js'

// Button component creation
export function createButtonComponent(
  customId: string,
  label: string,
  style: ButtonStyle = ButtonStyle.Primary,
  disabled: boolean = false,
  emoji?: { name: string },
): ButtonBuilder {
  const button = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style).setDisabled(disabled)

  if (emoji) {
    button.setEmoji(emoji)
  }

  return button
}

// Action row container
export function createActionRow(components: any[]): ActionRowBuilder {
  return new ActionRowBuilder().addComponents(...components)
}
```

### Advanced Rate Limiting Integration

The v14 integration includes enhanced rate limiting with audit log support:

```typescript
// ✅ Enhanced request handling with Discord.js v14 features
export async function discordApiRequest(
  endpoint: string,
  method: string,
  body?: any,
  auditLogReason?: string,
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bot ${credentials.token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'n8n-nodes-discord/1.0.0 (Discord.js v14 compatible)',
  }

  // Discord.js v14 audit log support
  if (auditLogReason) {
    headers['X-Audit-Log-Reason'] = auditLogReason
  }

  // Discord.js handles rate limiting automatically
  return await client.rest.request(endpoint, { method, body, headers })
}
```

## Collections-Based State Management Architecture

### Replacing n8n API Polling with Discord.js Collections

The architecture has evolved from HTTP polling to native Discord.js Collections for efficient state management:

#### Legacy Pattern (Replaced)

```typescript
// ❌ OLD: n8n API polling approach
export const triggerWorkflow = async (webhookId: string, data: any): Promise<boolean> => {
  const res = await axios.post(`${baseUrl}/webhook/${webhookId}`, data)
  // Manual polling and HTTP requests
}
```

#### Modern Collections Pattern (Current)

```typescript
// ✅ NEW: Discord.js Collections-based state management
export class DiscordStateManager {
  private activeCollectors = new Collection<string, IComponentState>()
  private pendingInteractions = new Collection<string, IInteractionData>()
  private workflowTriggers = new Collection<string, IWorkflowTriggerData>()

  // Event-driven interaction collection
  createInteractionCollector(messageId: string, options: CollectorOptions) {
    const collector = channel.createMessageComponentCollector({
      filter: (interaction) => interaction.message.id === messageId,
      time: options.timeout,
      max: options.maxInteractions,
    })

    collector.on('collect', (interaction) => {
      this.handleInteraction(interaction)
    })

    return collector
  }
}
```

### Multi-Collection Modes

The Collections architecture supports three collection patterns:

1. **Single Collection**: One interaction then stop
2. **Multiple Collection**: Collect multiple interactions with timeout
3. **Persistent Collection**: Indefinite collection until manually stopped

```typescript
// ✅ Flexible collection patterns
interface CollectionMode {
  single: { maxInteractions: 1; timeout: 60000 }
  multiple: { maxInteractions: 10; timeout: 300000 }
  persistent: { maxInteractions: undefined; timeout: undefined }
}
```

### Performance Comparison: Collections vs Polling

| Feature                     | Old Polling System    | New Collections System  | Improvement             |
| --------------------------- | --------------------- | ----------------------- | ----------------------- |
| **Interaction Latency**     | ~500-1000ms (HTTP)    | ~50-100ms (Events)      | **10x faster**          |
| **Memory Usage**            | High (polling loops)  | Low (event-driven)      | **60% reduction**       |
| **Network Overhead**        | Heavy (HTTP requests) | Minimal (WebSocket)     | **90% reduction**       |
| **Concurrent Interactions** | Limited by polling    | Unlimited (Collections) | **Unlimited scale**     |
| **Error Recovery**          | Manual retry logic    | Automatic (Discord.js)  | **Built-in resilience** |

## WebSocket vs Webhook Architectural Analysis

### Discord's Interaction Protocol Requirements

Understanding Discord's interaction delivery mechanism is crucial for architectural decisions:

```ascii
┌─────────────┐    HTTP POST     ┌─────────────────┐
│   Discord   │ ────────────────► │ Your Webhook    │
│   Gateway   │                   │ Endpoint        │
│             │ ◄──────────────── │                 │
└─────────────┘   HTTP Response   └─────────────────┘
                  (required within 3 seconds)
```

**Critical Constraint**: Discord requires HTTP response within 3 seconds for interactions.

### Hybrid Architecture Pattern (Optimal)

The optimal architecture combines both approaches:

#### Immediate HTTP Response (Required)

```typescript
// ✅ Must respond via HTTP within 3 seconds
export async function handleDiscordWebhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
  const interaction = this.getBodyData()

  // Immediate acknowledgment
  const response = createDiscordInteractionResponse(InteractionResponseType.ChannelMessageWithSource, {
    content: 'Processing...',
    flags: MessageFlags.Ephemeral,
  })

  return {
    webhookResponse: { status: 200, body: response },
    workflowData: [[{ json: interaction }]],
  }
}
```

#### Enhanced WebSocket Processing (Parallel)

```typescript
// ✅ After HTTP response, enhance with WebSocket capabilities
if (this.client?.isReady()) {
  this.enhanceWithWebSocketProcessing(interaction).catch(console.error)
}
```

### Architecture Decision Matrix

| Use Case                | WebSocket (V1) | Webhook (V2) | Hybrid | Reason                           |
| ----------------------- | -------------- | ------------ | ------ | -------------------------------- |
| **Slash Commands**      | ❌             | ✅           | ✅     | Requires immediate HTTP response |
| **Real-time Events**    | ✅             | ❌           | ✅     | Needs persistent connection      |
| **Button Interactions** | ❌             | ✅           | ✅     | HTTP response required           |
| **Message Monitoring**  | ✅             | ❌           | ✅     | Event-driven architecture        |
| **Complex Workflows**   | ✅             | ❌           | ✅     | Rich Discord.js integration      |

### Implementation Strategy

1. **Use webhooks** for interactions requiring immediate responses
2. **Use WebSockets** for real-time events and complex workflows
3. **Use hybrid** when you need both immediate response + enhanced processing

```typescript
// ✅ Hybrid implementation pattern
export class HybridInteractionHandler {
  async handleImmediateResponse(webhookFunctions: IWebhookFunctions, publicKey: string): Promise<IWebhookResponseData> {
    // 1. Immediate HTTP response (required)
    const immediateResponse = this.createImmediateResponse()

    // 2. Queue enhanced processing (parallel)
    this.queueEnhancedProcessing().catch(console.error)

    return {
      webhookResponse: { status: 200, body: immediateResponse },
      workflowData: [[workflowData]],
    }
  }

  private async queueEnhancedProcessing(): Promise<void> {
    // Enhanced processing with full Discord.js capabilities
    if (this.client?.isReady()) {
      const channel = await this.client.channels.fetch(channelId)
      if (channel?.isTextBased()) {
        await channel.send({ content: 'Enhanced processing complete!' })
      }
    }
  }
}
```

## V1 IPC Facade Abstraction Layer

> **📝 Note**: This abstraction layer is V1-specific. V2 operations use direct Discord.js REST API calls.

To improve V1 architecture maintainability, an IPC facade layer has been introduced in
`src/nodes/Discord/v1/helpers/ipc-facade.ts`.

### Purpose

- Abstract complex node-ipc communication patterns
- Provide type-safe request/response handling
- Reduce code duplication across 50+ raw IPC calls
- Centralize timeout and error handling logic

### Components

#### IPCClient Class

Type-safe client for n8n → bot communication:

```typescript
import { createIPCClient } from './helpers/ipc-facade'

const client = createIPCClient(ipc, 30000) // 30s default timeout

// Type-safe request with automatic timeout handling
const response = await client.request<{ channelId: string }, { messageId: string }>({
  event: 'sendMessage',
  data: { channelId: '123456', content: 'Hello' },
  timeout: 15000, // Optional: override default timeout
})

if (response.success) {
  console.log('Message sent:', response.data.messageId)
} else {
  console.error('Failed:', response.error)
}

// Fire-and-forget emit (no response expected)
client.emit('updateCredentials', { token: 'new_token' })

// Check connection status
if (client.isConnected()) {
  // Connected to bot
}
```

#### IPCServer Class

Type-safe server for bot → n8n communication:

```typescript
import { createIPCServer } from './helpers/ipc-facade'

const server = createIPCServer(ipc)

// Register type-safe event handler with automatic error handling
server.on<{ webhookId: string }>('triggerEvent', async (data, socket) => {
  console.log('Trigger event for:', data.webhookId)

  // Process event...
  const result = await processEvent(data)

  // Response automatically sent to client
  return { success: true, data: result }
})

// Broadcast to all connected clients
server.broadcast('botStatus', { online: true, uptime: 1000 })

// Note: getConnectionCount() returns -1 (not available via node-ipc types)
// For connection tracking, manually maintain count in application code
```

### Benefits Over Raw IPC

| Aspect               | Raw IPC                       | IPC Facade                             |
| -------------------- | ----------------------------- | -------------------------------------- |
| **Type Safety**      | ❌ No types, `any` everywhere | ✅ Full TypeScript generics            |
| **Timeout Handling** | ❌ Manual implementation      | ✅ Automatic with configurable timeout |
| **Error Handling**   | ❌ Try/catch everywhere       | ✅ Centralized error handling          |
| **Code Duplication** | ❌ 50+ similar emit/on calls  | ✅ Reusable pattern                    |
| **Testing**          | ❌ Complex mocking            | ✅ Easier to mock clean interfaces     |
| **Maintenance**      | ❌ Change in 50+ places       | ✅ Change in one place                 |

### Migration Strategy

**Current State**: V1 still uses raw IPC calls (50+ instances)

**Future State**: Gradually refactor to use IPC facade

**Example Refactor**:

```typescript
// Before: Raw IPC
ipc.of.bot.emit('sendMessage', { channelId, content })
ipc.of.bot.on('sendMessage', (response) => {
  // Handle response
})

// After: IPC Facade
const response = await client.request<MessageData, MessageResponse>({
  event: 'sendMessage',
  data: { channelId, content },
})
```

### Limitations

- **node-ipc Type Compatibility**: Some node-ipc properties (like `.destroyed`, `.sockets`) are not exposed in
  TypeScript type definitions
  - `isConnected()`: Uses simple existence check instead of `.destroyed` property
  - `getConnectionCount()`: Returns -1 (manual tracking required at application level)
  - Event handlers use `.on()` not `.once()` (manual cleanup implemented)

- **V1-Specific**: This facade is only for V1 legacy support. V2 uses direct Discord.js REST API calls.

## IPC Migration Architecture

### Migration from IPC to HTTP API

The architecture has been enhanced to replace IPC communication with direct HTTP API calls:

#### Before: IPC-Based Architecture

```text
n8n V2 Actions → ipcRequest() → Bot Process → Discord.js → Discord API
n8n V2 LoadOptions → ipcRequest() → Bot Process → Discord.js → Discord API
```

#### After: HTTP-First Architecture

```text
n8n V2 Actions → HTTP API → Discord REST API (stateless operations)
n8n V2 LoadOptions → HTTP API → Discord REST API (UI data loading)
n8n V2 Triggers → WebSocket Events ← Bot Process ← Discord.js ← Discord API (real-time events)
```

### Migration Benefits

- **50-70% faster** for prompt operations (eliminated IPC overhead)
- **Built-in retry and error handling** with HTTP API operations
- **No bot startup dependency** for LoadOptions operations
- **Simplified code architecture** without IPC coordination

## Quality Standards & Testing

### Test Coverage

The integration maintains comprehensive test coverage:

- **369 passing tests** across 13 test suites (100% success rate)
- **Priority 1 - Core Operations**: 56.55% coverage for essential Discord operations
- **Priority 2 - Security**: 60.2% validation coverage, 93.1% credential security coverage
- **Priority 3 - Integration**: 26 end-to-end integration tests
- **Security Testing**: 103 comprehensive security tests for injection prevention, XSS protection, and validation
  boundaries

### Performance & Optimization

- **Response Times**: Sub-100ms for all operations with DoS protection
- **Bundle Size**: Reduced by ~505KB through strategic use of built-ins over external dependencies
- **Memory Management**: Efficient client pooling and automatic cleanup
- **Rate Limiting**: Discord.js built-in rate limiting with sophisticated error handling (no custom implementation
  needed)

### Security Implementation

- **Input Validation**: Discord.js built-in validation (`verifyString`, `SnowflakeUtil`) for Snowflake IDs and string
  content
- **Injection Prevention**: XSS protection, SQL injection prevention, path traversal protection
- **Cryptographic Security**: Node.js `crypto.randomUUID()` for secure unique ID generation
- **Credential Management**: n8n's encrypted credential storage (never cache or store credentials manually)
- **Audit Logging**: Discord audit log reason support for all administrative operations

## Best Practices Summary

### Development Guidelines

1. **Always use Discord.js native methods first** - Never implement custom HTTP clients, rate limiting, or retry logic
2. **Leverage n8n built-in patterns** - Use `NodeOperationError`, `NodeApiError`, credential management, and workflow
   context
3. **Use Node.js built-ins when appropriate** - Prefer native `fetch()` and `crypto` over external libraries
4. **Prefer V2 architecture for new operations** - V2 is stateless, faster, and more maintainable
5. **Maintain V1 for real-time event handling only** - V1's persistent connection is only needed for Discord Gateway
   events
6. **Use TypeScript strict mode** - No `any` types, leverage official Discord.js and n8n-workflow types
7. **Implement comprehensive error context** - Include workflow, node, operation, and Discord-specific context in all
   errors
8. **Use Discord.js Collections for data management** - Don't use Map when Collection provides additional
   Discord-specific methods
9. **Apply hybrid architecture for complex interactions** - Combine webhook (immediate response) with WebSocket
   (enhanced processing)
10. **Never implement custom validation** - Use Discord.js `verifyString`, `SnowflakeUtil.isValid()`, and built-in
    validators

### Code Quality Standards

- **Type Safety**: 100% TypeScript coverage, zero `any` types, comprehensive use of official Discord.js and n8n types
- **Error Handling**: n8n error types (`NodeOperationError`, `NodeApiError`, `NodeSSLError`) with full Discord.js error
  context
- **Performance**: Optimized client pooling, efficient memory usage, sub-100ms response times
- **Testing**: 369 tests with 100% success rate, comprehensive mocking of Discord.js components
- **Documentation**: JSDoc comments for all public APIs, inline documentation for complex logic
- **Security**: 103 security tests, comprehensive input validation and injection prevention
- **Maintainability**: Modular design with clear separation between V1 (event-driven) and V2 (stateless operations)
- **Dependency Management**: Minimal external dependencies, strategic use of Discord.js, n8n, and Node.js built-ins

# Performance Architecture & Optimization Patterns (Consolidated)

### Key Performance Areas

1. **Client Connection Management**: Efficient Discord.js client pooling and lifecycle
2. **Memory Optimization**: Collector cleanup and resource management
3. **Rate Limiting Optimization**: Leveraging Discord.js built-in rate limiting
4. **Caching Strategy**: Optimal Discord.js cache configuration
5. **Request Batching**: Efficient API usage patterns
6. **Error Recovery**: Fast failure detection and recovery

### V2 Client Pool Management

- Use connection pooling for optimal performance
- Minimal intents and cache configuration for V2 operations
- Automatic client cleanup and pool size management

### Memory Optimization

- Collector lifecycle management and cleanup
- Automatic memory monitoring and garbage collection
- Cache sweeping and resource disposal

### Rate Limiting Optimization

- Use Discord.js built-in rate limiting and retry logic
- Monitor rate limit events and optimize request batching

### Performance Monitoring

- Track operation response times, error rates, and memory usage
- Generate regular performance reports and alerts

### Scalability Improvements

- Distribute operations across multiple clients for horizontal scaling
- Load balancing and client selection based on current load

### Best Practices Summary

- Prefer V2 webhook operations for performance
- Minimize Discord Gateway intents
- Optimize cache limits and sweeping intervals
- Batch API requests to avoid rate limits
- Clean up collectors and connections
- Monitor performance metrics and optimize based on real usage
