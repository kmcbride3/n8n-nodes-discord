# Changelog

## Released (2025-10-05 0.8.0-beta.1) - Beta Release 🚀

> **⚠️ Beta Release:** This is a major architectural milestone introducing n8n V2 node standard support alongside
> existing V1 nodes. The codebase has undergone significant refactoring with comprehensive testing, but has not yet been
> validated in production environments. API may evolve based on user feedback. More Discord operations will be added in
> future releases.

### Major Features

#### n8n V2 Node Implementation

- **New V2 Nodes**: Complete implementation of n8n V2 node standard alongside backward-compatible V1 nodes
  - V2 Discord Send node with resource-based operations (Message, Prompt, Action, Webhook, Utility)
  - V2 Discord Trigger node with declarative trigger registry pattern
  - **Uses official n8n `DiscordBotApi` credential** (V1 nodes use custom credential for backward compatibility)
  - Full type safety with n8n's `AllEntities<NodeMap>` pattern
  - Proper error handling using n8n error types (NodeOperationError, NodeApiError)
  - See [V1 to V2 Migration Guide](docs/migration/v1-to-v2.md) for credential migration details

#### V2 Operations Architecture

- **Message Operations**: send, deleteMessage, removeMessages (bulk delete)
- **Prompt Operations**: button (interactive button prompts), select (dropdown menus)
- **Action Operations**: addRole, removeRole, kickMember, banMember, timeoutMember
- **Webhook Operations**: create, send (native Discord webhook support)
- **Utility Operations**: utility helpers, interactionManager

#### Trigger System Consolidation

- **Trigger Factory Pattern**: Generic trigger creation using declarative configuration
- **Trigger Registry**: Centralized registry for all 13 Discord trigger types
  - Message triggers: message, message_update
  - Thread triggers: thread, thread_update
  - Command triggers: command, interaction
  - User triggers: userJoins, userLeaves, userUpdate, presenceUpdate, userNickUpdated, userRoleAdded, userRoleRemoved
- **Event Filtering & Transformation**: Declarative filter and transform functions per trigger type
- **Intent Validation**: Automatic Discord Gateway intent validation per trigger type

### Performance & Optimization

#### Connection Management

- **Client Pooling**: Efficient Discord client connection pooling with reference counting
- **Connection Optimization**: Smart client reuse across operations with automatic cleanup
- **WebSocket Enhancement**: Advanced WebSocket health monitoring and performance tracking
- **Intent Optimization**: Operation-specific intent configurations for minimal resource usage
- **Memory Management**: Automatic idle client cleanup with configurable thresholds

#### Request Optimization

- **Request Caching**: Canonical body parsing with LRU cache to avoid repeated JSON parsing
- **Request Normalization**: Unified request handling across different framework formats
- **Body Hashing**: SHA-256 hashing for quick equality checks and cache keys

#### Collector Lifecycle Management

- **State Manager**: Centralized collector state management preventing memory leaks
- **Automatic Cleanup**: Discord.js native disposal with proper event listener cleanup
- **Performance Monitoring**: Comprehensive collector performance metrics and insights
- **Memory Pressure Detection**: Proactive cleanup under memory pressure conditions

### Testing & Quality Assurance

#### Comprehensive Test Suite

Build / Test status:

