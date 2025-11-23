# Migration Examples: From Collectors to Discord Trigger

This guide provides practical examples for migrating from the old collector-based pattern to the new Discord Trigger
pattern.

## Example 1: Simple Button Click

### Before (v0.7.5 and earlier)

**Single Workflow:**

```json
{
  "nodes": [
    {
      "name": "Send Button",
      "type": "n8n-nodes-discord.discord",
      "version": 2,
      "parameters": {
        "resource": "message",
        "operation": "send",
        "channelId": "123456789",
        "content": "Do you agree?",
        "components": true,
        "componentType": "button",
        "buttonLabel": "Yes, I agree",
        "buttonCustomId": "agree_button"
      }
    }
  ]
}
```

The old code would create a collector automatically and wait for the button click.

### After (v0.7.6+)

**Workflow 1 - Send Message:**

```json
{
  "name": "Send Agreement Button",
  "nodes": [
    {
      "name": "Send Button",
      "type": "n8n-nodes-discord.discord",
      "version": 2,
      "parameters": {
        "resource": "message",
        "operation": "send",
        "channelId": "123456789",
        "content": "Do you agree?",
        "components": true,
        "componentType": "button",
        "buttonLabel": "Yes, I agree",
        "buttonCustomId": "agree_button"
      },
      "outputs": {
        "main": [
          {
            "messageId": "{{ $json.messageId }}"
          }
        ]
      }
    }
  ]
}
```

**Workflow 2 - Handle Click:**

```json
{
  "name": "Handle Agreement Click",
  "nodes": [
    {
      "name": "Discord Trigger",
      "type": "n8n-nodes-discord.discordTrigger",
      "version": 2,
      "parameters": {
        "type": "interaction",
        "interactionType": "button"
      }
    },
    {
      "name": "Check Button ID",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.interaction.customId }}",
              "operation": "equals",
              "value2": "agree_button"
            }
          ]
        }
      }
    },
    {
      "name": "Send Confirmation",
      "type": "n8n-nodes-discord.discord",
      "version": 2,
      "parameters": {
        "resource": "message",
        "operation": "send",
        "channelId": "={{ $json.interaction.channelId }}",
        "content": "Thanks for agreeing! ✅"
      }
    }
  ]
}
```

---

## Example 2: Multiple Choice Buttons

### Before (v0.7.5 and earlier)

Complex collector logic to handle multiple button options.

### After (v0.7.6+)

**Workflow 1 - Send Options:**

```javascript
// In a Code node before Discord Send
const buttons = [
  { label: 'Option A', customId: 'opt_a', style: 1 },
  { label: 'Option B', customId: 'opt_b', style: 2 },
  { label: 'Option C', customId: 'opt_c', style: 3 },
]

return [
  {
    json: {
      channelId: '123456789',
      content: 'Choose your option:',
      buttons: buttons,
    },
  },
]
```

```json
{
  "name": "Send Options",
  "type": "n8n-nodes-discord.discord",
  "version": 2,
  "parameters": {
    "resource": "message",
    "operation": "send",
    "channelId": "={{ $json.channelId }}",
    "content": "={{ $json.content }}",
    "components": true,
    "componentType": "button"
  }
}
```

**Workflow 2 - Handle Choice:**

```json
{
  "nodes": [
    {
      "name": "Discord Trigger",
      "type": "n8n-nodes-discord.discordTrigger"
    },
    {
      "name": "Switch on Button",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "value": "={{ $json.interaction.customId }}",
        "rules": {
          "rules": [
            {
              "value": "opt_a",
              "output": 0
            },
            {
              "value": "opt_b",
              "output": 1
            },
            {
              "value": "opt_c",
              "output": 2
            }
          ]
        }
      }
    },
    {
      "name": "Handle Option A",
      "type": "n8n-nodes-base.code"
    },
    {
      "name": "Handle Option B",
      "type": "n8n-nodes-base.code"
    },
    {
      "name": "Handle Option C",
      "type": "n8n-nodes-base.code"
    }
  ]
}
```

---

## Example 3: Using Prompt Resource (Alternative)

If you want managed collector behavior similar to the old pattern:

**Single Workflow with Prompt Resource:**

```json
{
  "nodes": [
    {
      "name": "Send Button Prompt",
      "type": "n8n-nodes-discord.discord",
      "version": 2,
      "parameters": {
        "resource": "prompt",
        "operation": "button",
        "channelId": "123456789",
        "content": "Quick question: Continue?",
        "buttons": {
          "button": [
            {
              "label": "Yes",
              "value": "continue_yes",
              "style": 1
            },
            {
              "label": "No",
              "value": "continue_no",
              "style": 4
            }
          ]
        },
        "timeout": 120
      }
    }
  ]
}
```

The prompt resource uses `discordStateManager` which handles collectors automatically.

---

## Example 4: Form-like Interaction

### Scenario: Multi-step form

**Before:** Complex collector chaining

**After:** Workflow chain with state

**Step 1 - Ask Name:**

```json
{
  "name": "Ask Name",
  "type": "n8n-nodes-discord.discord",
  "parameters": {
    "resource": "message",
    "operation": "send",
    "content": "What's your name?",
    "components": true
  }
}
```

**Step 2 - Handle Name (Trigger):**

```json
{
  "nodes": [
    {
      "name": "Receive Name",
      "type": "n8n-nodes-discord.discordTrigger"
    },
    {
      "name": "Store Name",
      "type": "n8n-nodes-base.set"
    },
    {
      "name": "Ask Email",
      "type": "n8n-nodes-discord.discord"
    }
  ]
}
```

