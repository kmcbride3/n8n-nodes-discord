# V2 Architecture Visual Guide

## Message Flow Diagrams

### 1. Stateless Message Sending (V2 Message Resource)

```ascii
┌─────────────────┐
│   n8n Workflow  │
│  Execute Node   │
└────────┬────────┘
         │
         │ 1. Call sendMessage
         ▼
┌─────────────────────────────┐
│  Discord V2 Send Operation  │
│  (message resource)         │
├─────────────────────────────┤
│ • Create client             │
│ • Send message              │
│ • Destroy client            │
│ • Return message ID         │
│ • NO COLLECTORS             │
└────────┬────────────────────┘
         │
         │ 2. HTTP POST to Discord API
         ▼
┌─────────────────┐
│  Discord API    │
│  Receives msg   │
└────────┬────────┘
         │
         │ 3. Message appears in channel
         ▼
┌─────────────────┐
│  Discord User   │
│  Sees message   │
└─────────────────┘

✅ Operation completes here
✅ No persistent connections
✅ No memory leaks
```

---

### 2. Interactive Component Response (Discord Trigger)

```ascii
┌─────────────────┐
│  Discord User   │
│  Clicks button  │
└────────┬────────┘
         │
         │ 1. Click event
         ▼
┌─────────────────┐
│  Discord API    │
│  Sends webhook  │
└────────┬────────┘
         │
         │ 2. HTTP POST with interaction data
         ▼
┌──────────────────────────┐
│  n8n Discord Trigger     │
│  (webhook endpoint)      │
├──────────────────────────┤
│ • Validate signature     │
│ • Extract interaction    │
│ • Trigger workflow       │
└────────┬─────────────────┘
         │
         │ 3. Trigger new workflow execution
         ▼
┌──────────────────────────┐
│  n8n Workflow Execution  │
│  Process interaction     │
├──────────────────────────┤
│ • Access button ID       │
│ • Access user info       │
│ • Execute logic          │
│ • Send response          │
└──────────────────────────┘

✅ Separate workflow execution
✅ Full interaction data available
✅ n8n native trigger pattern
```

---

### 3. Complete Interactive Workflow

```ascii
WORKFLOW A: Send Interactive Message
═══════════════════════════════════════

┌─────────────┐
│   Trigger   │  Schedule, webhook, etc.
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  Discord V2 Send Msg    │
│  with components        │
├─────────────────────────┤
│ channelId: "12345"      │
│ content: "Choose one:"  │
│ components: [buttons]   │
└──────┬──────────────────┘
       │
       │ Returns: { messageId: "67890", ... }
       ▼
┌─────────────┐
│   Store ID  │  Save messageId for reference
└─────────────┘


WORKFLOW B: Handle Button Click
═══════════════════════════════════════

┌────────────────────────┐
│  Discord Trigger       │  Listens for interactions
│  (webhook)             │
├────────────────────────┤
│ type: interaction      │
│ interactionType: button│
└──────┬─────────────────┘
       │
       │ Triggered when user clicks
       ▼
┌─────────────────────────┐
│  IF Node               │
│  Check button ID       │
├─────────────────────────┤
│ if customId == "yes"   │
│   → Handle Yes         │
│ if customId == "no"    │
│   → Handle No          │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Discord V2 Send Reply │
│  Respond to user       │
└─────────────────────────┘
```

---

### 4. Prompt Resource (Managed Collectors)

```ascii
┌─────────────────┐
│   n8n Workflow  │
│  Execute Node   │
└────────┬────────┘
         │
         │ 1. Call sendButton (prompt resource)
         ▼
┌──────────────────────────────┐
│  Discord V2 Prompt Operation │
│  (prompt resource)           │
├──────────────────────────────┤
│ • Create client              │
│ • Send message               │
│ • Register with StateManager │
│ • Create managed collector   │
│ • Return collector info      │
└────────┬─────────────────────┘
         │
         │ 2. Collector active
         ▼
┌──────────────────────────────┐
│  Discord State Manager       │
│  (manages lifecycle)         │
├──────────────────────────────┤
│ • Monitors interactions      │
│ • Handles cleanup            │
│ • Manages timeouts           │
│ • Prevents memory leaks      │
└──────────────────────────────┘

⚠️ Different from message resource
✅ Collectors centrally managed
✅ Automatic cleanup
```

---

## Resource Comparison

### Message Resource (Stateless)

