# Quick Start Guide

## Prerequisites

- Node.js v18 or higher
- pnpm package manager
- Discord bot token (for testing)
- Basic understanding of n8n and Discord

## Installation

```bash
# Clone the repository
git clone https://github.com/kmcbride3/n8n-nodes-discord.git
cd n8n-nodes-discord

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Development Setup

### 1. Link to n8n (for local development)

```bash
# In this project directory
pnpm link --global

# In your n8n installation directory
pnpm link --global @kmcbride3/n8n-nodes-discord
```

### 2. Set Up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token (you'll need this for testing)
5. Enable necessary intents (Message Content, Server Members, etc.)

### 3. Configure n8n Credentials

In n8n:

1. Go to Credentials
2. Add "Discord Bot API" credential
3. Paste your bot token
4. Test the connection

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test path/to/test.test.ts

# Run tests with coverage
pnpm test:coverage
```

## Project Structure

```
src/
├── credentials/          # Credential types
├── nodes/Discord/
│   ├── shared/          # Shared utilities
│   ├── v1/              # V1 bot implementation
│   └── v2/              # V2 webhook implementation
tests/
├── unit/                # Unit tests
├── integration/         # Integration tests
└── compliance/          # V2 compliance tests
docs/                    # Documentation
```

## Making Changes

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow TypeScript best practices
- Use Discord.js built-ins where possible
- Add tests for new functionality
- Update documentation

### 3. Run Quality Checks

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test

# Build
pnpm build
```

### 4. Submit Pull Request

- Ensure all tests pass
- Update CHANGELOG.md
- Provide clear description of changes

## Common Development Tasks

### Adding a New Operation

1. Create operation file in `src/nodes/Discord/v2/actions/{resource}/`
2. Implement the operation following existing patterns
3. Add to resource index file
4. Update router if needed
5. Add tests
6. Update documentation

### Debugging

```bash
# Run n8n in development mode
n8n start

# View logs
tail -f ~/.n8n/logs/*.log
```

### Testing with Real Discord

1. Create a test Discord server
2. Add your bot to the server
3. Use test workflows in n8n
4. Check bot responses in Discord

## Key Concepts

### V1 vs V2

- **V1**: Bot-based, persistent connection, stateful
- **V2**: Webhook-based, stateless, for simple operations
- **Discord Trigger**: For receiving Discord events

See [architecture.md](architecture.md) for detailed comparison.

### Using Discord.js Built-ins

Always prefer Discord.js built-in functions:

```typescript
// ✅ Good - use Discord.js
import { SnowflakeUtil } from 'discord.js'
const isValid = SnowflakeUtil.decode(id)

// ❌ Avoid - custom validation
const isValid = /^\d{17,19}$/.test(id)
```

### Error Handling

Use n8n error types:

```typescript
import { NodeOperationError } from 'n8n-workflow'

throw new NodeOperationError(this.getNode(), 'Error message', {
  itemIndex,
  description: 'User-friendly description',
})
```

## Getting Help

- **Documentation**: Check `docs/` folder
- **Architecture**: See [architecture.md](architecture.md)
- **Testing**: See [testing.md](testing.md)
- **Issues**: Check existing GitHub issues
- **Discord**: Join the n8n community Discord

## Next Steps

1. Read [architecture.md](architecture.md) to understand the system
2. Review [testing.md](testing.md) for testing guidelines
3. Explore [v2-operations.md](../operations/v2-operations.md) for operation development
4. Check [common-errors.md](../troubleshooting/common-errors.md) for troubleshooting

## Resources

- [Discord.js Documentation](https://discord.js.org/)
- [n8n Documentation](https://docs.n8n.io/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [n8n Community](https://community.n8n.io/)
