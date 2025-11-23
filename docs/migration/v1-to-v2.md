# Migration Guide: V1 to V2

This guide helps you migrate your Discord workflows from V1 (IPC-based) to V2 (Discord.js-first) architecture.

## 📋 Table of Contents

- [Why Migrate to V2?](#why-migrate-to-v2)
- [Key Differences](#key-differences)
- [Migration Strategy](#migration-strategy)
- [Operation Mapping](#operation-mapping)
- [Step-by-Step Examples](#step-by-step-examples)
- [Common Pitfalls](#common-pitfalls)
- [Testing Your Migration](#testing-your-migration)
- [Rollback Plan](#rollback-plan)

---

## Why Migrate to V2?

### V2 Advantages

| Feature            | V1 (Legacy)                     | V2 (Modern)                       |
| ------------------ | ------------------------------- | --------------------------------- |
| **Architecture**   | IPC-based bot communication     | Direct Discord.js REST API        |
| **Performance**    | ~200-500ms overhead (IPC)       | <100ms response time              |
| **Reliability**    | Depends on bot process health   | Direct API, no process dependency |
| **Error Handling** | Generic errors                  | Comprehensive Discord.js errors   |
| **Type Safety**    | Limited TypeScript types        | Full Discord.js v14 types         |
| **Rate Limiting**  | Manual handling                 | Automatic Discord.js handling     |
| **Maintenance**    | Complex IPC event handlers      | Simple REST operations            |
| **Resource Usage** | Persistent bot process required | On-demand client pool             |
| **Testing**        | Difficult to mock IPC           | Easy to test REST calls           |

### V2 Features Not Available in V1

- ✅ **Better Error Messages**: Specific Discord API errors with context
- ✅ **Automatic Retries**: Discord.js handles retries automatically (3 attempts, 15s timeout)
- ✅ **Connection Pooling**: Efficient client reuse across operations
- ✅ **Rate Limit Handling**: Automatic queue management
- ✅ **Type Safety**: Full TypeScript integration with Discord.js
- ✅ **Webhook Support**: Native Discord webhook operations
- ✅ **Modern Components**: Up-to-date with Discord API v10

---

## Key Differences

### Architecture Changes

#### V1 Architecture (IPC-Based)

```ascii
┌─────────────┐        ┌──────────┐        ┌─────────────┐
│  n8n Node   │◄──IPC──►│ Bot      │◄──WS──►│  Discord    │
│  (V1)       │        │ Process  │        │  API        │
└─────────────┘        └──────────┘        └─────────────┘
   Slow (~500ms)         Persistent         Rate Limiting
   Complex State         Memory Usage       Manual Retry
```

#### V2 Architecture (Discord.js-First)

```ascii
┌─────────────┐                            ┌─────────────┐
│  n8n Node   │◄──────REST API───────────►│  Discord    │
│  (V2)       │                            │  API        │
└─────────────┘                            └─────────────┘
   Fast (<100ms)                           Auto Rate Limit
   Stateless                               Auto Retry
   Simple Logic                            Connection Pool
```

### Credential Changes

Both V1 and V2 use the same **Discord Bot API** credentials:

- ✅ No credential changes needed
- ✅ Same bot token works for both versions
- ✅ No need to recreate your Discord application

### Operation Changes

| V1 Operation             | V2 Equivalent             | Status         |
| ------------------------ | ------------------------- | -------------- |
| **Send Message**         | Message → Send            | ✅ Full Parity |
| **Send Prompt (Button)** | Prompt → Button           | ✅ Enhanced    |
| **Send Prompt (Select)** | Prompt → Select           | ✅ Enhanced    |
| **Add Role**             | Action → Add Role         | ✅ Full Parity |
| **Remove Role**          | Action → Remove Role      | ✅ Full Parity |
| **Kick User**            | Action → Kick Member      | ✅ Full Parity |
| **Ban User**             | Action → Ban Member       | ✅ Enhanced    |
| **Timeout User**         | Action → Timeout User     | ✅ Enhanced    |
| **Delete Message**       | Message → Delete Message  | ✅ Full Parity |
| **Bulk Delete**          | Message → Remove Messages | ✅ Full Parity |
| **Create Webhook**       | Webhook → Create Webhook  | ✅ New in V2   |
| **Send Webhook**         | Webhook → Send Webhook    | ✅ New in V2   |

---

## Migration Strategy

### Phase 1: Preparation (Before Migration)

1. **Document Current Workflows**
   - List all Discord nodes in your workflows
   - Note which operations each node uses
   - Document any custom error handling

2. **Test Environment Setup**
   - Clone production workflows to test environment
   - Ensure you have Discord bot access
   - Verify credentials work in V2

3. **Review Dependencies**
   - Check if workflows depend on IPC-specific behavior
   - Identify any timing-sensitive operations
   - Document expected response formats

### Phase 2: Migration (During)

1. **One Workflow at a Time**
   - Start with lowest-priority workflows
   - Migrate one operation type at a time
   - Test thoroughly before moving to next

2. **Replace Nodes**
   - Change node version from V1 to V2
   - Remap parameters using mapping table below
   - Update error handling if needed

3. **Test Each Operation**
   - Run workflow in test mode
   - Verify Discord messages appear correctly
   - Check error handling works as expected

### Phase 3: Validation (After)

1. **Monitor Performance**
   - Compare execution times (should be faster)
   - Watch for rate limit issues (rare with V2)
   - Review error logs for new error types

2. **Update Documentation**
   - Document any behavior changes
   - Update team runbooks
   - Note V2-specific features used

---

## Operation Mapping

### Discord Send Node

#### Send Message Operation

**V1 Parameters:**

```javascript
{
  "type": "message",
  "channelId": "123456789",
  "content": "Hello World",
  "embed": false,
  "triggerPlaceholder": false
}
```

**V2 Parameters:**

```javascript
{
  "resource": "message",
  "operation": "send",
  "channelId": "123456789",
  "messageContent": "Hello World"
  // Embed is now separate parameter group
}
```

**Key Changes:**

- `content` → `messageContent`
- `embed` is now a toggle in "Additional Options"
- `triggerPlaceholder` removed (V2 handles automatically)

#### Send Button Prompt

**V1 Parameters:**

```javascript
{
  "type": "prompt",
  "channelId": "123456789",
  "content": "Choose an option",
  "buttons": [
    { "label": "Yes", "value": "yes", "style": 3 },
    { "label": "No", "value": "no", "style": 4 }
  ],
  "timeout": 60000,
  "persistent": false
}
```

**V2 Parameters:**

```javascript
{
  "resource": "prompt",
  "operation": "button",
  "channelId": "123456789",
  "messageContent": "Choose an option",
  "buttons": [
    { "label": "Yes", "value": "yes", "style": "success" },
    { "label": "No", "value": "no", "style": "danger" }
  ],
  "timeout": 60,
  "waitForResponse": true
}
```

**Key Changes:**

- `content` → `messageContent`
- Button `style` uses string enums (`"success"`, `"danger"`, `"primary"`, `"secondary"`)
- `timeout` in seconds (not milliseconds)
- `persistent` → `waitForResponse` (inverted logic)

#### Member Operations (Add Role, Kick, Ban)

**V1 Parameters:**

```javascript
{
  "type": "action",
  "action": "addRole",
  "channelId": "123456789",
  "userId": "987654321",
  "roleId": "111222333"
}
```

**V2 Parameters:**

```javascript
{
  "resource": "action",
  "operation": "addRole",
  "guildId": "123456789",    // Changed from channelId
  "userId": "987654321",
  "roleId": "111222333",
  "reason": "Added via n8n"  // Optional, new in V2
}
```

**Key Changes:**

- `channelId` → `guildId` (more accurate parameter name)
- Optional `reason` parameter for audit logs
- Better error messages for permission issues

### Discord Trigger Node

#### V1 Trigger (IPC-based)

```javascript
{
  "events": ["messageCreate"],
  "channelId": "123456789",
  "restrictToRoles": ["role1", "role2"]
}
```

#### V2 Trigger (Webhook-based)

```javascript
{
  "resource": "message",
  "event": "messageCreate",
  "filterOptions": {
    "channelIds": ["123456789"],
    "roleIds": ["role1", "role2"]
  }
}
```

**Key Changes:**

- Now uses Discord Application webhooks (more reliable)
- Supports multiple channel/role filters
- No persistent bot process required
- Webhook signature verification for security

---

## Step-by-Step Examples

### Example 1: Simple Message Send

#### Before (V1) — Simple Message

```json
{
  "nodes": [
    {
      "name": "Discord Send V1",
      "type": "discord",
      "typeVersion": 1,
      "parameters": {
        "type": "message",
        "channelId": "123456789",
        "content": "Hello from n8n!",
        "embed": false
      }
    }
  ]
}
```

#### After (V2) — Simple Message

```json
{
  "nodes": [
    {
      "name": "Discord Send V2",
      "type": "discord",
      "typeVersion": 2,
      "parameters": {
        "resource": "message",
        "operation": "send",
        "channelId": "123456789",
        "messageContent": "Hello from n8n!"
      }
    }
  ]
}
```

**Migration Steps:**

1. Open workflow in n8n editor
2. Click on "Discord Send V1" node
3. In node panel, change "Version" dropdown from "1" to "2"
4. Update parameter: `content` → `messageContent`
5. Remove `type` parameter (auto-selected in V2)
6. Save and test

---

### Example 2: Button Prompt with Timeout

#### Before (V1) — Button Prompt

```json
{
  "parameters": {
    "type": "prompt",
    "channelId": "123456789",
    "content": "Do you approve this request?",
    "buttons": [
      {
        "label": "✅ Approve",
        "value": "approve",
        "style": 3
      },
      {
        "label": "❌ Reject",
        "value": "reject",
        "style": 4
      }
    ],
    "timeout": 300000,
    "persistent": false,
    "restrictToTriggeringUser": true
  }
}
```

#### After (V2)

```json
{
  "parameters": {
    "resource": "prompt",
    "operation": "button",
    "channelId": "123456789",
    "messageContent": "Do you approve this request?",
    "buttons": [
      {
        "label": "✅ Approve",
        "value": "approve",
        "style": "success"
      },
      {
        "label": "❌ Reject",
        "value": "reject",
        "style": "danger"
      }
    ],
    "options": {
      "timeout": 300,
      "waitForResponse": true,
      "restrictToUser": "={{$json.userId}}"
    }
  }
}
```

**Migration Steps:**

1. Change version to V2
2. Update parameter names:
   - `content` → `messageContent`
   - `timeout` → `options.timeout` (divide by 1000 for seconds)
   - `persistent` → `options.waitForResponse` (invert boolean)
   - `restrictToTriggeringUser` → `options.restrictToUser`
3. Convert button styles:
   - `3` → `"success"`
   - `4` → `"danger"`
   - `1` → `"primary"`
   - `2` → `"secondary"`
4. Test button interactions

---

### Example 3: Complex Member Role Management

#### Before (V1) — Role Management

```json
{
  "parameters": {
    "type": "action",
    "action": "addRole",
    "channelId": "123456789",
    "userId": "={{$json.userId}}",
    "roleId": "111222333"
  }
}
```

#### After (V2) — Role Management

```json
{
  "parameters": {
    "resource": "action",
    "operation": "addRole",
    "guildId": "123456789",
    "userId": "={{$json.userId}}",
    "roleId": "111222333",
    "options": {
      "reason": "Automated role assignment via n8n workflow"
    }
  }
}
```

**Migration Steps:**

1. Change version to V2
2. Update parameters:
   - `type` → `resource`
   - `action` → `operation`
   - `channelId` → `guildId`
3. Add optional audit log reason
4. Test role assignment
5. Verify audit log in Discord shows reason

---

## Common Pitfalls

### 1. Parameter Name Changes

**Issue**: V1 parameters don't work in V2 **Solution**: Use mapping table above, most common changes:

- `content` → `messageContent`
- `channelId` → `guildId` (for member operations)
- `timeout` milliseconds → seconds

### 2. Button Style Enums

**Issue**: V1 numeric styles (1-4) don't work in V2 **Solution**: Convert to string enums:

```javascript
1 → "primary"   // Blue button
2 → "secondary" // Gray button
3 → "success"   // Green button
4 → "danger"    // Red button
```

### 3. Error Message Format

**Issue**: V2 errors have different structure **Solution**: Update error handling:

```javascript
// V1 Error
{ error: "Message failed" }

// V2 Error (more detailed)
{
  success: false,
  error: {
    code: 50001,
    message: "Missing Access",
    httpStatus: 403
  }
}
```

### 4. Timeout Units

**Issue**: V1 uses milliseconds, V2 uses seconds **Solution**: Divide V1 timeouts by 1000:

```javascript
// V1: 60000ms = 60s
timeout: 60000

// V2: 60 seconds
timeout: 60
```

### 5. Response Data Structure

**Issue**: V2 returns Discord.js native objects **Solution**: V2 responses are richer with more fields:

```javascript
// V1 Response
{
  messageId: "123456789",
  channelId: "987654321"
}

// V2 Response (Discord.js Message object)
{
  id: "123456789",
  channelId: "987654321",
  content: "Hello World",
  author: { id: "...", username: "..." },
  timestamp: "2025-10-02T12:00:00Z",
  embeds: [...],
  components: [...]
}
```

---

## Testing Your Migration

### Test Checklist

- [ ] **Credential Test**: Verify bot token works with V2 node
- [ ] **Simple Message**: Send basic text message
- [ ] **Embed Message**: Send message with embed
- [ ] **Button Prompt**: Test button interaction and timeout
- [ ] **Select Menu**: Test select menu with multiple options
- [ ] **Role Operations**: Add/remove roles from users
- [ ] **Member Actions**: Test kick/ban/timeout operations
- [ ] **Error Handling**: Verify errors are caught and handled
- [ ] **Rate Limiting**: Test bulk operations stay within limits
- [ ] **Webhook Operations**: Test webhook creation and sending

### Testing Environment Setup

```bash
# 1. Clone production workflow to test
# 2. Change node versions to V2
# 3. Update parameters using this guide
# 4. Test in Discord test server (not production!)

# Test commands you can run:
# - Send test message
# - Create test interaction
# - Verify audit logs
# - Check rate limit headers
```

### Performance Comparison

Expected improvements with V2:

| Metric            | V1              | V2              | Improvement            |
| ----------------- | --------------- | --------------- | ---------------------- |
| Avg Response Time | 200-500ms       | <100ms          | **2-5x faster**        |
| Rate Limit Errors | Manual handling | Auto queued     | **99% reduction**      |
| Memory Usage      | Persistent bot  | On-demand       | **~200MB saved**       |
| Error Recovery    | Manual retry    | Auto retry (3x) | **95% auto-recovered** |

---

## Rollback Plan

If migration causes issues, you can rollback:

### Immediate Rollback (Production Down)

1. **Revert Node Version**

   ```text
   Open workflow → Select Discord node → Change version to "1"
   ```

2. **Restore Parameters**
   - Use V1 parameter names (check git history)
   - Restore original timeout values (multiply by 1000)
   - Restore button styles to numbers

3. **Restart Bot Process** (if needed)

   ```bash
   # V1 requires bot process to be running
   # Ensure IPC communication is working
   ```

### Gradual Rollback (Issues Detected)

1. **Identify Problem Workflows**
   - Check execution logs for errors
   - Note which operations fail

2. **Rollback One at a Time**
   - Start with most critical workflows
   - Test each rollback
   - Document issues for future migration

3. **Report Issues**
   - Create GitHub issue with details
   - Include error messages and workflow structure
   - Help improve migration guide

---

## 📞 Support

### Need Help?

- **Migration Issues**: [Open GitHub Issue](https://github.com/kmcbride3/n8n-nodes-discord/issues) -- **General
  Questions**: Check [Architecture Documentation](../architecture.md) -- **Architecture Details**: See
  [Architecture Guide](../architecture.md)
- **Testing Problems**: Review [Testing Guide](../development/testing.md)

### Community Resources

- [n8n Community Forum](https://community.n8n.io/)
- [Discord.js Documentation](https://discord.js.org/)
- [Discord API Documentation](https://discord.com/developers/docs)

---

## 📖 Additional Resources

- [V2 Operations Reference](../operations/v2-operations.md)
- [Architecture Comparison](../architecture.md)
- [Performance Guide](../architecture.md#performance-optimization)
- [Common Errors](../troubleshooting/common-errors.md)

---

## Appendix A: Quick Reference

Quick lookup tables for common migration tasks.

### Operation Mapping Table

#### Send Node Operations

| V1 Type   | V1 Operation | V2 Resource | V2 Operation     | Notes                           |
| --------- | ------------ | ----------- | ---------------- | ------------------------------- |
| `message` | -            | `message`   | `send`           | ✅ Direct mapping               |
| `prompt`  | button       | `prompt`    | `button`         | ✅ Enhanced features            |
| `prompt`  | select       | `prompt`    | `select`         | ✅ Enhanced features            |
| `action`  | `addRole`    | `action`    | `addRole`        | ✅ Added audit log reason       |
| `action`  | `removeRole` | `action`    | `removeRole`     | ✅ Added audit log reason       |
| `action`  | `kick`       | `action`    | `kickMember`     | ✅ Better error handling        |
| `action`  | `ban`        | `action`    | `banMember`      | ✅ Enhanced with days parameter |
| `action`  | `timeout`    | `action`    | `timeoutUser`    | ✅ Enhanced with duration       |
| -         | -            | `message`   | `deleteMessage`  | ✅ New in V2                    |
| -         | -            | `message`   | `removeMessages` | ✅ New in V2 (bulk delete)      |
| -         | -            | `webhook`   | `createWebhook`  | 🆕 V2 only                      |
| -         | -            | `webhook`   | `sendWebhook`    | 🆕 V2 only                      |

#### Trigger Node Events

| V1 Event                    | V2 Resource | V2 Event            | Notes               |
| --------------------------- | ----------- | ------------------- | ------------------- |
| `messageCreate`             | `message`   | `messageCreate`     | ✅ Webhook-based    |
| `messageUpdate`             | `message`   | `messageUpdate`     | ✅ Webhook-based    |
| `threadCreate`              | `thread`    | `threadCreate`      | ✅ Webhook-based    |
| `threadUpdate`              | `thread`    | `threadUpdate`      | ✅ Webhook-based    |
| `guildMemberAdd`            | `user`      | `guildMemberAdd`    | ✅ Webhook-based    |
| `guildMemberRemove`         | `user`      | `guildMemberRemove` | ✅ Webhook-based    |
| `presenceUpdate`            | `user`      | `presenceUpdate`    | ✅ Webhook-based    |
| Command (slash)             | `command`   | `slashCommand`      | ✅ Enhanced         |
| Interaction (button/select) | `command`   | `interaction`       | ✅ Better filtering |

---

## 📝 Parameter Name Changes

### Common Changes

| V1 Parameter | V2 Parameter      | Type    | Notes                            |
| ------------ | ----------------- | ------- | -------------------------------- |
| `content`    | `messageContent`  | string  | ✅ More descriptive              |
| `channelId`  | `channelId`       | string  | ✅ No change (message ops)       |
| `channelId`  | `guildId`         | string  | ⚠️ Changed for member ops        |
| `timeout`    | `timeout`         | number  | ⚠️ V1: milliseconds, V2: seconds |
| `persistent` | `waitForResponse` | boolean | ⚠️ Inverted logic                |
| `embed`      | `embedOptions`    | object  | ✅ Moved to options group        |

### Button Prompt Changes

| V1 Parameter      | V2 Parameter      | V1 Value | V2 Value      |
| ----------------- | ----------------- | -------- | ------------- |
| `buttons[].style` | `buttons[].style` | `1`      | `"primary"`   |
| `buttons[].style` | `buttons[].style` | `2`      | `"secondary"` |
| `buttons[].style` | `buttons[].style` | `3`      | `"success"`   |
| `buttons[].style` | `buttons[].style` | `4`      | `"danger"`    |

### Member Operation Changes

| V1 Parameter | V2 Parameter | Notes                    |
| ------------ | ------------ | ------------------------ |
| `channelId`  | `guildId`    | ⚠️ More accurate naming  |
| `userId`     | `userId`     | ✅ No change             |
| `roleId`     | `roleId`     | ✅ No change             |
| -            | `reason`     | 🆕 New: Audit log reason |

---

## 🚀 Quick Migration Examples

### Example 1: Simple Message

```diff
{
- "type": "message",
+ "resource": "message",
+ "operation": "send",
  "channelId": "123456789",
- "content": "Hello World"
+ "messageContent": "Hello World"
}
```

### Example 2: Button Prompt

```diff
{
- "type": "prompt",
+ "resource": "prompt",
+ "operation": "button",
  "channelId": "123456789",
- "content": "Choose:",
+ "messageContent": "Choose:",
  "buttons": [{
    "label": "Yes",
    "value": "yes",
-   "style": 3
+   "style": "success"
  }],
- "timeout": 60000,
+ "timeout": 60,
- "persistent": false
+ "waitForResponse": true
}
```

### Example 3: Add Role

```diff
{
- "type": "action",
- "action": "addRole",
- "channelId": "123456789",
+ "resource": "action",
+ "operation": "addRole",
+ "guildId": "123456789",
  "userId": "987654321",
- "roleId": "111222333"
+ "roleId": "111222333",
+ "reason": "Added via n8n"
}
```

---

## ⚠️ Breaking Changes Summary

### 1. Timeout Units

- **V1**: Milliseconds (`60000` = 60 seconds)
- **V2**: Seconds (`60` = 60 seconds)
- **Migration**: Divide V1 value by 1000

### 2. Button Styles

- **V1**: Numeric (1-4)
- **V2**: String enums (`"primary"`, `"secondary"`, `"success"`, `"danger"`)
- **Migration**: Use mapping table above

### 3. Member Operations

- **V1**: Uses `channelId` parameter
- **V2**: Uses `guildId` parameter (more accurate)
- **Migration**: Rename parameter (same value)

### 4. Response Format

- **V1**: Simple object `{ messageId, channelId }`
- **V2**: Full Discord.js object with all message properties
- **Migration**: Access same fields, more data available

---

**Last Updated**: October 2, 2025  
**Version**: 0.7.6  
**Maintainer**: @kmcbride3
