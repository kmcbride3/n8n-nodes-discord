# Discord Integration Architecture Guide

## Overview

This document outlines the architectural patterns and design decisions for the n8n Discord integration, covering both V1
bot (legacy) and V2 Discord.js-first (recommended) architectures.

> **⚠️ Important**: V1 is now **deprecated** in favor of V2's Discord.js-first architecture. V1 remains available for
> backward compatibility but all new workflows should use V2.

> See [V1 to V2 Migration Guide](migration/v1-to-v2.md) for migration instructions.

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
> sending messages.

> Interactive component responses (button clicks, select menus) are handled via Discord Trigger nodes, not within V2
> operations.

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

**Migration Path**: See [V1 to V2 Migration Guide](migration/v1-to-v2.md)

**IPC Abstraction Layer**: V1 includes an IPC facade (`v1/helpers/ipc-facade.ts`) to simplify complex IPC communication:

- **IPCClient**: Type-safe request/response pattern with automatic timeout handling
- **IPCServer**: Type-safe event handlers with automatic error handling
- **Benefits**: Reduces raw IPC calls from 50+ to clean, maintainable API
- **Usage**: See [IPC Facade Layer](#v1-ipc-facade-abstraction-layer) below

### V1 IPC Facade Abstraction Layer

The IPC facade consolidates complex IPC interactions into a small set of typed APIs. See `v1/helpers/ipc-facade.ts` for
the implementation and usage examples.

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

## API Reference

This section collects the operation and trigger reference information for the Discord integration. It is intended to be
the canonical manual for each node/resource/operation and includes the following:

- Resource list: Message, Prompt, Action, User, Webhook, Utility
- For each resource:
  - Operation names and short descriptions (e.g. Send, Delete, Button Prompt)
  - Parameter list (name, type, required, default, description)
  - Example request/response JSON shape where applicable
  - Notes on permission and intent requirements

Source of truth and how to regenerate

- The operation descriptions are authored in the node source files. For V2 operations look under `src/nodes/Discord/v2`:
  - `properties.ts`, `versionDescriptions.ts`, and per-operation `.operation.ts` files contain the UI property
    definitions used by n8n.
  - To generate a living API document, you can add a small script that parses `versionDescriptions.ts` and emits
    markdown or JSON.

Examples and quick lookups

- Quick example (Send Message)

```json
{
  "resource": "message",
  "operation": "send",
  "channelId": "123456789012345678",
  "messageContent": "Hello from n8n"
}
```

See the `src/nodes/Discord/v2/actions/message` folder for complete operation samples and tests in `tests/integration`
for live behavior.

## Webhook Security

This integration supports secure webhook handling for Discord interactions and application webhooks. The recommended
approach implemented by the codebase is described below.

Threat model and goals

- Ensure incoming HTTP requests claiming to be from Discord are authentic
- Prevent replay attacks and message tampering
- Reject malformed or malicious payloads early

Signature verification (Ed25519)

1. Discord signs certain webhook requests using Ed25519 and provides the signature in the `X-Signature-Ed25519` header
   and a timestamp in `X-Signature-Timestamp`.

2. Verification algorithm (high-level):

- Read the raw request body as bytes (canonical body)
- Concatenate `X-Signature-Timestamp` + request body (bytes)
- Use the Discord application's public key to verify the Ed25519 signature in `X-Signature-Ed25519` over that
  concatenated payload
- If verification fails, respond 401 and drop the request

Important implementation notes

- Use canonical body parsing: do not re-stringify parsed JSON for verification; use the raw bytes exactly as received.
- Validate the timestamp: reject requests older than a reasonable window (e.g., 5 minutes) to mitigate replay attacks.
- Normalize line endings and avoid automatic transformations by web frameworks—read raw body bytes.
- Keep public keys in secure environment variables or n8n credentials, not in source code.

Replay prevention and rate limiting

- Check timestamp and reject stale requests
- Maintain a short LRU cache of recent signature/timestamp tuples to detect duplicates during the time window
- Rely on Discord.js and server rate-limits for protection against flooding

Error handling and observability

- Log failed verification attempts with non-sensitive context (do NOT log raw body or private keys)
- Provide an audit event for repeated failures to detect abuse

Where to look in code

- `src/nodes/Discord/v2/helpers` (verification helper functions)
- `tests/integration` contains tests that exercise webhook verification and canonical parsing

## Error Handling Integration

This section describes how the integration maps Discord and network errors into n8n-friendly error types and provides
actionable context for operators and developers.

- Map Discord.js errors (e.g., `DiscordAPIError`, `HTTPError`) to `NodeApiError`/`NodeOperationError` with added context
  such as guildId, channelId, operation, and workflow/node identifiers.
- Surface rate-limit events and expose metrics for rate-limit windows and retry attempts.
- Ensure errors that may contain sensitive data are scrubbed before logging; use structured logs and include tracing
  identifiers.

See `src/nodes/Discord/v2/helpers/error-handling.ts` for mapping logic and `src/nodes/Discord/shared` for context
helpers.

## Performance Optimization

This section documents practical performance guidance and configuration options used in the codebase.

Client management

- On-demand client creation: clients are created when needed for operations and released when unused.
- Client pool with reference counting: reuse clients for multiple operations within the same workflow/runtime to
  minimize connection churn and GC pressure.
- Configurable idle timeouts: tune idle-client disposal thresholds based on load and available memory.

Collectors and interaction lifetime

- Use collector limits and timeouts to prevent unbounded collector growth:
  - `max`, `maxUsers`, and `time` options on collectors
- Register collectors in a manager that ensures cleanup on `end` and on process shutdown
- For long-running interactions use persistent storage of collector state if needed, otherwise prefer short timeouts and
  ephemeral flows

Memory and GC considerations

- Monitor heap usage and watch for slow growth — add alerts if heap increases beyond expected thresholds
- Prefer small, short-lived objects for per-interaction state. Heavy caches should have LRU eviction with size limits

Rate limits and request batching

- Discord.js handles most rate-limit detail. Design operations to avoid excessive per-item requests (batch model where
  available).
- For bulk operations (e.g., bulk delete), use dedicated bulk endpoints when available to reduce request counts.

Operational guidance

- In production, enable metrics (heap, event-loop lag, active collectors) and configure alerts
- Provide a graceful shutdown path: stop accepting new interactions, wait for in-flight ops to complete, then cleanup
  collectors and disconnect clients

Where to tune

- Runtime environment: NODE_OPTIONS and memory limits
- Application config: idle client timeout, collector default timeout; these live in the node config and
  `src/nodes/Discord/v2/helpers` client manager

See `docs/troubleshooting/common-errors.md` and `tests/integration` for practical examples and stress tests.

## Client Management Best Practices

This section collects practical guidance for managing Discord clients in V2 operations. Key practices implemented in the
codebase include:

- Use a client pool with reference counting to reuse clients across operations and minimize connection churn.
- Configure sensible idle timeouts and an LRU-style eviction strategy to avoid retaining unused clients indefinitely.
- Monitor client health and implement graceful reconnect logic; surface metrics for active clients and connection
  errors.
- Prefer on-demand clients for short-lived operations and reuse pooled clients for high-throughput paths.

See `src/nodes/Discord/shared/client/discord-client-manager.ts` and `src/nodes/Discord/v2/helpers/connection` for
implementation details.

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
