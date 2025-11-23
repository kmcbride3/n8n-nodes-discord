# Frequently Asked Questions (FAQ)

## General Questions

### What's the difference between V1 and V2?

**V2 is the modern, recommended architecture** with:

- **2-5x faster** performance (<100ms vs 200-500ms)
- **Direct Discord.js REST API** instead of IPC communication
- **Automatic rate limiting** and retry handling
- **Better error messages** with Discord API context
- **Webhook support** for slash commands

**V1 is the legacy architecture** (now deprecated) with:

- Persistent bot connection via IPC
- Real-time event handling
- Higher resource usage
- Best for Discord event triggers only

See [V1 to V2 Migration Guide](migration/v1-to-v2.md) for complete details.

### Should I use V1 or V2?

**Use V2 for:**

- ✅ All new workflows
- ✅ Message operations (send, edit, delete)
- ✅ User operations (kick, ban, timeout)
- ✅ Role management
- ✅ Webhook operations
- ✅ Better performance and reliability

**Use V1 only for:**

- ⚠️ Existing workflows (until migrated)
- ⚠️ Backward compatibility needs
- ⚠️ Specific real-time event triggers

### How long does migration from V1 to V2 take?

#### Typical migration time: 5-15 minutes per workflow

- Simple workflows (send message, basic operations): 5 minutes
- Medium complexity (multiple operations, embeds): 10 minutes
- Complex workflows (multiple triggers, custom logic): 15+ minutes

See [Migration Guide](migration/v1-to-v2.md) for step-by-step instructions.

### Do I need different credentials for V2?

**No!** The same Discord Bot credentials work for both V1 and V2 nodes. You can use your existing credentials.

### Can I use V1 and V2 in the same workflow?

**Yes**, but it's not recommended. For best performance and simplicity:

- Use V2 exclusively for new workflows
- Migrate entire workflows from V1 to V2 rather than mixing versions

## Installation & Setup

### How do I install n8n-nodes-discord?

**From n8n UI:**

1. Go to **Settings** → **Community Nodes**
2. Click **Install** and enter: `@kmcbride3/n8n-nodes-discord`
3. Click **Install**
4. Restart n8n

**From Command Line:**

```bash
npm install @kmcbride3/n8n-nodes-discord
```

See [Getting Started](development/getting-started.md) for detailed instructions.

### Discord bot not connecting - what should I check?

**Common issues:**

1. **Invalid Bot Token**
   - Copy token from Discord Developer Portal
   - Don't include "Bot " prefix
   - Token is in **Bot** section, not **OAuth2**

2. **Missing Intents**
   - Enable **Privileged Gateway Intents** in Discord Developer Portal
   - Required: `GUILDS`, `GUILD_MEMBERS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT`

3. **Bot Not Invited**
   - Generate invite URL with `bot` and `applications.commands` scopes
   - Use `administrator` permission for testing
   - Add bot to your Discord server

4. **Wrong n8n Base URL**
   - Set correct base URL in credentials (e.g., `https://n8n.example.com/api/v1`)
   - Must be accessible from Discord servers

See [Common Errors](troubleshooting/common-errors.md) for detailed troubleshooting.

### How do I get my Discord bot token?

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **Bot** section
4. Click **Reset Token** or **Copy** (if visible)
5. Paste into n8n Discord Bot credentials

⚠️ **Never share your bot token publicly!**

### Why are channels/roles not showing in the dropdown?

**Requirements for dropdown loading:**

1. ✅ Valid bot token configured
2. ✅ Bot is running and connected
3. ✅ Bot has joined your Discord server
4. ✅ At least one channel exists

**Solution**: Close and reopen the node modal to refresh the dropdowns.

## Operation Questions

### How do I send an embed message?

**V2 (Recommended):**

```javascript
// In Discord Send V2 node:
Resource: Message
Operation: Send
Channel: Select your channel
Message Content: "Your message"
Embed (Enable): Yes
- Title: "Embed Title"
- Description: "Embed content"
- Color: 0x00AE86 (hex color)
```

See [V2 Operations Guide](operations/v2-operations.md) for more examples.

### How do I add buttons to a message?

**V2 (Recommended):**

