# Common Errors and Resolution Guide

## Overview

This comprehensive guide covers common errors encountered in the Discord integration for n8n, their causes, and
step-by-step resolution procedures.

## Error Categories

### 1. Authentication and Authorization Errors

### Error: `Rate Limited` (Error Code: 429)

**Symptoms:**

- Operations fail with "Rate limited" error
- Temporary slowdown in API responses
- `Retry-After` header present in response

**Causes:**

- Exceeded Discord API rate limits
- Too many requests in short time period
- Global or per-route rate limiting

**Resolution Steps:**

1. **Wait and Retry**
   - Discord automatically enforces rate limits. Wait for the time specified in the error message or `Retry-After`
     header before retrying.
2. **Reduce Request Volume**
   - Avoid sending too many requests in a short period. Batch operations if possible.
3. **Monitor API Usage**
   - Check your workflow for unnecessary or repeated API calls.

**Prevention:**

- Use Discord.js built-in rate limit handling
- Monitor API usage patterns

---

### Error: `Collector Timeout`

**Symptoms:**

- Interactive components stop responding
- Collector operations fail after timeout
- "Interaction collector timeout" errors

**Causes:**

- Collector timeout reached (default 15 minutes)
- No user interaction within timeout period

**Resolution Steps:**

1. **Increase Timeout**
   - If your workflow requires longer interaction, increase the collector timeout setting in your node configuration.
2. **Prompt User Action**
   - Remind users to interact within the allowed time window.
3. **Check for Proper Cleanup**
   - Ensure collectors are properly disposed after use to avoid issues in future runs.

**Prevention:**

- Set appropriate timeout values
- Monitor collector performance

---

### Error: `Memory Leak - Too Many Collectors`

**Symptoms:**

- Increasing memory usage over time
- Performance degradation
- Too many active collectors

**Causes:**

- Collectors not properly disposed
- Creating collectors without cleanup
- Long-running workflows with many interactions

**Resolution Steps:**

1. **Dispose Collectors Properly**
   - Always ensure collectors are stopped and cleaned up after use.
2. **Limit Number of Collectors**
   - Avoid creating unnecessary collectors in your workflows.
3. **Monitor Memory Usage**
   - Regularly check your system's memory usage and optimize workflows as needed.

**Prevention:**

- Always dispose collectors properly
- Use collector limits and timeouts
- Monitor memory usage in production

---

How to get Channel ID:

1.  Enable Developer Mode in Discord
2.  Right-click on channel name
3.  Select "Copy Channel ID"

````

2. **Check Channel Permissions**
- Verify bot can view the channel
- Check channel-specific permission overrides
- Ensure channel isn't private/restricted

3. **Validate Channel Type**

