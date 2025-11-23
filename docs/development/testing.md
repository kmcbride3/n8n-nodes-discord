# Testing Guidelines for Discord Integration

## Overview

This document provides comprehensive testing guidelines for the n8n Discord integration, covering unit tests,
integration tests, mocking strategies, and quality assurance practices.

## Testing Framework Architecture

### Technology Stack

- **Framework**: Jest 30.1.3 with TypeScript support
- **Coverage**: Istanbul for code coverage reporting
- **Mocking**: Comprehensive Discord.js and n8n-workflow mocking
- **Test Categories**: Unit, Integration, Security, Performance

### Current Test Metrics (September 2025)

```text
✅ Test Suites: 13 test suites
✅ Total Tests: 369 tests passing
✅ Execution Time: ~15 seconds
✅ Priority 1 Coverage: 56.55% (target: 40%+)
✅ Priority 2 Coverage: 60.2% validation, 93.1% credentials (target: 50%+)
✅ Priority 3 Coverage: 26 integration tests (target: 30% coverage)
```

## Test Suite Organization

### Unit Tests (12 suites, 343 tests)

#### Core Operations Testing

```typescript
// discord-operations.test.ts (23 tests)
describe('Discord Operations', () => {
  test('should validate Discord client creation', async () => {
    const mockCredentials = createMockCredentials()
    const client = await createV2DiscordClient(mockCredentials)

    expect(client).toBeDefined()
    expect(mockClient.login).toHaveBeenCalledWith(mockCredentials.token)
  })

  test('should handle parameter extraction correctly', () => {
    const mockThis = createMockExecuteFunction()
    const params = extractDiscordParameters(mockThis, 0)

    expect(params.guildId).toBe('123456789')
    expect(params.channelId).toBe('987654321')
  })
})
```

#### Collector Lifecycle Management

```typescript
// collector-lifecycle.test.ts (32 tests)
describe('Discord Collector Lifecycle', () => {
  test('should create collector with proper configuration', () => {
    const collector = createInteractionCollector(mockChannel, mockFilter, { timeout: 300000 })

    expect(collector.options.time).toBe(300000)
    expect(collector.options.dispose).toBe(true)
  })

  test('should handle collector cleanup on end', async () => {
    const collector = createInteractionCollector(mockChannel, mockFilter)
    const cleanupSpy = jest.spyOn(collector, 'stop')

    collector.emit('end')

    expect(cleanupSpy).toHaveBeenCalled()
  })
})
```

#### Security and Credential Testing

```typescript
// credential-security.test.ts (26 tests)
describe('Credential Security', () => {
  test('should validate Discord token format', () => {
    const validToken = 'MTIzNDU2Nzg5.ABCDEF.xyz123'
    const isValid = validateDiscordToken(validToken)

    expect(isValid).toBe(true)
  })

  test('should reject malformed tokens', () => {
    const invalidToken = 'invalid-token'

    expect(() => validateDiscordToken(invalidToken)).toThrow('Invalid Discord token format')
  })
})
```

### Integration Tests (1 suite, 26 tests)

#### End-to-End Workflow Testing

```typescript
// discord-operations-integration.test.ts (26 tests)
describe('Discord Operations Integration', () => {
  test('should execute complete member ban workflow', async () => {
    const mockThis = createMockExecuteFunction({
      guildId: '123456789',
      userId: '987654321',
      reason: 'Test ban',
    })

    const results = await banMember.call(mockThis)

    expect(results).toHaveLength(1)
    expect(results[0].json.success).toBe(true)
    expect(mockGuild.members.ban).toHaveBeenCalledWith('987654321', { reason: 'Test ban' })
  })

  test('should handle cross-component integration', async () => {
    // Test guild-channel relationships
    const guild = await mockClient.guilds.fetch('123456789')
    const channels = await guild.channels.fetch()

    expect(guild.id).toBe('123456789')
    expect(channels.size).toBeGreaterThan(0)
  })
})
```

## Mocking Strategy

### Discord.js Mocking Setup

