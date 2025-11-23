# Development Documentation

This directory contains technical documentation for developing and maintaining the n8n-nodes-discord integration.

## �� Documentation Index

### Getting Started

- **[getting-started.md](getting-started.md)** - Quick start guide for new developers

### Architecture

- **[architecture.md](architecture.md)** - Complete architecture guide including V1 vs V2, design principles, best
  practices, and quality standards
- **[v2-architecture-visual-guide.md](v2-architecture-visual-guide.md)** - Visual diagrams and flow charts

### Migration & Examples

- **[migration-examples.md](migration-examples.md)** - Code migration examples from V1 to V2

### Testing & Quality

- **[testing.md](testing.md)** - Testing guidelines, running tests, writing new tests

## 🚀 Quick Start

1. Start with **[getting-started.md](getting-started.md)** for setup instructions
2. Read **[architecture.md](architecture.md)** to understand the system design and best practices
3. Check **[testing.md](testing.md)** before writing code

## 📖 Additional Resources

### For Operations Development

- See **[../operations/v2-operations.md](../operations/v2-operations.md)** for developing new operations
- See **[architecture.md#webhook-security](architecture.md#webhook-security)** for security patterns

### For Troubleshooting

- See **[../troubleshooting/common-errors.md](../troubleshooting/common-errors.md)**
- See **[architecture.md#performance-optimization](architecture.md#performance-optimization)**

# Developer Implementation Patterns: Discord Collector & Performance Troubleshooting

This section consolidates advanced implementation details and developer patterns previously found in the troubleshooting
guide. Use these patterns for optimizing Discord.js collector usage, rate limiting, and memory management in n8n Discord
node development.

---

## Rate Limiting Implementation (Discord.js)

Discord.js automatically handles rate limits and retries with exponential backoff. No custom retry logic is needed for
most workflows.

```typescript
// Discord.js automatically retries with exponential backoff
// No custom retry logic needed
```

Monitor API usage and batch operations to avoid unnecessary rate limit errors. For high-volume workflows, implement
request queuing and monitor rate limit headers:

```text
Response Headers:
- X-RateLimit-Limit: Maximum requests allowed
- X-RateLimit-Remaining: Requests remaining
- X-RateLimit-Reset: When limit resets
- Retry-After: Seconds to wait before retry
```

---

## Collector Timeout & Lifecycle Management

Adjust collector timeout settings for longer interactions:

```typescript
const collector = channel.createMessageComponentCollector({
  filter: (interaction) => interaction.user.id === userId,
  time: 30 * 60 * 1000, // 30 minutes
  max: 1, // Maximum interactions
})
```

Implement proper cleanup to avoid resource leaks:

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

Extend collector lifetime and handle edge cases:

```typescript
collector.on('collect', (interaction) => {
  // Reset timeout on interaction
  collector.resetTimer()

  // Handle interaction
  interaction.reply('Response received!')
})
```

---

## Memory Leak Prevention: Collector Registry & Monitoring

Register and clean up collectors to prevent memory leaks:

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

Monitor memory usage in production:

```typescript
setInterval(() => {
  const usage = process.memoryUsage()
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
  })
}, 60000) // Every minute
```

Implement automatic cleanup on process termination:

```typescript
process.on('SIGINT', () => {
  CollectorManager.cleanup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  CollectorManager.cleanup()
  process.exit(0)
})
```

Use collector limits to avoid excessive resource usage:

```typescript
const collector = channel.createMessageComponentCollector({
  max: 10, // Maximum interactions
  maxUsers: 5, // Maximum unique users
  maxProcessed: 20, // Maximum processed interactions
})
```

---

## Best Practices

- Always dispose collectors properly
- Use collector limits and timeouts
- Monitor memory usage in production
- Implement collector lifecycle management
- Use Discord.js built-in rate limit handling

---

For more advanced troubleshooting, see the main architecture guide and testing documentation.

## 📊 Current Status

- **Tests**: 394/394 passing
- **Code Quality**: 97% built-in usage
- **Architecture**: V2 stateless + V1 bot hybrid
- **Documentation**: Complete and up-to-date