```text
Channel Types:
- Text Channels: 0
- Voice Channels: 2
- Category: 4
- News Channels: 5
- Thread Channels: 10-12

Note: Some operations only work with specific channel types
````

4. **Update Channel Access**
   - Grant bot view/send permissions for the channel
   - Check role permissions vs channel overrides
   - Test with different channel if needed

**Prevention:**

- Validate channel existence before operations
- Use channel type checks in workflows
- Monitor channel permission changes

---

### Error: `Rate Limited` (Error Code: 429)

**Symptoms:**

- Operations fail with "Rate limited" error
- Temporary slowdown in API responses
- `Retry-After` header present in response

**Causes:**

- Exceeded Discord API rate limits
- Too many requests in short time period
- Global or per-route rate limiting

**Resolution Steps:**

1. **Understanding Discord Rate Limits**

   ```text
   Rate Limit Types:
   - Global: 50 requests per second across all endpoints
   - Per-Route: Varies by endpoint (e.g., 5 requests per 5 seconds for messages)
   - Per-Resource: Specific limits for channels, guilds, etc.
   ```

2. **Implement Retry Logic** (Discord.js handles this automatically)

   ```typescript
   // Discord.js automatically retries with exponential backoff
   // No custom retry logic needed
   ```

3. **Optimize Request Patterns**
   - Batch operations where possible
   - Use appropriate timeouts between requests
   - Avoid unnecessary API calls

4. **Monitor Rate Limit Headers**

   ```text
   Response Headers:
   - X-RateLimit-Limit: Maximum requests allowed
   - X-RateLimit-Remaining: Requests remaining
   - X-RateLimit-Reset: When limit resets
   - Retry-After: Seconds to wait before retry
   ```

**Prevention:**

- Use Discord.js built-in rate limit handling
- Implement request queuing for high-volume workflows
- Monitor API usage patterns

---

## Network and Connection Errors

### Error: `Connection Timeout`

**Symptoms:**

- Operations fail with timeout error
- Long delays before error occurs
- Intermittent connection issues

**Causes:**

- Network connectivity issues
- Discord API server problems
- Firewall or proxy blocking connections

**Resolution Steps:**

1. **Check Network Connectivity**

   ```bash
   # Test Discord API connectivity
   curl -I https://discord.com/api/v10/gateway

   # Expected response: 200 OK
   ```

2. **Verify Firewall Settings**
   - Ensure outbound HTTPS (443) is allowed
   - Check if corporate firewall blocks Discord domains
   - Whitelist Discord API endpoints if needed

3. **Test from Different Network**
   - Try from different internet connection
   - Use mobile hotspot for testing
   - Isolate network vs application issues

4. **Configure Timeout Settings**

   ```typescript
   // Discord.js client configuration
   const client = new Client({
     rest: {
       timeout: 30000, // 30 seconds
       retries: 3,
     },
   })
   ```

**Prevention:**

- Monitor network connectivity
- Implement connection health checks
- Use appropriate timeout values

---

### Error: `SSL/TLS Certificate Error`

**Symptoms:**

- SSL certificate validation failures
- HTTPS connection errors
- Certificate-related error messages

**Causes:**

- Outdated certificate store
- Corporate proxy with custom certificates
- System clock incorrect

**Resolution Steps:**

1. **Update Certificate Store**

   ```bash
   # Update system certificates (Linux)
   sudo apt-get update && sudo apt-get install ca-certificates

   # Update Node.js certificates
   npm update
   ```

2. **Check System Time**
   - Ensure system clock is accurate
   - Sync with NTP servers if needed
   - Certificate validation depends on correct time

3. **Corporate Proxy Configuration**

   ```bash
   # Set proxy environment variables if needed
   export HTTPS_PROXY=https://proxy.company.com:8080
   export NODE_EXTRA_CA_CERTS=/path/to/corporate-certs.pem
   ```

4. **Temporary Workaround** (not recommended for production)

   ```javascript
   // Only for debugging - DO NOT use in production
   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
   ```

**Prevention:**

- Keep system certificates updated
- Monitor certificate expiration
- Use proper proxy configuration

---

## Configuration and Setup Errors

### Error: `Bot Not Found in Server`

**Symptoms:**

- Bot operations fail
- Cannot fetch bot user information
- Guild member operations return unknown member

**Causes:**

- Bot not invited to server
- Bot removed/banned from server
- Insufficient invite permissions

**Resolution Steps:**

1. **Generate Proper Invite Link**

   ```text
   OAuth2 URL Generator:
   https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=PERMISSIONS&scope=bot%20applications.commands

   Required Scopes:
   - bot (required for bot functionality)
   - applications.commands (for slash commands)
   ```

2. **Calculate Permission Integer**

   ```text
   Common Permission Combinations:
   - Basic Bot: 2147483648 (Use Slash Commands)
   - Message Management: 8192 (Manage Messages)
   - Member Management: 4 (Ban Members) + 2 (Kick Members)
   - Full Permissions: 8 (Administrator) - use carefully
   ```

3. **Invite Bot to Server**
   - Use generated invite link
   - Ensure you have "Manage Server" permission
   - Accept bot invitation in Discord

4. **Verify Bot Status**

   ```text
   Check bot in Discord:
   1. Go to server member list
   2. Look for your bot (should have "BOT" tag)
   3. Verify bot is online (green status)
   ```

**Prevention:**

- Save invite links for bot re-invitations
- Monitor bot membership across servers
- Document required permissions clearly

---

### Error: `Invalid Webhook URL`

**Symptoms:**

- Webhook operations fail
- Cannot send messages via webhook
- URL format errors

**Causes:**

- Malformed webhook URL
- Webhook deleted in Discord
- Wrong webhook token

**Resolution Steps:**

1. **Verify Webhook URL Format**

   ```text
   Valid Format:
   https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN

   Parts:
   - WEBHOOK_ID: Unique webhook identifier
   - WEBHOOK_TOKEN: Authentication token for webhook
   ```

2. **Test Webhook Manually**

   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message"}' \
     "YOUR_WEBHOOK_URL"
   ```

