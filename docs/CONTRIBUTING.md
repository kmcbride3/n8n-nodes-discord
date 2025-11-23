# Contributing to n8n-nodes-discord

Thank you for considering contributing to n8n-nodes-discord! This document provides guidelines and standards for
contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We pledge to make participation in this project a harassment-free experience for everyone, regardless of age, body size,
disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race,
religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**

- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js v18.0.0 or higher
- pnpm v9.12.3 or higher
- Discord bot with proper permissions
- n8n instance for testing

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/n8n-nodes-discord.git
   cd n8n-nodes-discord
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build the Project**

   ```bash
   pnpm build
   ```

4. **Run Tests**

   ```bash
   pnpm test
   ```

5. **Link to n8n (for local testing)**

   ```bash
   # In n8n-nodes-discord directory
   pnpm link --global

   # In n8n directory
   pnpm link --global @kmcbride3/n8n-nodes-discord
   ```

See [Getting Started Guide](./development/getting-started.md) for detailed instructions.

## Development Workflow

### Branch Strategy

- `main` - Stable production code
- `experimental` - Development and testing
- `feature/*` - New features
- `fix/*` - Bug fixes
- `./*` - Documentation updates

### Typical Workflow

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow [Coding Standards](#coding-standards)
   - Write tests for new functionality
   - Update documentation

3. **Test Your Changes**

   ```bash
   pnpm test
   pnpm build
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript Standards

**Type Safety (CRITICAL):**

```typescript
// ❌ NEVER use 'any'
function processData(data: any): any {}

// ✅ Use specific types or 'unknown'
function processData(data: unknown): APIMessage {
  // Type guard before use
  if (typeof data !== 'object' || data === null) {
    throw new NodeOperationError(this.getNode(), 'Invalid data type')
  }
  return data as APIMessage
}
```

**Use Built-ins First:**

```typescript
// ❌ Don't recreate Discord functionality
interface CustomChannel {
  id: string
  name: string
  type: number
}

// ✅ Use Discord.js official types
import { APIChannel, ChannelType } from 'discord.js'

function processChannel(channel: APIChannel): void {
  if (channel.type === ChannelType.GuildText) {
    // Process text channel
  }
}
```

**Error Handling:**

```typescript
// ❌ Don't use generic Error
throw new Error('Operation failed')

// ✅ Use n8n error types
import { NodeOperationError, NodeApiError } from 'n8n-workflow'

throw new NodeOperationError(this.getNode(), 'Operation failed: invalid channel ID', {
  itemIndex,
  description: 'Ensure channel ID is a valid Discord snowflake',
})
```

### Discord.js Integration

**Priority Hierarchy:**

1. **Discord.js Native Methods** (Primary)

   ```typescript
   // ✅ Use Discord.js client methods
   const channel = await client.channels.fetch(channelId)
   const message = await channel.send({ content, embeds })
   ```

2. **Discord.js REST API** (Secondary)

   ```typescript
   // ✅ Use when native methods unavailable
   const rest = new REST().setToken(token)
   const channel = await rest.get(Routes.channel(channelId))
   ```

3. **Custom Logic** (Last Resort Only)

   ```typescript
   // ⚠️ Only when Discord.js doesn't support it
   // Document why built-in wasn't suitable
   ```

**Use Discord.js Builders:**

```typescript
// ❌ Don't use raw objects
const embed = {
  title: 'Title',
  description: 'Description',
  color: 0x00ae86,
}

// ✅ Use Discord.js builders
import { EmbedBuilder } from 'discord.js'

const embed = new EmbedBuilder().setTitle('Title').setDescription('Description').setColor(0x00ae86)
```

### Code Style

**ESLint and Prettier:**

```bash
# Check linting
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

**Key Rules:**

- Single quotes for strings
- Semicolons at end of statements
- 2-space indentation
- Max line length: 100 characters
- No unused variables or imports
- Descriptive variable names

### File Organization

**V2 Operations Structure:**

```md
/v2/actions/ ├── message/ │ ├── send.operation.ts │ ├── edit.operation.ts │ └── remove.operation.ts ├── user/ │ ├──
get.operation.ts │ └── kick.operation.ts └── guild/ └── info.operation.ts
```

**Operation File Template:**

```typescript
import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow'
import { verifyString } from 'discord.js'

/**
 * Execute the send message operation
 * @param this - n8n execution context
 * @returns Array of execution data with message response
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
  const items = this.getInputData()
  const returnData: INodeExecutionData[] = []

  for (let i = 0; i < items.length; i++) {
    try {
      // Get parameters using n8n built-ins
      const channelId = this.getNodeParameter('channelId', i) as string
      const content = verifyString(this.getNodeParameter('content', i) as string)

      // Use Discord.js for operation
      const message = await sendMessage.call(this, channelId, { content })

      // Return data with pairedItem for data flow
      returnData.push({
        json: message.toJSON(),
        pairedItem: { item: i },
      })
    } catch (error) {
      // Use n8n error handling
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i },
        })
      } else {
        throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i })
      }
    }
  }

  return returnData
}

export const description = {
  displayName: 'Send Message',
  name: 'sendMessage',
  description: 'Send a message to a Discord channel',
  // ... additional properties
}
```

## Testing Requirements

### Test Coverage Goals

- **Priority 1 - Core Operations**: 40%+ coverage
- **Priority 2 - Security & Validation**: 50%+ coverage
- **Priority 3 - Integration Tests**: 30%+ coverage

### Writing Tests

**Unit Test Example:**

```typescript
import { validateSnowflake } from '../helpers/validation'

describe('validateSnowflake', () => {
  it('should validate correct snowflake ID', () => {
    expect(validateSnowflake('123456789012345678')).toBe(true)
  })

  it('should reject invalid snowflake ID', () => {
    expect(validateSnowflake('invalid')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateSnowflake('')).toBe(false)
  })
})
```

**Integration Test Example:**

```typescript
import { executeV2Operation } from '../helpers/testUtils'

describe('Message Send Operation', () => {
  it('should send message successfully', async () => {
    const result = await executeV2Operation('message', 'send', {
      channelId: '123456789012345678',
      content: 'Test message',
    })

    expect(result).toHaveProperty('id')
    expect(result.content).toBe('Test message')
  })
})
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- message-operations.test.ts

# Run with coverage
pnpm test -- --coverage

# Watch mode during development
pnpm test -- --watch
```

See [Testing Guide](./development/testing.md) for comprehensive testing documentation.

## Commit Guidelines

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```git
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without adding features or fixing bugs
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)

**Examples:**

```bash
# Feature addition
git commit -m "feat(v2): add user timeout operation"

# Bug fix
git commit -m "fix(validation): correct snowflake ID validation regex"

# Documentation
git commit -m "docs(api): add JSDoc comments to helper functions"

# Breaking change
git commit -m "feat(v2)!: remove deprecated IPC-based operations

BREAKING CHANGE: V1 IPC operations removed. Use V2 REST-based operations."
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`pnpm test`)
2. ✅ Code builds successfully (`pnpm build`)
3. ✅ Linting passes (`pnpm lint`)
4. ✅ Code is formatted (`pnpm format`)
5. ✅ Documentation updated
6. ✅ CHANGELOG.md updated (if applicable)

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Code Review**: Maintainers review code quality
3. **Discussion**: Address feedback and questions
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainer merges after approval