```ascii
Operation: sendMessage
─────────────────────────

Creation:  New client
Sending:   HTTP POST → Discord
Waiting:   ❌ NO WAIT
Collector: ❌ NO COLLECTOR
Cleanup:   Immediate
State:     ❌ None

Use Case:  Send messages
           Send with components
           No response needed
           High-volume sending
```

### Prompt Resource (Managed State)

```ascii
Operation: sendButton, sendSelect
─────────────────────────────────────

Creation:  New client
Sending:   HTTP POST → Discord
Waiting:   ✅ Collector listens
Collector: ✅ StateManager
Cleanup:   Managed, automatic
State:     ✅ Tracked

Use Case:  Interactive prompts
           Immediate handling
           Bot-like behavior
           Managed lifecycle
```

### Discord Trigger (Event-Driven)

```ascii
Operation: Webhook receive
──────────────────────────

Creation:  Persistent webhook
Sending:   ❌ Not applicable
Waiting:   ✅ Always listening
Collector: ❌ Not needed
Cleanup:   On deactivation
State:     ✅ Workflow trigger

Use Case:  Button responses
           Slash commands
           All interactions
           Event workflows
```

---

## Decision Tree

```ascii
Need to interact with Discord?
       │
       ├─ Send a message?
       │       │
       │       ├─ Just send, no response needed?
       │       │       └─→ Use: Message Resource (sendMessage)
       │       │
       │       └─ Need immediate interactive prompt?
       │               └─→ Use: Prompt Resource (sendButton/sendSelect)
       │
       └─ Receive user interactions?
               │
               ├─ Button clicks?
               │       └─→ Use: Discord Trigger (interaction type)
               │
               ├─ Slash commands?
               │       └─→ Use: Discord Trigger (command type)
               │
               └─ Other Discord events?
                       └─→ Use: V1 Bot or Discord Trigger
```

---

## Memory & Performance Comparison

### Message Resource (Stateless V2) Memory & Performance

```text
Memory Usage:
■□□□□ (Low - temporary only)

Startup Time:
■■■□□ (Medium - client creation)

Throughput:
■■■■■ (High - no state conflicts)

Cleanup:
■■■■■ (Excellent - automatic)

Best For: High-volume, one-way operations
```

### Prompt Resource (Managed State) Memory & Performance

```text
Memory Usage:
■■■□□ (Medium - managed collectors)

Startup Time:
■■■□□ (Medium - client + collector)

Throughput:
■■■□□ (Medium - state management)

Cleanup:
■■■■□ (Good - StateManager handles it)

Best For: Interactive prompts, bot-like behavior
```

### Discord Trigger (Webhook)

```text
Memory Usage:
■□□□□ (Very low - per request)

Startup Time:
■□□□□ (Instant - just HTTP)

Throughput:
■■■■■ (Very high - HTTP scalable)

Cleanup:
■■■■■ (Perfect - stateless HTTP)

Best For: Receiving all user interactions
```

---

## Code Pattern Examples

### ❌ OLD PATTERN (Removed)

```typescript
// This NO LONGER WORKS
const result = await sendMessage({
  content: 'Click me',
  components: [button],
})
// DON'T EXPECT: Collector created here
// DON'T EXPECT: Waiting for clicks
```

### ✅ NEW PATTERN (Stateless)

```typescript
// Workflow 1: Send message
const message = await sendMessage({
  content: 'Click me',
  components: [button],
})
// Returns immediately with message ID

// Workflow 2: Handle click (Discord Trigger)
// Separate workflow, triggered by Discord
on('interaction', (data) => {
  // Handle button click
})
```

### ✅ ALTERNATIVE (Prompt Resource)

```typescript
// Single operation with managed collector
const result = await sendButton({
  content: 'Choose option',
  buttons: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
  ],
})
// Collector managed by StateManager
// Automatically cleaned up
```

---

## Migration Checklist

- [ ] Identify all uses of `sendMessage` with components
- [ ] Check if code expects collector behavior
- [ ] Create Discord Trigger workflows for interactions
- [ ] Update workflow logic to use triggers
- [ ] Test new pattern with real Discord server
- [ ] Update documentation/comments
- [ ] Consider prompt resource for simple prompts
- [ ] Remove any collector-dependent code

---

**Visual Guide Version**: 1.0  
**Last Updated**: October 2, 2025  
**For**: n8n-nodes-discord v0.7.6+