3. **Create New Webhook**

   ```text
   In Discord:
   1. Go to channel settings
   2. Navigate to "Integrations" → "Webhooks"
   3. Click "Create Webhook"
   4. Copy webhook URL
   5. Update n8n configuration
   ```

4. **Update n8n Configuration**
   - Replace old webhook URL with new one
   - Test webhook functionality
   - Update any related workflows

**Prevention:**

- Store webhook URLs securely
- Monitor webhook status
- Use descriptive webhook names

---

## Validation and Parameter Errors

### Error: `Invalid Snowflake ID`

**Symptoms:**

- Parameter validation failures
- "Invalid ID format" errors
- Operations fail immediately

**Causes:**

- Incorrect ID format (not 17-19 digits)
- Using display names instead of IDs
- Copy-paste errors

**Resolution Steps:**

1. **Enable Developer Mode**

   ```text
   In Discord:
   1. User Settings (gear icon)
   2. Advanced → Developer Mode (enable)
   3. Now you can right-click to copy IDs
   ```

2. **Get Correct IDs**

   ```text
   ID Types and How to Copy:
   - User ID: Right-click username → Copy User ID
   - Channel ID: Right-click channel → Copy Channel ID
   - Server ID: Right-click server name → Copy Server ID
   - Message ID: Right-click message → Copy Message ID
   - Role ID: Right-click role → Copy Role ID
   ```

3. **Validate ID Format**

   ```javascript
   // Valid Discord snowflake pattern
   const snowflakePattern = /^\d{17,19}$/

   // Example valid IDs:
   // 123456789012345678 (18 digits)
   // 1234567890123456789 (19 digits)
   ```

4. **Common ID Mistakes**

   ```text
   ❌ Wrong: @username, #channel-name, ServerName
   ❌ Wrong: <@123456789012345678> (mentions)
   ❌ Wrong: 12345 (too short)
   ✅ Correct: 123456789012345678
   ```

**Prevention:**

- Always use Developer Mode for ID copying
- Validate IDs before using in workflows
- Create ID validation helper functions

---

### Error: `Message Too Long`

**Symptoms:**

- Message send operations fail
- "Message content too long" error
- Content truncation warnings

**Causes:**

- Message exceeds 2000 character limit
- Embed content exceeds limits
- Combined content too large

**Resolution Steps:**

1. **Check Discord Limits**

   ```text
   Discord Limits:
   - Message content: 2000 characters
   - Embed title: 256 characters
   - Embed description: 4096 characters
   - Embed field name: 256 characters
   - Embed field value: 1024 characters
   - Total embed: 6000 characters
   ```

2. **Implement Content Splitting**

   ```javascript
   function splitMessage(content, maxLength = 2000) {
     if (content.length <= maxLength) return [content]

     const chunks = []
     for (let i = 0; i < content.length; i += maxLength) {
       chunks.push(content.substring(i, i + maxLength))
     }
     return chunks
   }
   ```

3. **Use File Attachments**
   - For very long content, use text file attachments
   - Send as .txt file instead of message content
   - Link to external content if appropriate

4. **Optimize Content**
   - Remove unnecessary whitespace
   - Use abbreviations where appropriate
   - Split into multiple messages if needed

**Prevention:**

- Validate content length before sending
- Implement automatic content splitting
- Use embeds for structured content

---

## Rate Limiting and Performance Errors

### Error: `Collector Timeout`

**Symptoms:**

- Interactive components stop responding
- Collector operations fail after timeout
- "Interaction collector timeout" errors

**Causes:**