## Documentation

### Documentation Standards

**Update documentation for:**

- New features or operations
- Changed behavior or parameters
- New configuration options
- Breaking changes
- Security considerations

**Documentation Locations:**

- **API Documentation**: JSDoc comments in code
- **User Guide**: `README.md`
- **Developer Docs**: `/./development/`
- **Operations**: `/./operations/`
- **Troubleshooting**: `/./troubleshooting/`
- **FAQ**: `/./FAQ.md`

### Writing Documentation

**Use Clear Language:**

```markdown
❌ The operation utilizes the Discord API to effectuate message transmission. ✅ This operation sends a message to a
Discord channel.
```

**Provide Examples:**

````markdown
## Send Message Operation

Send a message to a Discord channel with optional embeds and components.

**Example:**

```javascript
{
  "channelId": "123456789012345678",
  "content": "Hello, Discord!",
  "embed": {
    "title": "Notification",
    "description": "Your workflow completed successfully"
  }
}
```
````

**Link Related Docs:**

```markdown
See [Error Handling](./error-handling.md) for comprehensive error handling patterns.
```

## Getting Help

### Resources

- **Documentation**: [/docs](./) folder
- **Community**: [n8n Community Forum](https://community.n8n.io/)
- **Issues**: [GitHub Issues](https://github.com/kmcbride3/n8n-nodes-discord/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kmcbride3/n8n-nodes-discord/discussions)

### Questions?

- Check [FAQ](./FAQ.md) first
- Search [existing issues](https://github.com/kmcbride3/n8n-nodes-discord/issues)
- Ask in [GitHub Discussions](https://github.com/kmcbride3/n8n-nodes-discord/discussions)
- Join [n8n Community](https://community.n8n.io/)

## Recognition

Contributors are recognized in:

- `CHANGELOG.md` for each release
- GitHub contributors page
- Release notes

Thank you for contributing! 🎉
