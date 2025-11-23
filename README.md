# n8n-nodes-discord

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

**Version: 0.8.0-beta.1** 🚀 Beta Release

[n8n](https://www.n8n.io) nodes to trigger workflows from Discord or send interactive messages. Supports the Discord
Components API for interactive dialogs (buttons, select menus, and more).

## ✨ What's New in v0.8.0-beta.1

> **⚠️ Beta Release:** Major architectural milestone with n8n V2 node standard support. Fully backward compatible with
> existing V1 workflows. Not yet production-tested—feedback welcome!

### Key Highlights

- ✅ **n8n V2 Node Standard** - Modern node implementation alongside V1 nodes
- ✅ **Official Credentials** - Uses n8n's built-in `DiscordBotApi` credential
- ✅ **394 Tests Passing** - Comprehensive test coverage ensures reliability
- ✅ **Performance Optimized** - Connection pooling, request caching, memory management
- ✅ **Type Safe** - Full TypeScript integration with Discord.js v14
- ✅ **Well Documented** - Extensive guides, examples, and API references

See [CHANGELOG.md](CHANGELOG.md) for complete details.

## � V2 vs V1 Nodes

This package now includes **both V2 (modern) and V1 (legacy)** node implementations:

| Feature            | V1 (Legacy)                 | V2 (Modern)                      |
| ------------------ | --------------------------- | -------------------------------- |
| **n8n Standard**   | n8n V1 node API             | n8n V2 node API ✅               |
| **Credentials**    | Custom credential           | Official `DiscordBotApi` ✅      |
| **Architecture**   | IPC-based bot communication | Direct Discord.js REST API ✅    |
| **Performance**    | ~200-500ms overhead         | <100ms response time ✅          |
| **Error Handling** | Generic errors              | n8n NodeOperationError types ✅  |
| **Type Safety**    | Limited TypeScript          | Full Discord.js v14 types ✅     |
| **Rate Limiting**  | Manual handling             | Automatic Discord.js handling ✅ |
| **Status**         | Deprecated (but supported)  | **Recommended** ✅               |

### 🚀 Why Use V2 Nodes?

- ✅ **Modern n8n Integration** - Uses official n8n V2 node standards
- ✅ **Official Credentials** - Uses n8n's built-in `DiscordBotApi` credential
- ✅ **2-5x Faster** - Direct Discord API calls, no IPC overhead
- ✅ **Better Errors** - Specific Discord API errors with actionable context
- ✅ **Automatic Retries** - Discord.js handles retries (3 attempts, 15s timeout)
- ✅ **Connection Pooling** - Efficient client reuse across operations
- ✅ **Type Safe** - Full TypeScript integration with Discord.js v14
- ✅ **Webhook Support** - Native Discord webhook operations
- ✅ **Well Tested** - 394 comprehensive tests

### 📖 Migration & Documentation

**New Users**: Use V2 nodes for all new workflows. See [Getting Started Guide](docs/development/getting-started.md).

**Existing V1 Users**: V1 nodes remain fully functional. When ready to migrate, follow the
**[V1 to V2 Migration Guide](docs/migration/v1-to-v2.md)** for step-by-step instructions.

**Key Differences:**

- V2 uses official `DiscordBotApi` credential (V1 uses custom credential)
- V2 has resource-based operations (Message, Prompt, Action, Webhook, Utility)
- Same Discord bot token works for both - no bot reconfiguration needed
- Migration typically takes 5-15 minutes per workflow

---

## 📚 Documentation

Comprehensive documentation is available in the **`/docs/`** directory:

### 🚀 Quick Start

- **[FAQ](docs/FAQ.md)** - Frequently asked questions and troubleshooting
- **[Getting Started](docs/development/getting-started.md)** - Setup and first workflow
- **[V1 to V2 Migration](docs/migration/v1-to-v2.md)** - Step-by-step migration guide
- **[API Reference](docs/architecture.md#api-reference)** - Complete operation documentation

### 📖 User Guides

- **[V2 Operations Guide](docs/operations/v2-operations.md)** - All V2 operations with examples
- **[Webhook Security](docs/architecture.md#webhook-security)** - Secure webhook configuration
- **[Common Errors](docs/troubleshooting/common-errors.md)** - Solutions to frequent issues
- **[Performance Guide](docs/architecture.md#performance-optimization)** - Optimization tips

### �️ Developer Documentation

- **[Architecture Guide](docs/architecture.md)** - Complete architecture guide including system design, design
  principles, and best practices
- **[V2 Architecture Visual Guide](docs/development/v2-architecture-visual-guide.md)** - Flow diagrams and comparisons
- **[Testing Guide](docs/development/testing.md)** - Test structure and coverage
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute

## 🏆 Quality & Testing

This project maintains high quality standards with comprehensive testing:

- ✅ **394 Tests Passing** - 100% success rate across 18 test suites
- ✅ **n8n V2 Compliant** - Meets all n8n V2 node standards
- ✅ **Security Tested** - Input sanitization, XSS prevention, credential validation
- ✅ **Performance Optimized** - Connection pooling, request caching, memory management
- ✅ **Type Safe** - Full TypeScript with Discord.js v14 types
- ✅ **Well Documented** - Comprehensive guides, examples, and API references

### Test Coverage

- **Unit Tests**: Operation logic, validation, security, type safety
- **Integration Tests**: V2 operations, collector lifecycle, network recovery
- **Compliance Tests**: Automated n8n V2 standard validation
- **Workflow Tests**: Real workflow JSON structure validation

See [Testing Guide](docs/development/testing.md) for details.

## How to install

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `@kmcbride3/n8n-nodes-discord` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes: select **I
   understand the risks of installing unverified code from a public source**.
5. Select **Install**.

After installing the node, you can use it like any other node. n8n displays the node in search results in the **Nodes**
panel.

### Manual installation

To get started install the package in your n8n root directory:

`npm install @kmcbride3/n8n-nodes-discord`

For Docker-based deployments, add the following line before the font installation command in your
[n8n Dockerfile](https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/Dockerfile):

`RUN cd /usr/local/lib/node_modules/n8n && npm install @kmcbride3/n8n-nodes-discord`

## 🤖 Bot Setup

### Discord Bot Configuration

To send messages, listen to events, or interact with Discord, you need to create a bot in the
[Discord Developer Portal](https://discord.com/developers/applications).

#### Step 1: Create Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give your application a name and click **Create**

#### Step 2: Configure Credentials

**For V2 Nodes (Recommended):**

V2 nodes use n8n's official **Discord Bot API** credential:

1. In Discord Developer Portal, go to **Bot** section
2. Click **Reset Token** and copy the bot token
3. In n8n, go to **Credentials > New**
4. Search for **"Discord Bot API"** and select it
5. Paste your bot token and save

**For V1 Nodes (Legacy):**

V1 nodes use a custom **Discord App** credential that requires additional configuration. See the full bot setup section
below for V1 credential details.

#### Step 3: Configure Bot Permissions

1. In Discord Developer Portal, go to **Bot** section
2. Click **Add Bot** if not already created
3. In **Authorization Flow**, disable **Public Bot**
4. Under **Privileged Gateway Intents**, enable:
   - ✅ **Presence Intent** (for user status tracking)
   - ✅ **Server Members Intent** (for member events)
   - ✅ **Message Content Intent** (for reading message content)
5. Click **Save Changes**

![Bot settings showing Privileged Gateway Intents](images/bot-1.png)

#### Step 4: Generate Bot Invite URL

1. Go to **OAuth2 > URL Generator**
2. Select scopes:
   - ✅ **bot**
   - ✅ **applications.commands**
3. Select bot permissions:
   - ✅ **Administrator** (recommended for full functionality)
4. Copy the generated URL at the bottom

![OAuth URL generator with selected scopes](images/url-gen.png)

#### Step 5: Add Bot to Your Server

1. Open the generated URL in your browser
2. Select the Discord server where you want to add the bot
3. You must have **Manage Server** or **Administrator** permissions
4. Click **Authorize**

#### Step 6: Get Bot Token

1. In Discord Developer Portal, go back to **Bot** section
2. Click **Reset Token** (or **Copy** if visible)
3. Copy the bot token - you'll need this for n8n credentials

![Bot token in Discord Developer Portal](images/bot-2.png)

### V2 Node Setup (Recommended)

**For V2 nodes**, you're done! Just use the bot token in n8n's **Discord Bot API** credential:

1. In n8n: **Credentials > New > Discord Bot API**
2. Paste the bot token
3. Save

Your V2 Discord nodes are now ready to use!

### V1 Node Setup (Legacy)

**For V1 nodes only**, additional setup is required:

<details>
<summary>Click to expand V1 credential setup</summary>

V1 nodes require the custom **Discord App** credential with n8n API integration:

1. In Discord Developer Portal, go to **OAuth2** and copy the **Client ID**
2. In n8n, create **Discord App** credentials (**Credentials > New > Discord App**)
3. Paste the Client ID
4. Paste the bot token from Step 6
5. Go to **Settings > n8n API** and create/copy an API key
6. Paste the n8n API key into Discord App credentials
7. Set your n8n base URL (e.g., `https://n8n.example.com/api/v1`)
8. Save credentials

![V1 Discord App credential configuration](images/credentials-2.png)

</details>

Now you can use Discord nodes in your workflows!

## 📋 Node Reference

### V2 Nodes (Recommended)

**V2 Discord Send Node** - Resource-based operations:

- **Message**: send, deleteMessage, removeMessages
- **Prompt**: button (interactive buttons), select (dropdown menus)
- **Action**: addRole, removeRole, kickMember, banMember, timeoutMember
- **Webhook**: create, send
- **Utility**: Helper operations and interaction management

**V2 Discord Trigger Node** - Event-based workflow triggers:

- Message events: new message, message update
- Thread events: thread create, thread update
- Command events: slash commands, interactions
- User events: joins, leaves, updates, presence, nickname, roles

See **[V2 Operations Guide](docs/operations/v2-operations.md)** for detailed documentation with examples.

### V1 Nodes (Legacy)

<details>
<summary>Click to expand V1 node reference</summary>

## Discord Trigger Node Reference (V1)

- **Credential for Discord App**: Select your Discord App credentials (V1 custom credential). If you have multiple
  Discord nodes, use the same credentials. Not designed for multiple Discord servers.
- **Listen to**: Let you select the text channels you want to listen to for triggering the workflow. If none are
  selected, all channels will be listened to. Your credentials must be set and the bot running, you also need at least
  one text channel available. If you do not meet these requirements, make the changes then close and reopen the modal
  (the channels list is loaded when the modal opens). For "User" trigger types, if you want to use a placeholder, select
  the channel where you want it displayed.
- **From roles**: The same logic apply here for roles, except it is optional. If you don't select any role it will
  listen to **@everyone**.
- **Trigger type**: Type of event to listen to. User events must specify a channel to listen to if you want to use a
  placeholder or the option "send to the trigger channel" in a Discord Send node.
  - **New Message**: Listen to messages sent in the selected channels.
  - **Message update**: Listen to messages updated in the selected channels.
  - **New Thread**: Listen to threads created in the selected channels.
  - **Thread update**: Listen to threads updated in the selected channels.
  - **Command**: Listen to commands sent in the selected channels.
  - **Interaction**: Listen to persisted button/select.
  - **User joins**: Listen to users joining the server.
  - **User leaves**: Listen to users leaving the server.
  - **User presence update**: Listen to users presence change.
  - **User nickname updated**: Listen to users nickname change.
  - **User role added**: Listen to users role added.
  - **User role removed**: Listen to users role removed.
- **Presence**: If trigger type presence update. Type of presence to listen to.
  - **Any change**: When a user presence is updated.
  - **Online**: When a user presence is set to online.
  - **Offline**: When a user presence is set to offline.
  - **Do not disturb**: When a user presence is set to do not disturb.
  - **Idle**: When a user presence is set to idle.
- **From roles**: When listening to user role update, select which removed or added role needs to be matched.
- **Message ID**: If trigger type interaction. The message ID of the button/select to listen to.
- **Pattern**: Message/thread only. Select how the value below will be recognized. ⚠ Keep in mind that the value will
  be tested with all mentions removed and any trim applied (whitespaces removed at the beginning and the end). For
  example `@bot hello` will be tested on `hello`.
  - **Equals**: Match the exact value.
  - **Starts with**: Match the message beginning with the specified value.
  - **Contains**: Match the value in any position in the message.
  - **Ends with**: Match the message ending with the specified value.
  - **Regex**: Match the custom ECMAScript regex provided.
- **Value**: Message/thread only. The value you will test on all messages listened to.
- **Case Sensitive**: Message/thread only. Determine if it will be sensible to the case when matching the value.
- **Bot mention**: Message/thread only. If true, a message will also need to mention the bot to trigger the workflow
  (this does not exclude the other criteria).
- **Name**: Command only. The name of the command to listen to.
- **Description**: Command only. The description of the command to listen to.
- **Input field type**: Command only. The type of the input field.
- **Input field description**: Command only. The description of the input field.
- **Input field required**: Command only. If the input field is required.
- **Placeholder**: The placeholder is a message that will appear in the channel that triggers the workflow. Three
  animated dots added to the placeholder indicate that the workflow is running. From a Discord Send node, you can set up
  a response message which will then take the place of this placeholder.

/!\ Don't forget to activate your trigger, even if you just want to test it.

### Returned data

- **content**: The triggering message content (if type message).
- **thread**: The triggering thread (if type thread).
- **channelId**: The triggering channel ID.
- **userId**: The triggering user ID.
- **userName**: The triggering username.
- **userTag**: The triggering user tag.
- **interactionValues**: The triggering interaction values (if type interaction).
- **messageId**: The triggering message ID (if type message).
- **presence**: The triggering presence status (if type presence update).
- **nick**: The triggering nick update (if type nick updated).
- **addedRoles**: The triggering added role (if type role added).
- **removedRoles**: The triggering removed role (if type role removed).
- **userRoles**: List of role ids of the triggering user (if trigger type interaction).
- **attachments**: The triggering attachments array (if type message && attachments sent).

## Discord Send Node Reference

- **Credential for Discord App**: If you follow the bot setup guide above, you will be able to select your Discord App
  credentials to start the bot. If you are already another Discord Trigger (or Send) node, be careful to select the same
  credentials. It's not meant at the moment to be used with multiple Discord servers.
- **Replace the trigger placeholder**: If active, the message produced by this node will replace the previous
  placeholder set. It can be a placeholder set by the Discord Trigger node or by another Discord Send node.
- **Send to the trigger channel**: If active, the message produced will be sent to the same channel where the workflow
  was triggered (but not replace the placeholder if there is one).
- **Send to**: Let you specify the text channels where you want to send the message. Your credentials must be set and
  the bot running, you also need at least one text channel available. If you do not meet these requirements, make the
  changes then close and reopen the modal (the channels list is loaded when the modal opens).
- **Type**: Let you choose the type of interaction you want to perform.
  - **Message**: This is the default type, it allows you to send a message without requiring any form of response.
    - **Content**: Displayed text message.
    - **Embed**: If active it will enable the creation of rich messages like this: ![embed example](images/embed.png)
      - **Color** (1)
      - **Title** (2)
      - **URL** (3)
      - **Author name** (4)
      - **Author icon URL or base64** (5)
      - **Author URL** (6)
      - **Description** (7)
      - **Thumbnail URL or base64** (8)
      - **Fields** (9)
        - **Field**: If you add an empty field (no title/value) it will create a space in the embed.
          - **Title** (10)
          - **Value** (11)
          - **Inline** (12)
      - **Image URL or base64** (13)
      - **Footer text** (14)
      - **Footer icon URL or base64** (15)
      - **Displayed date** (16)
    - **Files**: Allows to attach up to 5 images to the message.
      - **URL or base64**: URL/base64 of the image to attach (png, jpg).
  - **Button Prompt**: It allows you to send an interactive dialog along with buttons users can click on. The workflow
    execution will wait untill someone answer.
    - **Content**: Displayed text message.
    - **Buttons**: Discord allows you to add up to 5 buttons.
      - **Button**
        - **Label**: Displayed label on the button.
        - **Value**: Value returned by the node if clicked.
        - **Style**: You can choose between 4 different styles (primary, secondary, success, danger).
    - **Timeout**: Time (seconds) your workflow will wait until it passes to the next node (or stops the execution). The
      time left will be displayed and updated at the end of the text message. If the timeout is equal 0, it will wait
      indefinitely.
    - **Restrict to triggering user**: Only the user triggering the workflow will be able to interact (others will be
      ignored).
    - **Restrict to mentioned roles**: Only the user having one of the mentioned roles will be able to interact (others
      will be ignored).
  - **Select Prompt**: Same as button prompt, but it will display a dropdown list instead of buttons.
    - **Content**: Displayed text message.
    - **Select**
      - **Option**
        - **Label**: Displayed label on the option.
        - **Description**: Optional displayed description.
        - **Value**: Value returned by the node if selected.
    - Other parameters are the same as for the button prompt.
  - **Action**: Instead of sending a message, it will perform an action defined in the next field.
    - **Action**: Let you choose the type of action you want to perform. More types will be added in the future.
      - **Remove messages**: Remove the last `number` of messages from the "Send to" channel.
        - **How many?**: Number of last messages to remove (Discord API allows max 150 and messages < 4 weeks old).
      - **Add role to user**: Add a role to a user.
        - **User ID**: User to add the role to.
        - **Which roles**: Roles to add to the user.
      - **Remove role from user**: Remove a role from a user.
        - **User ID**: User to remove the role from.
        - **Which roles**: Roles to remove from the user.
      - For actions that support it, you can optionally provide a reason why the action was taken via the
        `X-Audit-Log-Reason` header.

- **Persistent**: Available for type prompt. If active the button/select will stay visible even when the workflow is
  done.
  - **Min select**: Available for type select prompt. Minimum number of options that can be selected.
  - **Max select**: Available for type select prompt. Maximum number of options that can be selected.
  - **Message ID**: If you want to edit a previous prompt message intsead of create a new one, you can specify the
    message ID.
- **Mention roles**: Let you specify roles you want to mention in the message. Your credentials must be set and the bot
  running, you also need at least one role (apart from @everyone) available. If you do not meet these requirements, make
  the changes then close and reopen the modal.
- **Placeholder**: Not available for simple messages. The placeholder is a message that will appear in the channel where
  the button or select prompt is displayed. Three animated dots added to the placeholder indicate that the workflow is
  running. From another Discord Send node, you can set up a response message which will then take the place of this
  placeholder.
- **Bot customization**: Active this option to customize the bot activity and status.
  - **Bot activity**: When you set a bot activity, it will be displayed in the "Now Playing" section of the bot profile.
    You need to refresh the activity periodically if you want to keep it.
  - **Bot activity type**: Let you customize the type of activity displayed on the bot profile.
  - **Bot status**: Let you customize the status of the bot (if a bot activity is also set).

### Returned data (Discord Send)

- **value**: If type button/select prompt, return the value of the user selection.
- **channelId**: The channel ID where the message is sent.
- **userId**: If type button/select prompt, return the ID of the interacting user.
- **userName**: If type button/select prompt, return the username of the interacting user.
- **userTag**: If type button/select prompt, return the tag of the interacting user.
- **messageId**: The ID of the sent message.
- **action**: If type action, return the action performed (at the moment the only available type is removeMessages).

## Commands

To help you create and debug your workflow with Discord Trigger/Send nodes, some commands have been registered to the
bot.

- `/logs`: Display the last logs stored in memory (max 100).
  - **With parameters**
    - `/logs 10`: If you specify a number, it will display the last `number` of logs.
    - `/logs clear`: Remove all logs in memory.
    - `/logs on`: Logs are automatically sent in the current channel.
    - `/logs off`: Disable logs being automatically sent in the channel.
- `/clear`: Remove the last `number` (max 100) messages in the current channel.
  - **With parameters**
    - `/clear 10`: If you specify a number, it will remove the last `number` of messages.
- `/test`: Toggle the test mode. Test mode switch the Discord bot on the trigger test url. Useful if you want to see how
  a workflow is executed and data is passed. Once the test mode is activated, go to the Discord Trigger UI and click on
  **Fetch Test Event** then on Discord send a message to trigger the workflow.
  - **With parameters**
    - `/test true`: Activate the test mode.
    - `/test false`: Disable the test mode.

## Troubleshooting

- There is a [known issue](https://github.com/edbrdi/n8n-nodes-discord/issues/10) with the updating process or some new
  install resulting in the Discord icon missing (nodes not recognized). To fix this issue, you just need to restart n8n.
- If you can't update the nodes through the UI, try to uninstall and reinstall them.
- Before raising an issue, make sure you have configured the bot properly (especially the permissions) and your triggers
  are activated. You can't test a non-activated trigger.

## Screenshots

![Discord Trigger UI screenshot](images/screen-1.png)

![Discord Send UI screenshot](images/screen-2.png)

## Rate Limiting & Performance

This Discord node implementation includes advanced rate limiting and performance monitoring features designed to work
seamlessly with n8n's retry mechanisms and Discord.js v14, with enhanced websocket integration.

### Features

- **Automatic Retry**: Short rate limits (< 30 seconds) are automatically handled with intelligent backoff
- **Enhanced Logging**: Comprehensive Discord API request monitoring with performance metrics
- **n8n Integration**: Leverages n8n's native error handling for optimal workflow reliability
- **Global Rate Limit Detection**: Special handling for Discord's global rate limits vs. resource-specific limits
- **Performance Monitoring**: Real-time tracking of API call duration, rate limit status, and response times
- **Websocket Integration**: Advanced Discord.js v14 websocket monitoring and optimization
- **Real-time Data**: Leverages websocket connections for live Discord events and data

### Websocket Capabilities

- **Connection Health Monitoring**: Real-time websocket ping, shard status, and connection quality tracking
- **Automatic Reconnection**: Built-in handling of websocket disconnections and resumptions
- **Shard Management**: Multi-shard support with individual shard monitoring and health checks
- **Performance Optimization**: Smart recommendations for when to use websocket vs HTTP API
- **Real-time Events**: Live Discord events (messages, member updates, presence changes) via websocket
- **Connection Resilience**: Automatic error handling and reconnection strategies

### Native Performance Modules

This package includes optional native C++ modules for optimal WebSocket performance:

- **bufferutil** (v4.0.9): Native WebSocket frame masking/unmasking - reduces CPU usage by 30-50%
- **zlib-sync** (v0.1.10): Native per-message compression - faster compression and lower bandwidth
- **utf-8-validate** (v6.0.5): Native UTF-8 validation - faster message validation and processing

These modules are automatically detected and used by discord.js when available. They require `build-essential` (or
equivalent C++ compiler) to compile during installation. If compilation fails, discord.js gracefully falls back to pure
JavaScript implementations.

**Benefits:**

- Lower CPU usage for WebSocket operations
- Faster real-time event processing
- Reduced network overhead
- Better performance for high-volume Discord workloads
- No code changes required - automatic integration

### Rate Limiting Behavior

- **Short Rate Limits**: Automatically retried with Discord-provided delay times
- **Long Rate Limits**: Throws informative errors with retry suggestions for n8n's retry settings
- **Global Rate Limits**: Detected and logged separately with enhanced monitoring
- **Resource Rate Limits**: Tracked per-endpoint with detailed scope information
- **Websocket Aware**: Considers websocket health when making HTTP API decisions

### Performance Metrics

The node automatically logs:

- Request duration and endpoint performance
- Rate limit remaining counts and reset times
- Slow request detection (> 5 seconds)
- Low rate limit warnings (< 5 requests remaining)
- Discord.js v14 rate limiting events

### Monitoring

Enable debug logging in n8n to see detailed Discord API performance metrics:

```json
{
  "operation": "POST /channels/123/messages",
  "duration": 245,
  "rateLimitRemaining": 48,
  "status": 200
}
```

Websocket health monitoring provides real-time connection status:

```json
{
  "ping": 85,
  "status": "excellent",
  "shards": 1,
  "guilds": 15,
  "websocketStatus": "connected"
}
```

Advanced websocket events include:

- **Shard Ready/Resume**: Individual shard connection status
- **Connection Health**: Real-time ping and performance metrics
- **Reconnection Events**: Automatic handling of connection issues
- **Error Handling**: Detailed websocket error logging and recovery

### Integration with n8n Retry Settings

For workflows requiring high reliability, configure n8n's retry settings:

- **Retry on Error**: Enable for automatic handling of longer rate limits
- **Retry Interval**: Set to 30+ seconds for Discord rate limit compatibility
- **Max Retries**: Recommended 3-5 attempts for Discord API reliability

The node provides detailed error messages to help configure optimal retry strategies for your specific use case.

</details>

---

## 🤝 Contributing

We welcome contributions! See [Contributing Guide](docs/CONTRIBUTING.md) for:

- Code style guidelines
- Development setup
- Testing requirements
- Pull request process

## 📝 License

MIT License

Copyright (c) 2023 [https://github.com/edbrdi](https://github.com/edbrdi)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