```typescript
// tests/setup.ts - Comprehensive Discord.js mocking
import { jest } from '@jest/globals'

// Mock Discord.js client and structures
const mockClient = {
  guilds: {
    fetch: jest.fn(),
    cache: new Map(),
  },
  channels: {
    fetch: jest.fn(),
    cache: new Map(),
  },
  users: {
    fetch: jest.fn(),
    cache: new Map(),
  },
  login: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
}

const mockGuild = {
  id: '123456789',
  name: 'Test Guild',
  members: {
    fetch: jest.fn(),
    ban: jest.fn(),
    kick: jest.fn(),
    cache: new Map(),
  },
  channels: {
    fetch: jest.fn(),
    cache: new Map(),
  },
}

// Mock builders
const mockEmbedBuilder = {
  setTitle: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis(),
}

jest.mock('discord.js', () => ({
  Client: jest.fn(() => mockClient),
  GatewayIntentBits: {
    Guilds: 1 << 0,
    GuildMembers: 1 << 1,
    GuildMessages: 1 << 9,
  },
  EmbedBuilder: jest.fn(() => mockEmbedBuilder),
  ActionRowBuilder: jest.fn(() => ({
    addComponents: jest.fn().mockReturnThis(),
  })),
  ButtonBuilder: jest.fn(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setLabel: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  })),
}))
```

### n8n Workflow Mocking

```typescript
// Mock n8n execution context
function createMockExecuteFunction(inputData: any = {}): IExecuteFunctions {
  return {
    getInputData: jest.fn(() => [{ json: inputData }]),
    getCredentials: jest.fn(async () => ({
      token: 'mock-discord-token',
    })),
    getNode: jest.fn(() => ({
      id: 'test-node-id',
      name: 'Test Discord Node',
      type: 'n8n-nodes-discord.Discord',
    })),
    getWorkflow: jest.fn(() => ({
      id: 'test-workflow-id',
      name: 'Test Workflow',
    })),
    continueOnFail: jest.fn(() => false),
    helpers: {
      returnJsonArray: jest.fn((data) => data.map((item: any) => ({ json: item }))),
    },
  } as unknown as IExecuteFunctions
}
```

## Test Categories and Patterns

### 1. Unit Tests

#### Parameter Validation Tests

```typescript
describe('Parameter Validation', () => {
  test('should validate snowflake IDs', () => {
    const validId = '123456789012345678'
    const invalidId = 'invalid-id'

    expect(isValidSnowflake(validId)).toBe(true)
    expect(isValidSnowflake(invalidId)).toBe(false)
  })

  test('should validate embed limits', () => {
    const embed = {
      title: 'A'.repeat(300), // Over 256 limit
      description: 'Valid description',
    }

    expect(() => validateEmbedContent(embed)).toThrow('Embed title too long')
  })
})
```

#### Error Handling Tests

```typescript
describe('Error Handling', () => {
  test('should convert Discord API errors to n8n errors', () => {
    const discordError = new DiscordAPIError(
      { message: 'Missing Permissions', code: 50013 },
      50013,
      403,
      'PATCH',
      '/guilds/123/members/456',
    )

    const nodeError = handleDiscordError(discordError, mockExecuteContext)

    expect(nodeError).toBeInstanceOf(NodeOperationError)
    expect(nodeError.message).toContain('Missing permissions')
    expect(nodeError.httpCode).toBe(403)
  })

  test('should preserve Discord error context', () => {
    const error = new RateLimitError({
      timeout: 1000,
      limit: 5,
      method: 'POST',
      hash: 'abc123',
      route: '/channels/123/messages',
    })

    const context = extractDiscordContext(error)

    expect(context.retryAfter).toBe(1000)
    expect(context.rateLimit).toEqual({
      limit: 5,
      hash: 'abc123',
      route: '/channels/123/messages',
    })
  })
})
```

### 2. Integration Tests

#### Workflow Integration