**Step 3 - Handle Email (Trigger):**

```json
{
  "nodes": [
    {
      "name": "Receive Email",
      "type": "n8n-nodes-discord.discordTrigger"
    },
    {
      "name": "Merge Data",
      "type": "n8n-nodes-base.merge"
    },
    {
      "name": "Complete Form",
      "type": "n8n-nodes-base.code"
    }
  ]
}
```

---

## Example 5: Confirmation Dialog

### Before

```typescript
// Old pattern - don't use
await sendMessage({
  content: 'Delete this item?',
  buttons: [
    { label: 'Confirm', customId: 'confirm' },
    { label: 'Cancel', customId: 'cancel' },
  ],
})
// Wait for response...
```

### After

**Send Confirmation:**

```json
{
  "name": "Send Confirmation",
  "type": "n8n-nodes-discord.discord",
  "version": 2,
  "parameters": {
    "resource": "message",
    "operation": "send",
    "channelId": "={{ $json.channelId }}",
    "content": "⚠️ Delete this item?\n\nItem: {{ $json.itemName }}",
    "components": true,
    "componentType": "button"
  }
}
```

**Handle Response:**

```json
{
  "nodes": [
    {
      "name": "Wait for Response",
      "type": "n8n-nodes-discord.discordTrigger",
      "parameters": {
        "type": "interaction"
      }
    },
    {
      "name": "Check Action",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.interaction.customId }}",
              "operation": "equals",
              "value2": "confirm"
            }
          ]
        }
      }
    },
    {
      "name": "Delete Item",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "DELETE",
        "url": "={{ $json.itemUrl }}"
      }
    },
    {
      "name": "Send Result",
      "type": "n8n-nodes-discord.discord",
      "parameters": {
        "content": "✅ Item deleted successfully"
      }
    }
  ]
}
```

---

## Example 6: Role-Based Access Control

**Send Admin Command:**

```json
{
  "name": "Send Admin Button",
  "type": "n8n-nodes-discord.discord",
  "parameters": {
    "resource": "message",
    "operation": "send",
    "content": "🔐 Admin Action",
    "components": true
  }
}
```

**Handle with Permission Check:**

```json
{
  "nodes": [
    {
      "name": "Discord Trigger",
      "type": "n8n-nodes-discord.discordTrigger"
    },
    {
      "name": "Check Admin Role",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const member = $json.interaction.member;\nconst hasAdminRole = member.roles.includes('ADMIN_ROLE_ID');\nreturn { hasPermission: hasAdminRole };"
      }
    },
    {
      "name": "If Admin",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.hasPermission }}",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "name": "Execute Admin Action",
      "type": "n8n-nodes-base.code"
    },
    {
      "name": "Send Permission Denied",
      "type": "n8n-nodes-discord.discord",
      "parameters": {
        "content": "❌ You don't have permission"
      }
    }
  ]
}
```

---

## Common Patterns

### Pattern: Store Message ID for Later Reference

```javascript
// After sending message
const messageId = $json.messageId

// Store in database or n8n variable
await setVariable('lastMessageId', messageId)

// Use in trigger workflow
const originalMessageId = await getVariable('lastMessageId')
if ($json.interaction.message.id === originalMessageId) {
  // This is a response to our message
}
```

### Pattern: Timeout Handling

```json
{
  "nodes": [
    {
      "name": "Send with Timeout Note",
      "type": "n8n-nodes-discord.discord",
      "parameters": {
        "content": "Choose an option (expires in 5 minutes):"
      }
    },
    {
      "name": "Wait 5 Minutes",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "time": 300
      }
    },
    {
      "name": "Edit Message",
      "type": "n8n-nodes-discord.discord",
      "parameters": {
        "operation": "edit",
        "content": "⏰ This prompt has expired"
      }
    }
  ]
}
```

### Pattern: Sequential Questions

```javascript
// Track conversation state in database
const conversationState = {
  userId: $json.userId,
  step: 'awaiting_name',
  data: {},
}

// Each trigger checks state and progresses
if (state.step === 'awaiting_name') {
  state.data.name = $json.interaction.data
  state.step = 'awaiting_email'
  // Ask next question
}
```

---

## Testing Your Migration

1. **Test Send Operation:**

   ```bash
   # Verify message sends successfully
   # Verify message ID is returned
   # Verify components appear in Discord
   ```

2. **Test Trigger Reception:**

   ```bash
   # Click button in Discord
   # Verify trigger fires
   # Verify interaction data is complete
   ```

3. **Test End-to-End:**

   ```bash
   # Send message from Workflow 1
   # Click button in Discord
   # Verify Workflow 2 executes
   # Verify response is sent
   ```

---

## Troubleshooting

### Issue: Trigger not firing

**Check:**

- Discord Trigger is active
- Webhook URL is registered with Discord
- Correct interaction type configured
- Discord signature validation passing

### Issue: Can't access button data

**Solution:**

```javascript
// Access interaction data
const buttonId = $json.interaction.customId
const userId = $json.interaction.user.id
const channelId = $json.interaction.channel_id
```

### Issue: Want old behavior back

**Solution:** Use the prompt resource instead:

```json
{
  "resource": "prompt",
  "operation": "button"
}
```

---

## Additional Resources

- [Main Architecture Documentation](./architecture.md)
- [Visual Architecture Guide](./v2-architecture-visual-guide.md)

---

**Last Updated**: October 2, 2025  
**Applies to**: v0.7.6+