```javascript
Resource: Prompt
Operation: Button
Channel: Select your channel
Message: "Click a button:"
Button Label: "Accept"
Button Style: Primary
Timeout: 300 (seconds)
```

The workflow will pause until a button is clicked or timeout is reached.

### How do I handle button clicks?

**Two approaches:**

1. **Synchronous (Prompt Operation)**
   - Use `Prompt > Button` operation
   - Workflow pauses and waits for click
   - Returns user who clicked and value
   - Best for: Forms, confirmations, decisions

2. **Asynchronous (Trigger Node)**
   - Use Discord Trigger node
   - Trigger Type: Interaction
   - Responds to any button click
   - Best for: Persistent buttons, multiple workflows

### How do I manage user roles?

**V2 (Recommended):**

```javascript
Resource: User
Operation: Add Role / Remove Role
User ID: {{ $json.user.id }}
Role ID: "123456789012345678"
Audit Log Reason: "Role updated by workflow"
```

See [User Operations](./operations/v2-operations.md) for details.

### Rate limiting - how is it handled?

**V2 (Automatic):**

- ✅ Discord.js handles all rate limiting automatically
- ✅ Queues requests when near limits
- ✅ Implements exponential backoff
- ✅ No configuration needed

**V1 (Manual):**

- ⚠️ Basic rate limit handling
- ⚠️ May need manual delays in workflows

**Best Practice**: Use V2 for automatic, sophisticated rate limit handling.

## Error Handling

### "Invalid snowflake ID" error

**Cause**: Discord snowflake IDs must be 17-19 digit strings.

**Solutions:**

- Copy ID from Discord (right-click → Copy ID)
- Enable Developer Mode in Discord settings
- Don't use username or channel name
- Use ID, not mention format (`<@123>` → `123`)