```typescript
describe('Workflow Integration', () => {
  test('should process multiple items in workflow', async () => {
    const mockThis = createMockExecuteFunction()
    mockThis.getInputData = jest.fn(() => [
      { json: { guildId: '123', userId: '456', action: 'ban' } },
      { json: { guildId: '123', userId: '789', action: 'kick' } },
    ])

    const results = await executeMemberOperation.call(mockThis)

    expect(results).toHaveLength(2)
    expect(results[0].json.action).toBe('ban')
    expect(results[1].json.action).toBe('kick')
  })
})
```

#### Cross-Component Tests

```typescript
describe('Cross-Component Integration', () => {
  test('should maintain state between collector and response', async () => {
    const collector = createInteractionCollector(mockChannel, mockFilter)
    const stateManager = new DiscordStateManager()

    // Simulate collector interaction
    const interaction = createMockInteraction()
    collector.emit('collect', interaction)

    // Verify state persistence
    const collectorState = stateManager.getCollectorState(collector.id)
    expect(collectorState.interactionCount).toBe(1)
  })
})
```

### 3. Security Tests

#### Input Sanitization

```typescript
describe('Security - Input Sanitization', () => {
  test('should prevent XSS in embed content', () => {
    const maliciousInput = '<script>alert("xss")</script>'
    const sanitized = sanitizeDiscordInput(maliciousInput)

    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toBe('scriptalert("xss")/script')
  })

  test('should prevent SQL injection attempts', () => {
    const sqlInjection = "'; DROP TABLE users; --"
    const sanitized = sanitizeDiscordInput(sqlInjection)

    expect(sanitized).not.toContain('DROP TABLE')
  })
})
```

#### Credential Protection

```typescript
describe('Security - Credential Protection', () => {
  test('should mask Discord tokens in error messages', () => {
    const token = 'MTIzNDU2Nzg5.ABCDEF.xyz123-sensitive'
    const error = new Error(`Authentication failed with token: ${token}`)

    const maskedError = maskSensitiveInfo(error)

    expect(maskedError.message).not.toContain(token)
    expect(maskedError.message).toContain('***MASKED***')
  })
})
```

### 4. Performance Tests

#### Memory Usage Monitoring

```typescript
describe('Performance - Memory Management', () => {
  test('should cleanup collectors after timeout', async () => {
    const initialMemory = process.memoryUsage().heapUsed

    // Create multiple collectors
    const collectors = Array(10)
      .fill(null)
      .map(() => createInteractionCollector(mockChannel, mockFilter, { timeout: 100 }))

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 200))

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    // Memory increase should be minimal after cleanup
    expect(memoryIncrease).toBeLessThan(1024 * 1024) // Less than 1MB
  })
})
```

## Testing Best Practices

### 1. Test Structure

```typescript
// ✅ Proper test organization
describe('Feature Group', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset mocks and state
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup resources
    mockClient.destroy()
  })

  describe('Specific Functionality', () => {
    test('should perform specific action with expected outcome', () => {
      // Arrange
      const input = createTestInput()
      const expectedOutput = createExpectedOutput()

      // Act
      const result = performAction(input)

      // Assert
      expect(result).toEqual(expectedOutput)
    })
  })
})
```

### 2. Mock Management

```typescript
// ✅ Effective mock patterns
describe('Discord Client Operations', () => {
  let mockClient: jest.Mocked<Client>

  beforeEach(() => {
    mockClient = createMockClient()

    // Setup common mock behaviors
    mockClient.guilds.fetch.mockImplementation(async (id: string) => {
      if (id === 'valid-guild-id') {
        return createMockGuild(id)
      }
      throw new DiscordAPIError({ message: 'Unknown Guild', code: 10004 }, 10004, 404, 'GET', `/guilds/${id}`)
    })
  })
})
```

### 3. Assertion Strategies