- Collector timeout reached (default 15 minutes)
- No user interaction within timeout period
- Collector not properly disposed

**Resolution Steps:**

1. **Adjust Timeout Settings**

   ```typescript
   const collector = channel.createMessageComponentCollector({
     filter: (interaction) => interaction.user.id === userId,
     time: 30 * 60 * 1000, // 30 minutes
     max: 1, // Maximum interactions
   })
   ```

2. **Implement Proper Cleanup**

   ```typescript
   collector.on('end', (collected, reason) => {
     if (reason === 'time') {
       // Handle timeout
       channel.send('Interaction timed out.')
     }
     // Cleanup resources
     collector.stop()
   })
   ```

3. **Extend Collector Lifetime**
   - Use appropriate timeout for user interaction
   - Consider use case (quick response vs long form)
   - Implement collector renewal for long interactions

4. **Handle Edge Cases**

   ```typescript
   collector.on('collect', (interaction) => {
     // Reset timeout on interaction
     collector.resetTimer()

     // Handle interaction
     interaction.reply('Response received!')
   })
   ```

**Prevention:**

- Set appropriate timeout values
- Implement proper collector lifecycle management
- Monitor collector performance

---

### Error: `Memory Leak - Too Many Collectors`

**Symptoms:**

- Increasing memory usage over time
- Performance degradation
- Too many active collectors

**Causes:**

- Collectors not properly disposed
- Creating collectors without cleanup
- Long-running workflows with many interactions

**Resolution Steps:**

1. **Implement Collector Registry**

   ```typescript
   class CollectorManager {
     private static collectors = new Map()

     static register(id: string, collector: any) {
       this.collectors.set(id, collector)

       // Auto-cleanup after timeout
       collector.on('end', () => {
         this.collectors.delete(id)
       })
     }

     static cleanup() {
       this.collectors.forEach((collector) => collector.stop())
       this.collectors.clear()
     }
   }
   ```

2. **Monitor Memory Usage**

   ```typescript
   setInterval(() => {
     const usage = process.memoryUsage()
     console.log('Memory usage:', {
       rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
       heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
     })
   }, 60000) // Every minute
   ```

3. **Implement Automatic Cleanup**

   ```typescript
   // Cleanup on process termination
   process.on('SIGINT', () => {
     CollectorManager.cleanup()
     process.exit(0)
   })

   process.on('SIGTERM', () => {
     CollectorManager.cleanup()
     process.exit(0)
   })
   ```

4. **Use Collector Limits**

   ```typescript
   const collector = channel.createMessageComponentCollector({
     max: 10, // Maximum interactions
     maxUsers: 5, // Maximum unique users
     maxProcessed: 20, // Maximum processed interactions
   })
   ```

**Prevention:**

- Always dispose collectors properly
- Use collector limits and timeouts
- Monitor memory usage in production
- Implement collector lifecycle management

---

## Troubleshooting Workflow

### General Debugging Steps

1. **Enable Debug Logging**

   ```bash
   # Set environment variable for Discord.js debug
   DEBUG=discord.js:* npm start
   ```

2. **Check n8n Error Logs**
   - Review n8n execution logs
   - Look for detailed error messages
   - Check workflow execution history

3. **Test with Minimal Configuration**
   - Create simple test workflow
   - Use basic operations first
   - Gradually add complexity

4. **Verify Prerequisites**
   - Confirm bot is online in Discord
   - Check all required permissions
   - Validate all IDs and tokens

5. **Use Discord API Documentation**
   - Reference official Discord API docs
   - Check for API changes or deprecations
   - Verify parameter requirements

### Getting Help

When reporting issues, include:

- Full error message and stack trace
- n8n workflow configuration (sanitized)
- Discord.js and n8n versions
- Steps to reproduce the issue
- Expected vs actual behavior

### Useful Resources

- **Discord Developer Portal**: <https://discord.com/developers/docs>
- **Discord.js Documentation**: <https://discord.js.org/#/docs>
- **n8n Documentation**: <https://docs.n8n.io>
- **Discord API Status**: <https://discordstatus.com>

This comprehensive error guide should help resolve most common issues encountered when using the Discord integration
with n8n.