See [Input Validation and Sanitization](architecture.md#webhook-security) for details.

### "Missing Access" or "Missing Permissions" error

**Cause**: Bot lacks required permissions.

**Solutions:**

1. Check bot role position (must be above managed roles)
2. Verify channel permissions (View Channel, Send Messages)
3. Grant `Administrator` permission for testing
4. Check server-level permissions in bot role

See [Permission Errors](troubleshooting/common-errors.md) for details.

### "Unknown Message" error

**Cause**: Message doesn't exist or bot can't access it.

**Common reasons:**

- Message was deleted
- Message is in a different channel
- Bot doesn't have access to that channel
- Incorrect message ID

### Webhook not receiving events

**V2 Webhook troubleshooting:**

1. Verify webhook URL is accessible from internet
2. Check signature verification is enabled
3. Test with Discord webhook test button
4. Review webhook logs for errors

See [Webhook Security](architecture.md#webhook-security) for setup details.

## Performance

### Why are my operations slow?

**Possible causes:**

1. **Using V1** - Migrate to V2 for 2-5x faster performance
2. **Network latency** - Check connection to Discord API
3. **Rate limiting** - Spread operations over time
4. **Large payloads** - Reduce embed/message complexity
5. **Client pool exhaustion** - Check connection pool settings

See [Performance Guide](architecture.md#performance-optimization) for optimization strategies.

### How many operations per second can I run?

**Discord API limits:**

- **Global**: 50 requests per second across all endpoints
- **Per-route**: Varies by endpoint (5-50 requests)
- **Per-guild**: Additional guild-specific limits

**V2 automatically handles these limits** - no manual configuration needed.

### Memory usage seems high - is this normal?

**Expected memory usage:**

- **V1**: 100-300 MB (persistent bot connection)
- **V2**: 50-150 MB (on-demand clients)

**High memory indicators:**

- V1: > 500 MB (check for memory leaks)
- V2: > 300 MB (check connection pool size)

See [Performance Guide](architecture.md#performance-optimization) for details.

## Development

### How do I contribute to this project?

1. Fork the repository
2. Create a feature branch
3. Make your changes following [Copilot Instructions](../.github/instructions/copilot-instructions.md)
4. Run tests: `npm test`
5. Submit a pull request

See [Getting Started](development/getting-started.md) for development setup.

### How do I run tests?

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- discord-operations.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

See [Testing Guide](development/testing.md) for comprehensive testing documentation.

### How do I create a new V2 operation?

1. Create operation file: `/v2/actions/{resource}/{operation}.operation.ts`
2. Implement `execute()` function using Discord.js
3. Export operation description
4. Register in main node file
5. Write tests

See [V2 Operations Development](operations/v2-operations.md) for step-by-step guide.

### What coding standards should I follow?

**Key standards:**

- ✅ Use Discord.js built-ins (never recreate Discord functionality)
- ✅ Use n8n error types (`NodeOperationError`, `NodeApiError`)
- ✅ Never use `any` type (use `unknown` when necessary)
- ✅ Follow ESLint and Prettier rules
- ✅ Write comprehensive tests
- ✅ Document with JSDoc comments

See [Copilot Instructions](../.github/instructions/copilot-instructions.md) for complete standards.

## Troubleshooting

### Where can I find help?

**Documentation:**

- [Common Errors Guide](troubleshooting/common-errors.md)
- [Performance Guide](architecture.md#performance-optimization)
- [V2 Operations Reference](operations/v2-operations.md)

**Community:**

- [GitHub Issues](https://github.com/kmcbride3/n8n-nodes-discord/issues)
- [n8n Community Forum](https://community.n8n.io/)
- [Discord.js Discord Server](https://discord.gg/djs)

### How do I report a bug?

1. Check [Common Errors](troubleshooting/common-errors.md) first
2. Search [existing issues](https://github.com/kmcbride3/n8n-nodes-discord/issues)
3. Create new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - n8n version and node version
   - Error logs (sanitize sensitive data!)

### How do I request a feature?

1. Check
   [existing feature requests](https://github.com/kmcbride3/n8n-nodes-discord/issues?q=is%3Aissue+label%3Aenhancement)
2. Create new issue with `[Feature Request]` prefix
3. Describe:
   - Use case and problem to solve
   - Proposed solution
   - Alternative approaches considered
   - Discord API documentation references

## Security

### Is it safe to use these nodes?

**Yes**, with proper security practices:

- ✅ Never commit bot tokens to version control
- ✅ Use n8n's credential system (encrypted storage)
- ✅ Enable webhook signature verification
- ✅ Validate all user inputs
- ✅ Keep packages updated

See [Webhook Security](architecture.md#webhook-security) for comprehensive security guide.

### How are credentials stored?

**n8n credentials:**

- Encrypted using AES-256-CBC encryption
- Stored in n8n database
- Never exposed in logs or error messages
- Masked in workflow export

**Never:**

- Hardcode tokens in workflow expressions
- Log credential values
- Share workflows containing tokens

### Should I enable webhook signature verification?

**Yes, always!** Signature verification:

- ✅ Prevents unauthorized requests
- ✅ Validates requests are from Discord
- ✅ Protects against replay attacks
- ✅ Required for production webhooks

See [Webhook Security](architecture.md#webhook-security) for implementation.

## Migration

### I'm still using V1 - when do I need to migrate?

**V1 is deprecated but fully supported** for backward compatibility.

**Timeline:**

- **Now**: V1 works, but V2 is recommended for new workflows
- **Next 6 months**: V1 continues to work with security updates
- **12+ months**: V1 may be removed in future major version

**Recommendation**: Migrate at your convenience, but prioritize new workflows using V2.

### Can I roll back if V2 doesn't work?

**Yes!** V1 nodes remain available:

1. Keep V1 workflow as backup before migration
2. Test V2 thoroughly before removing V1 workflow
3. Both versions can coexist during transition

See [Rollback Plan](migration/v1-to-v2.md#rollback-plan) for detailed instructions.

### What if my V1 operation doesn't exist in V2?

**Contact us:**

- [Open GitHub Issue](https://github.com/kmcbride3/n8n-nodes-discord/issues) describing needed operation
- Check if Discord.js v14 supports the functionality
- Provide use case and priority

Most V1 operations have V2 equivalents with better performance. See
[Operation Mapping](migration/v1-to-v2.md#operation-mapping) for complete list.

---

## Still Have Questions?

- 📖 **Documentation**: See [`/docs/` folder](README.md) for comprehensive guides
- 💬 **Community**: Join [n8n Community Forum](https://community.n8n.io/)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/kmcbride3/n8n-nodes-discord/issues)
- 🎯 **Feature Requests**: [GitHub Discussions](https://github.com/kmcbride3/n8n-nodes-discord/discussions)