```typescript
// ✅ Comprehensive assertions
test('should handle member ban operation completely', async () => {
  const result = await banMember(mockClient, 'guildId', 'userId', 'reason')

  // Verify Discord.js method calls
  expect(mockClient.guilds.fetch).toHaveBeenCalledWith('guildId')
  expect(mockGuild.members.fetch).toHaveBeenCalledWith('userId')
  expect(mockMember.ban).toHaveBeenCalledWith({ reason: 'reason' })

  // Verify result structure
  expect(result).toMatchObject({
    success: true,
    user: expect.objectContaining({
      id: 'userId',
      banned: true,
    }),
    timestamp: expect.any(String),
  })

  // Verify no unexpected calls
  expect(mockClient.channels.fetch).not.toHaveBeenCalled()
})
```

## Coverage Requirements

### Priority-Based Coverage Targets

#### Priority 1 - Core Operations (40% minimum)

- Message operations (send, edit, delete)
- Member operations (ban, kick, timeout)
- Basic Discord API interactions
- Current: 56.55% ✅

#### Priority 2 - Security & Validation (50% minimum)

- Input validation and sanitization
- Credential handling and security
- Error handling and recovery
- Current: 60.2% validation, 93.1% credentials ✅

#### Priority 3 - Integration & Edge Cases (30% minimum)

- Cross-component integration
- Error propagation and recovery
- Performance under load
- Current: 26 integration tests ✅

### Coverage Measurement

```bash
# Generate coverage report
npm run test:coverage

# Coverage thresholds in jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 45,
      statements: 45
    },
    './src/nodes/Discord/v2/': {
      branches: 60,
      functions: 70,
      lines: 65,
      statements: 65
    }
  }
};
```

## Continuous Integration

### Automated Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Quality Gates

1. **All tests must pass**: Zero failing tests allowed
2. **Coverage thresholds**: Must meet minimum coverage requirements
3. **No type errors**: TypeScript compilation must succeed
4. **Lint compliance**: All ESLint rules must pass
5. **Security tests**: All security tests must pass
6. **Performance tests**: No memory leaks or excessive resource usage

## Debugging Test Issues

### Common Test Failures

1. **Mock Configuration Issues**

   ```typescript
   // Problem: Mock not properly configured
   mockClient.guilds.fetch.mockResolvedValue(undefined)

   // Solution: Return proper mock structure
   mockClient.guilds.fetch.mockResolvedValue(createMockGuild())
   ```

2. **Async/Promise Handling**

   ```typescript
   // Problem: Not waiting for async operations
   test('should handle async operation', () => {
     const result = asyncOperation() // Missing await
     expect(result).toBe(expected)
   })

   // Solution: Proper async/await usage
   test('should handle async operation', async () => {
     const result = await asyncOperation()
     expect(result).toBe(expected)
   })
   ```

3. **Memory Leaks in Tests**

   ```typescript
   // Problem: Not cleaning up resources
   test('should create collector', () => {
     const collector = createInteractionCollector()
     // No cleanup
   })

   // Solution: Proper cleanup
   test('should create collector', () => {
     const collector = createInteractionCollector()

     afterEach(() => {
       collector.stop()
     })
   })
   ```

### Test Debugging Tools

```typescript
// Enable debug logging in tests
process.env.DEBUG = 'discord:*'
process.env.NODE_ENV = 'test'

// Custom test utilities
function debugTestState(testName: string, state: any): void {
  if (process.env.DEBUG_TESTS) {
    console.log(`[${testName}] State:`, JSON.stringify(state, null, 2))
  }
}
```

## Test Maintenance

### Regular Test Updates

1. **Monthly Review**: Review test coverage and identify gaps
2. **Dependency Updates**: Update Jest and testing utilities
3. **Mock Alignment**: Ensure mocks match Discord.js API changes
4. **Performance Review**: Monitor test execution time and optimize
5. **Security Updates**: Add new security test cases for emerging threats

### Test Documentation

```typescript
/**
 * Tests Discord member ban operation with comprehensive validation
 *
 * @category Integration
 * @priority High
 * @covers Member operations, error handling, audit logging
 * @requires Discord.js client, guild permissions
 */
test('should execute member ban with audit log', async () => {
  // Test implementation...
})
```

This comprehensive testing framework ensures high quality, reliability, and maintainability of the Discord integration
while providing excellent developer experience and debugging capabilities.