- ![build status](https://img.shields.io/badge/build-passing-brightgreen)
- ![tests](https://img.shields.io/badge/tests-passing-brightgreen)
- ![coverage](https://img.shields.io/badge/coverage-unknown-lightgrey)
- **Unit Tests**: Operation validation, credential security, input sanitization, Discord validation
- **Integration Tests**: V2 operations, collector lifecycle, network recovery, credential handling
- **Compliance Tests**: Automated n8n V2 compliance validation
- **Workflow Tests**: Real workflow JSON validation and structure testing

#### Test Coverage Areas

- Credential security and format validation
- Input sanitization and XSS prevention
- Discord snowflake validation
- Webhook signature verification
- Client manager lifecycle
- Connection optimization
- Message operations
- Request caching
- Collector performance
- Network recovery and pool health management

### Security Enhancements

#### Input Validation & Sanitization

- **XSS Prevention**: HTML entity encoding for user-generated content
- **Command Injection**: Shell command character sanitization
- **Path Traversal**: Path normalization and validation
- **Snowflake Validation**: Discord.js SnowflakeUtil integration for ID validation
- **Credential Validation**: Enhanced format checking for Discord tokens and IDs

#### Webhook Security

- **Signature Verification**: Proper Ed25519 webhook signature verification (continued from v0.7.6)
- **Request Normalization**: Canonical body handling for consistent verification
- **Replay Attack Prevention**: Timestamp validation in webhook requests

### Architecture & Infrastructure

#### Shared Utilities

- **ID Generation**: Node.js crypto.randomUUID() replacing hexoid dependency
- **Request Normalization**: Framework-agnostic request handling with caching
- **Snowflake Utilities**: Discord.js built-in snowflake validation and decoding
- **Type Helpers**: Centralized type conversion with n8n error integration

#### Helper Systems

- **HTTP Client**: n8n webhook execution and execution status polling (V1 compatibility)
- **IPC Facade**: Type-safe IPC abstraction for V1 bot communication
- **Collector Performance Monitor**: Advanced performance tracking with insights and recommendations
- **Connection Integration**: V2 operation context with optimized client management

#### WebSocket Management

- **Health Metrics**: Connection status, latency, uptime, reconnect tracking
- **Event Metrics**: Performance tracking for Discord.js events
- **Event Optimizer**: Prevent duplicate listener registration with WeakSet tracking
- **Automatic Reconnection**: Discord.js built-in reconnection with monitoring

### Documentation

#### Comprehensive Guides

- **[V1 to V2 Migration Guide](docs/migration/v1-to-v2.md)**: Step-by-step migration from n8n V1 to V2 nodes
  - Operation mapping tables
  - Parameter name changes
  - Code examples for each operation type
  - Common pitfalls and solutions
- **[V2 Architecture Visual Guide](docs/development/v2-architecture-visual-guide.md)**: ASCII diagrams showing message
  flows and patterns
  - Stateless message sending flow
  - Interactive component response flow
  - Complete interactive workflow examples
  - Resource comparison (Message vs Prompt vs Trigger)
  - Memory and performance comparison

#### Developer Documentation

- **[Architecture Documentation](docs/architecture.md)**: Complete architecture guide including built-ins first
  approach, Discord.js v14 integration, design principles, best practices, and quality standards
- **[Testing Documentation](docs/development/testing.md)**: Test structure, patterns, and coverage
- **[API Documentation](docs/architecture.md#api-reference)**: Operation references, trigger configurations
- **[V2 Operations Guide](docs/operations/v2-operations.md)**: Complete V2 operation reference
- **[Webhook Security](docs/architecture.md#webhook-security)**: Ed25519 signature verification and security
- **[Performance Guide](docs/architecture.md#performance-optimization)**: Optimization and monitoring strategies
- **Workflow Examples**: JSON workflow files for common operations in `tests/integration/workflows/`

### Type Safety & Developer Experience

#### TypeScript Enhancements

- **NodeMap Type**: Comprehensive type definitions for all V2 operations
- **AllEntities Integration**: n8n's type-safe operation routing
- **Trigger Type Definitions**: Type-safe trigger configuration interfaces
- **Error Type Integration**: Proper n8n error types throughout

#### Code Quality

- **Type Helper Utilities**: Centralized type conversion with validation
- **Minimal Casting**: Reduced `as unknown as` casts with helper functions
- **Error Context**: Minimal INode objects for error reporting when needed
- **JSDoc Comments**: Comprehensive inline documentation

### Backward Compatibility

#### V1 Node Support

- **Full V1 Compatibility**: All existing V1 nodes continue to work unchanged
- **No Breaking Changes**: Existing workflows remain functional
- **Migration Path**: Optional upgrade to V2 nodes when ready
- **IPC Support**: Maintained IPC communication for V1 bot operations

### Infrastructure Improvements

#### Build & Development

- **Test Scripts**: Comprehensive test runner setup
- **Compliance Testing**: Automated V2 compliance checks
- **Workflow Validation**: JSON workflow structure validation
- **Mock Utilities**: Reusable test mocks and helpers

#### CI/CD

- **Automated Testing**: All tests run on commit
- **Coverage Reporting**: Test coverage tracking and reporting
- **Linting**: ESLint compliance checks
- **Type Checking**: TypeScript compilation validation

### Known Limitations & Future Work

#### Current Limitations

- **Untested in Production**: Beta release has not been validated in real-world production environments
- **Feature Incomplete**: More Discord triggers and operations planned
- **API Evolution**: Parameters and interfaces may change based on feedback
- **V1 Deprecation**: No timeline yet for V1 node deprecation

#### Planned Features

- Additional Discord trigger types
- More action operations (mute, deafen, move members, etc.)
- Enhanced embed support
- Forum channel operations
- Auto-moderation integration
- Voice channel operations

### Migration Notes

#### For Existing Users (V1 Nodes)

- **No Action Required**: V1 nodes continue to work exactly as before
- **Optional Upgrade**: V2 nodes available for new workflows
- **Performance Benefits**: V2 nodes offer better performance and resource management
- **See Migration Guide**: Detailed guide available in `/docs/migration/v1-to-v2.md`

#### For New Users

- **Start with V2**: New workflows should use V2 nodes
- **Better Performance**: V2 architecture offers improved efficiency
- **Modern Patterns**: Follows n8n's latest best practices
- **Future-Proof**: V2 is the path forward for n8n integrations

### Dependencies

#### No Dependency Changes

- All dependencies remain the same as v0.7.6
- discord.js: ^14.22.1
- n8n-core: ^1.111.0
- n8n-workflow: ^1.109.0
- tweetnacl: ^1.0.3 (added in v0.7.6 for webhook security)

### Breaking Changes

**None** - This release is fully backward compatible with v0.7.6. All V1 nodes continue to work unchanged.

### Feedback & Contributions

This is a **beta release**. We welcome feedback on:

- Production usage experiences and stability
- Missing Discord features you'd like to see
- API usability and developer experience
- Performance in real-world scenarios
- Documentation clarity and completeness

Please report issues and provide feedback at: <https://github.com/kmcbride3/n8n-nodes-discord/issues>

### Getting Started

- **Quick Start**: See [FAQ](docs/FAQ.md) for common questions
- **Migration**: Follow [V1 to V2 Migration Guide](docs/migration/v1-to-v2.md)
- **Development**: Read [Getting Started Guide](docs/development/getting-started.md)
- **Troubleshooting**: Check [Common Errors](docs/troubleshooting/common-errors.md)

---

## Released (2025-09-21 0.7.6)

### Security Fixes

- **CRITICAL**: Fixed Ed25519 webhook signature verification vulnerability
  - Implemented proper Ed25519 signature verification using tweetnacl
  - Added tweetnacl dependency for secure cryptographic operations
  - Previously, webhook requests were not properly verified, allowing potential spoofing attacks
  - Added comprehensive test coverage for webhook security

### Improvements/refactoring

- Enhanced logging architecture with workflow context tracking
  - Added automatic workflow ID detection in log messages
  - Implemented log level support (error, warn, info, debug) with debug as default
  - Improved state-based workflow context management
- Enhanced user experience for log messages
  - Replaced internal webhook IDs with descriptive, user-friendly messages
  - Added contextual information for Discord events in logs
  - Improved debugging capabilities with meaningful log context
- Updated GitHub Actions workflows to latest versions
  - Updated checkout action to v4
  - Updated setup-node action to v4
  - Enhanced CI/CD pipeline with modern action versions
- Code quality improvements
  - Refactored addLog() function for better maintainability
  - Added helper functions for workflow context management
  - Enhanced type safety across logging infrastructure

## Released (2025-09-20 0.7.5)

### New Features

- Added GitHub Copilot AI agent compatibility with `usableAsTool: true` configuration
- Enhanced Discord integration with latest Discord.js v14.22.1 features
- Implemented comprehensive type safety across all Discord interactions

### Improvements/refactoring

- **BREAKING CHANGE:** Migrated from Discord.js v13 to v14 patterns
  - Updated intents to use `IntentsBitField.Flags` instead of string literals
- Modernized n8n node architecture
  - Corrected Discord node classification from 'transform' to 'output'
  - Updated to latest n8n-core (v1.111.0) and n8n-workflow (v1.109.0) APIs
- Enhanced type safety and code quality
  - Eliminated all `any` type usage across the codebase
  - Added proper TypeScript definitions for Discord.js v14 components
  - Implemented `CommandRegistrationData` type for type-safe command handling
- Improved logging and error handling
  - Replaced console.log with structured `LoggerProxy` across bot infrastructure
  - Added contextual metadata for better debugging and monitoring
  - Enhanced error handling with proper type safety
- Updated build and development tooling
  - Updated ESLint to v9.36.0 with modern flat config
  - Updated TypeScript to v5.9.2 with improved type checking
  - Updated Prettier to v3.6.2 for consistent code formatting
  - Enhanced PNPM overrides for better dependency management

### Dependency Updates

- **discord.js**: ^14.18.0 → ^14.22.1 (latest v14 features and security fixes)
- **n8n-core**: ^1.87.0 → ^1.111.0 (major n8n framework update)
- **n8n-workflow**: ^1.82.0 → ^1.109.0 (modern n8n workflow API)
- **axios**: ^1.8.4 → ^1.12.2 (security and compatibility updates)
- **eslint**: ^9.24.0 → ^9.36.0 (latest linting rules and fixes)
- **typescript**: ^5.8.3 → ^5.9.2 (compiler improvements)
- **@types/node**: ^22.14.1 → ^24.5.2 (Node.js v24 type definitions)
- **typescript-eslint**: ^8.29.1 → ^8.44.0 (TypeScript tooling updates)
- Multiple minor updates for prettier, gulp, and ESLint plugins

### Infrastructure Changes

- Restructured Copilot instructions to `.github/instructions/` directory
- Enhanced bot command system with full type safety
- Improved IPC communication with proper type definitions
- Updated package.json with latest dependency overrides and peer dependency rules

## Released (2025-04-13 0.7.4)

### New Features

- Added support for Discord.js v14.18.0
- Added compatibility with Node.js v23.10.0
- Added message timeout handling with improved notifications
- Enhanced trigger workflow functionality to support more event types
- Enhanced pattern matching in message triggers

### Improvements/refactoring

- Improved TypeScript type safety by removing 'any' type usages
- Enhanced Collection implementation with discord.js Collections
- Updated dependencies to remove deprecated methods
- Fixed object injection vulnerabilities
- **Security Hardening**: Comprehensive security enhancements
  - ReDoS protection with `safeRegexTest()` function and regex complexity checks
  - SSRF prevention in URL validation blocking private networks
  - Enhanced input validation and sanitization for all user inputs
  - Improved credential security with format validation
  - Rate limiting capabilities and content sanitization
- Improved ESLint and Prettier compliance
- Improved type safety in Discord client event handlers
- Optimized channel state management for triggers
- Better handling of trigger workflows with improved active state management
- Added better handling of bot mentions in message triggers
- Improved workflow trigger activation status tracking
- Improved error handling in message update events
- Better state management for channel triggers
- Enhanced logging for workflow trigger failures

### Bug fixes

- Fixed message update trigger handling for proper channel detection
- Enhanced error logging in event handlers
- Improved error handling in workflow triggers
- Enhanced error logging for webhook triggers

## Previous Versions

## Released (2024-11-17 0.7.3)

### New Features

- Trigger: Message update
- Trigger: Thread update

## Released (2024-11-17 0.7.2)

### Improvements/refactoring

- Bug fixes for missing roleIds in triggers
- Additional dependency updates

## Released (2024-11-17 0.7.1)

### Improvements/refactoring

- Additional dependency clean-up and updates

## Released (2024-11-10 0.7.0)

### New Features

- Discord Trigger Node
- **New trigger type:** Threads - start a workflow when a new thread is created. Supports all the same parameters as the
  _Message_ trigger.
- **New trigger type:** Nicknames - start a workflow when a user's server nickname is updated. Supports all the same
  parameters as the _User Role_ trigger.
- Now listens and reacts to all trigger events from bots

### Improvements/refactoring

- Added [Node Codex](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-codex-files/)'s for both
  Discord Trigger and Discord Send.
- Replaced `.eslintignore`, `.eslintrc`, and `.eslintrc.js` with new `eslint.config.mjs` flat file.
- Added configuration file to support n8n's [nodelinter](https://github.com/n8n-io/nodelinter).
- Removed unnecessary dependencies, updated all remaining ones to latest version

## Released (2023-01-18 0.5.0)

### New Features

- Trigger workflow using slash commands (can be restricted to specific roles, pass a parameter)

### Improvements/refactoring

- bot/index.ts refactored into multiple files (discordClientEvents/..., ipcEvents/...)
- Discord Send node will now loop over items
- Triggers can ben listened from all (text) channels if none is specified

## Released (2022-12-16 0.4.2)

### Bug fixes

- Fix attachments webhook checking

## Released (2022-12-13 0.4.1)

### New Features

- Trigger: Attachments field

## Released (2022-11-27 0.4.0)

### New Features

- Trigger: Interaction
- Send: Persistent button/select

## Released (2022-11-26 0.3.1)

### Bug fixes

- User mention notifications are now sent

## Released (2022-11-25 0.3.0)

### New Features

- Trigger: User joins the server
- Trigger: User leaves the server
- Trigger: User presence update
- Trigger: User role added
- Trigger: User role removed
- Action : Add role to user
- Action : Remove role from user

### Bug fixes

- Bot crash when a non-administrator try to use bot "/" commands

## Released (2022-11-06 0.2.0)

### New Features

- base64 on embeds & files
- more context returned by executed nodes (trigger/send)
- type "Action" added on the Discord Send node, with one action possible at the moment: "Remove messages"
- bot customization (activity, activity type, status)

### Improvements/refactoring

- You can now send embeds without "content"

### Bug Fixes

- Error when using prompt if no placeholderId

## Released (2022-10-26 0.1.3)

### Bug Fixes

- Fix subdomain regex

## Released (2022-10-26 0.1.2)

### Improvements/refactoring

- prevent bot crashes

### Bug Fixes

- fix baseUrl
- fix placeholder animation

## Released (2022-10-26 0.1.1)

### Improvements/refactoring

- Added base url field to Discord credentials, so there is no need to use env var and have conflict with different
  formats
