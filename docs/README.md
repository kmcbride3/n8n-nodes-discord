# n8n-### 🚀 Quic### 📁 [Development](development/)

Technical documentation for contributors and maintainers:

- **[Getting Started](development/getting-started.md)** - Setup, installation, and first steps
- **[Architecture](architecture.md)** - Complete architecture guide including V1 vs V2, design principles, and best
  practices
- **[Testing](development/testing.md)** - Testing guidelines and best practices
- **[V2 Visual Guide](development/v2-architecture-visual-guide.md)** - Architecture diagrams
- **[Migration Examples](development/migration-examples.md)** - V1 to V2 code migratione

- **[FAQ](FAQ.md)** - Frequently asked questions and quick answers ⭐
- **[API Reference](architecture.md#api-reference)** - Complete API documentation for all operations 📚
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project 🤝
- **[V1 to V2 Migration](migration/v1-to-v2.md)** - Complete migration guide for existing users 📋-discord Documentation

Complete documentation for the Discord integration for n8n, covering development, operations, and troubleshooting.

## 📚 Documentation Structure

### � Quick Reference

- **[FAQ](FAQ.md)** - Frequently asked questions and quick answers ⭐
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project 🤝
- **[V1 to V2 Migration](migration/v1-to-v2.md)** - Complete migration guide for existing users 📋

### �📁 [Development](development/)

Technical documentation for contributors and maintainers:

- **[Getting Started](development/getting-started.md)** - Setup, installation, and first steps
- **[Architecture](architecture.md)** - Architecture overview, V1 vs V2, stateless design
- **[Discord Integration](architecture.md)** - Discord.js implementation patterns
- **[Testing](development/testing.md)** - Testing guidelines and best practices
- **[V2 Visual Guide](development/v2-architecture-visual-guide.md)** - Architecture diagrams
- **[Migration Examples](development/migration-examples.md)** - V1 to V2 code migration

### 📁 [Operations](operations/)

Guides for developing operations and security:

- **[V2 Operations Development](operations/v2-operations.md)** - Creating new V2 operations
- **[Webhook Security](architecture.md#webhook-security)** - Security implementation guide

### 📁 [Troubleshooting](troubleshooting/)

Problem resolution and optimization:

- **[Common Errors](troubleshooting/common-errors.md)** - Error resolution guide
- **[Performance](architecture.md#performance-optimization)** - Performance optimization guide

## 🚀 Quick Start

### New to This Project?

1. Read **[Getting Started](development/getting-started.md)** for setup
2. Review **[Architecture](architecture.md)** to understand the system
3. Check **[V2 Operations](operations/v2-operations.md)** to start developing

### Need Help?

- **Errors?** → [Common Errors](troubleshooting/common-errors.md)
- **Performance Issues?** → [Performance Guide](architecture.md#performance-optimization)
- **Security Questions?** → [Webhook Security](architecture.md#webhook-security)
- **Performance Issues**: Use [Performance Optimization](architecture.md#performance-optimization) for performance
  problems
- **Architecture Issues**: Refer to [Architecture Guide](architecture.md) for design decisions

## Key Concepts

### V1 vs V2 Architecture

**V1 Bot Architecture** (Legacy, Maintained):

- Persistent WebSocket connection to Discord
- Real-time event handling via IPC
- Higher resource usage but comprehensive event coverage
- Best for: Discord event triggers, real-time monitoring

**V2 Webhook Architecture** (Modern, Recommended):

- Stateless webhook-based operations
- On-demand client creation with connection pooling
- Lower resource usage and better scalability
- Best for: Discord API operations, slash commands, message management

### Built-ins First Approach

The integration follows a strict hierarchy:

1. **🥇 Discord.js Native Methods First** - Always use Discord.js built-in client methods
2. **🥈 Discord.js REST API** - When native methods unavailable, use Discord.js REST client
3. **🥉 n8n Built-ins** - Use n8n error types, credential system, and workflow patterns
4. **🛠️ Node.js Built-ins** - Use Node.js native modules before external packages
5. **🏁 Custom Logic** - Only when built-ins cannot handle the requirement

### Security First Design

All operations implement comprehensive security:

- **Input Validation**: Discord snowflake validation, content sanitization
- **Authentication Security**: Token validation, OAuth2 flows, signature verification
- **Injection Prevention**: SQL injection, XSS, and script injection protection
- **Rate Limiting**: Built-in Discord.js rate limiting with monitoring
- **Error Security**: Sensitive information masking, secure error handling

## Development Standards

### Code Quality

- **Type Safety**: 100% TypeScript coverage with strict mode
- **Testing**: Comprehensive test coverage with Jest framework
- **Error Handling**: n8n error types with Discord.js context
- **Documentation**: Complete JSDoc comments and examples
- **Performance**: Optimized client management and resource usage

### Testing Standards

- **Priority 1 - Core Operations**: 40%+ coverage (Current: 56.55%)
- **Priority 2 - Security & Validation**: 50%+ coverage (Current: 60.2% validation, 93.1% credentials)
- **Priority 3 - Integration Testing**: 30% coverage (Current: 26 integration tests)
- **Security Testing**: Comprehensive injection prevention and validation boundary testing

### Security Standards

- **Authentication**: Multi-layer authentication with Discord token validation
- **Input Validation**: Comprehensive sanitization and validation
- **Error Handling**: Secure error messages without sensitive data exposure
- **Monitoring**: Security event logging and anomaly detection
- **Testing**: Dedicated security test suites with attack vector coverage

## Performance Metrics

### Current Achievements

Build / Test status:

- ![build status](https://img.shields.io/badge/build-passing-brightgreen)
- ![tests](https://img.shields.io/badge/tests-passing-brightgreen)
- ![coverage](https://img.shields.io/badge/coverage-unknown-lightgrey)

Note: numeric test and coverage metrics are maintained in CI and reported via the above badges.

### Performance Optimizations

- **Connection Pooling**: Shared client management with automatic cleanup
- **Memory Management**: Optimized collector lifecycle and cache configuration
- **Rate Limiting**: Discord.js built-in rate limiting with monitoring
- **Batch Operations**: Efficient API usage patterns
- **Error Recovery**: Fast failure detection and recovery

## Contributing Guidelines

### Before Contributing

1. **Read Architecture Guide**: Understand the V1/V2 patterns and design decisions
2. **Follow Built-ins First**: Always check Discord.js, n8n, and Node.js built-ins first
3. **Implement Security**: Use security patterns from the webhook security guide
4. **Add Tests**: Include comprehensive unit and integration tests
5. **Document Changes**: Update relevant documentation sections

### Code Submission Checklist

- [ ] **Type Safety**: No `any` types, strict TypeScript compliance
- [ ] **Testing**: Unit tests, integration tests, and security tests added
- [ ] **Error Handling**: Proper n8n error types with Discord.js context
- [ ] **Security**: Input validation, sanitization, and injection prevention
- [ ] **Performance**: Optimal client management and resource usage
- [ ] **Documentation**: JSDoc comments and updated guides

### Security Review Checklist

- [ ] **Input Validation**: All inputs validated and sanitized
- [ ] **Authentication**: Proper token validation and signature verification
- [ ] **Error Handling**: No sensitive information in error messages
- [ ] **Rate Limiting**: Appropriate rate limiting and DoS protection
- [ ] **Monitoring**: Security events logged appropriately
- [ ] **Testing**: Security test cases cover attack vectors

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Dependency Updates**: Keep Discord.js and n8n-workflow updated
2. **Security Audits**: Regular security reviews and vulnerability assessments
3. **Performance Monitoring**: Track metrics and optimize based on usage
4. **Documentation Updates**: Keep guides current with implementation changes
5. **Test Coverage**: Maintain and improve test coverage metrics

### Version Compatibility

- **Discord.js**: v14.x (latest stable)
- **n8n-workflow**: Latest stable version
- **Node.js**: 18.x or higher
- **TypeScript**: 5.x or higher
- **Jest**: 30.x or higher

## Support and Resources

### Internal Resources

- **Architecture Guide**: For design decisions and patterns
- **Testing Documentation**: For test setup and patterns
- **Error Resolution**: For troubleshooting common issues
- **Performance Guide**: For optimization strategies

### External Resources

- **Discord Developer Portal**: <https://discord.com/developers/docs>
- **Discord.js Documentation**: <https://discord.js.org/#/docs>
- **n8n Documentation**: <https://docs.n8n.io>
- **Discord API Status**: <https://discordstatus.com>

### Getting Help

When reporting issues or requesting help:

1. **Check Documentation**: Review relevant guides first
2. **Provide Context**: Include full error messages and configuration
3. **Include Environment**: Discord.js version, n8n version, Node.js version
4. **Reproduction Steps**: Clear steps to reproduce the issue
5. **Expected Behavior**: What you expected vs what actually happened

## Changelog and Updates

This documentation is maintained alongside the codebase. Major updates include:

- **Phase 1**: Type safety enforcement and Discord.js v14 migration
- **Phase 2**: Architecture improvements and code deduplication
- **Phase 3**: Performance optimization and comprehensive testing
- **Documentation Phase**: Complete documentation suite creation

For specific implementation changes, refer to the project's CHANGELOG.md and version-specific documentation updates.

---

**Last Updated**: September 28, 2025  
**Documentation Version**: 1.0  
**Compatible with**: Discord Integration v2.x
