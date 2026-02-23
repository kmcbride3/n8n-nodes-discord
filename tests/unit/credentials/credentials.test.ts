/**
 * Credential Testing - P0 Priority
 *
 * Comprehensive testing of all Discord credential types to ensure:
 * - Proper credential structure and validation
 * - Authentication header generation
 * - Credential test endpoints
 * - Field validation and security
 *
 * Target: 90%+ coverage for security-critical credential handling
 */

import { DiscordApi } from '../../../src/credentials/DiscordApi.credentials'
import { DiscordBotApi } from '../../../src/credentials/DiscordBotApi.credentials'
import { DiscordOAuth2Api } from '../../../src/credentials/DiscordOAuth2Api.credentials'
import { DiscordWebhookApi } from '../../../src/credentials/DiscordWebhookApi.credentials'

describe('Discord Credentials - Comprehensive Testing', () => {
  describe('DiscordApi Credentials', () => {
    let credentials: DiscordApi

    beforeEach(() => {
      credentials = new DiscordApi()
    })

    test('should have correct credential metadata', () => {
      expect(credentials.name).toBe('discordApi')
      expect(credentials.displayName).toBe('Discord App')
      expect(credentials.documentationUrl).toBe('https://github.com/kmcbride3/n8n-nodes-discord')
    })

    test('should define all required properties', () => {
      expect(credentials.properties).toHaveLength(4)
      
      const propertyNames = credentials.properties.map((p) => p.name)
      expect(propertyNames).toEqual(['clientId', 'token', 'apiKey', 'baseUrl'])
    })

    test('should require all fields', () => {
      credentials.properties.forEach((prop) => {
        expect(prop.required).toBe(true)
      })
    })

    test('should mark sensitive fields as password', () => {
      const tokenField = credentials.properties.find((p) => p.name === 'token')
      const apiKeyField = credentials.properties.find((p) => p.name === 'apiKey')
      
      expect(tokenField?.typeOptions?.password).toBe(true)
      expect(apiKeyField?.typeOptions?.password).toBe(true)
    })

    test('should not mark non-sensitive fields as password', () => {
      const clientIdField = credentials.properties.find((p) => p.name === 'clientId')
      const baseUrlField = credentials.properties.find((p) => p.name === 'baseUrl')
      
      expect(clientIdField?.typeOptions?.password).toBe(false)
      expect(baseUrlField?.typeOptions?.password).toBe(false)
    })

    test('should configure authentication headers correctly', () => {
      expect(credentials.authenticate).toBeDefined()
      expect(credentials.authenticate.type).toBe('generic')
      expect(credentials.authenticate.properties?.headers).toEqual({
        Authorization: '=Bot {{$credentials.token}}',
      })
    })

    test('should define credential test endpoint', () => {
      expect(credentials.test).toBeDefined()
      expect(credentials.test.request).toEqual({
        baseURL: 'https://discord.com/api/v10',
        url: '/oauth2/@me',
        method: 'GET',
      })
    })

    test('should have security warning for baseUrl', () => {
      const baseUrlField = credentials.properties.find((p) => p.name === 'baseUrl')
      expect(baseUrlField?.description).toContain('HTTPS')
      expect(baseUrlField?.hint).toContain('HTTPS')
    })

    test('should have appropriate placeholder for baseUrl', () => {
      const baseUrlField = credentials.properties.find((p) => p.name === 'baseUrl')
      expect(baseUrlField?.placeholder).toContain('https://')
    })
  })

  describe('DiscordBotApi Credentials', () => {
    let credentials: DiscordBotApi

    beforeEach(() => {
      credentials = new DiscordBotApi()
    })

    test('should have correct credential metadata', () => {
      expect(credentials.name).toBe('discordBotApi')
      expect(credentials.displayName).toBe('Discord Bot API')
      expect(credentials.documentationUrl).toBe('discord')
    })

    test('should define botToken property', () => {
      expect(credentials.properties).toHaveLength(1)
      
      const botTokenField = credentials.properties[0]
      expect(botTokenField.name).toBe('botToken')
      expect(botTokenField.displayName).toBe('Bot Token')
      expect(botTokenField.type).toBe('string')
      expect(botTokenField.required).toBe(true)
    })

    test('should mark botToken as password', () => {
      const botTokenField = credentials.properties[0]
      expect(botTokenField.typeOptions?.password).toBe(true)
    })

    test('should configure authentication headers correctly', () => {
      expect(credentials.authenticate).toBeDefined()
      expect(credentials.authenticate.type).toBe('generic')
      expect(credentials.authenticate.properties?.headers).toEqual({
        Authorization: '=Bot {{$credentials.botToken}}',
      })
    })

    test('should define credential test endpoint', () => {
      expect(credentials.test).toBeDefined()
      expect(credentials.test.request).toEqual({
        baseURL: 'https://discord.com/api/v10/',
        url: '/users/@me/guilds',
      })
    })

    test('should use secure Discord API endpoint', () => {
      expect(credentials.test.request.baseURL).toContain('https://')
    })
  })

  describe('DiscordOAuth2Api Credentials', () => {
    let credentials: DiscordOAuth2Api

    beforeEach(() => {
      credentials = new DiscordOAuth2Api()
    })

    test('should have correct credential metadata', () => {
      expect(credentials.name).toBe('discordOAuth2Api')
      expect(credentials.displayName).toBe('Discord OAuth2 API')
      expect(credentials.documentationUrl).toBe('discord')
    })

    test('should define all OAuth2 properties', () => {
      expect(credentials.properties).toHaveLength(3)
      
      const propertyNames = credentials.properties.map((p) => p.name)
      expect(propertyNames).toEqual(['clientId', 'clientSecret', 'botToken'])
    })

    test('should require all fields', () => {
      credentials.properties.forEach((prop) => {
        expect(prop.required).toBe(true)
      })
    })

    test('should mark clientSecret and botToken as password', () => {
      const clientSecretField = credentials.properties.find((p) => p.name === 'clientSecret')
      const botTokenField = credentials.properties.find((p) => p.name === 'botToken')
      
      expect(clientSecretField?.typeOptions?.password).toBe(true)
      expect(botTokenField?.typeOptions?.password).toBe(true)
    })

    test('should not mark clientId as password', () => {
      const clientIdField = credentials.properties.find((p) => p.name === 'clientId')
      expect(clientIdField?.typeOptions?.password).toBeUndefined()
    })

    test('should have descriptive field descriptions', () => {
      credentials.properties.forEach((prop) => {
        expect(prop.description).toBeDefined()
        expect(prop.description).toContain('Discord')
        expect(prop.description).toContain('Developer Portal')
      })
    })

    test('should configure authentication headers correctly', () => {
      expect(credentials.authenticate).toBeDefined()
      expect(credentials.authenticate.type).toBe('generic')
      expect(credentials.authenticate.properties?.headers).toEqual({
        Authorization: '=Bot {{$credentials.botToken}}',
      })
    })

    test('should define credential test endpoint', () => {
      expect(credentials.test).toBeDefined()
      expect(credentials.test.request).toEqual({
        baseURL: 'https://discord.com/api/v10/',
        url: '/users/@me/guilds',
      })
    })

    test('should use correct OAuth2 authentication flow', () => {
      // OAuth2 uses bot token for API authentication
      const authHeader = credentials.authenticate.properties?.headers?.Authorization
      expect(authHeader).toContain('Bot')
      expect(authHeader).toContain('botToken')
    })
  })

  describe('DiscordWebhookApi Credentials', () => {
    let credentials: DiscordWebhookApi

    beforeEach(() => {
      credentials = new DiscordWebhookApi()
    })

    test('should have correct credential metadata', () => {
      expect(credentials.name).toBe('discordWebhookApi')
      expect(credentials.displayName).toBe('Discord Webhook')
      expect(credentials.documentationUrl).toBe('discord')
    })

    test('should define webhookUri property', () => {
      expect(credentials.properties).toHaveLength(1)
      
      const webhookField = credentials.properties[0]
      expect(webhookField.name).toBe('webhookUri')
      expect(webhookField.displayName).toBe('Webhook URL')
      expect(webhookField.type).toBe('string')
      expect(webhookField.required).toBe(true)
    })

    test('should mark webhookUri as password', () => {
      const webhookField = credentials.properties[0]
      expect(webhookField.typeOptions?.password).toBe(true)
    })

    test('should have appropriate placeholder', () => {
      const webhookField = credentials.properties[0]
      expect(webhookField.placeholder).toBe('https://discord.com/api/webhooks/ID/TOKEN')
    })

    test('should not define authentication headers (webhook uses URL-based auth)', () => {
      expect((credentials as any).authenticate).toBeUndefined()
    })

    test('should not define test endpoint (webhooks are validated by usage)', () => {
      expect((credentials as any).test).toBeUndefined()
    })

    test('should use secure webhook URL in placeholder', () => {
      const webhookField = credentials.properties[0]
      expect(webhookField.placeholder).toContain('https://')
    })
  })

  describe('Credential Security Validation', () => {
    test('all credentials should use HTTPS endpoints', () => {
      const botApi = new DiscordBotApi()
      const oauth2Api = new DiscordOAuth2Api()
      const api = new DiscordApi()

      expect(botApi.test.request.baseURL).toContain('https://')
      expect(oauth2Api.test.request.baseURL).toContain('https://')
      expect(api.test.request.baseURL).toContain('https://')
    })

    test('all sensitive fields should be marked as password type', () => {
      const api = new DiscordApi()
      const botApi = new DiscordBotApi()
      const oauth2Api = new DiscordOAuth2Api()
      const webhookApi = new DiscordWebhookApi()

      const sensitiveFields = [
        ...api.properties.filter((p) => ['token', 'apiKey'].includes(p.name)),
        ...botApi.properties.filter((p) => p.name === 'botToken'),
        ...oauth2Api.properties.filter((p) => ['clientSecret', 'botToken'].includes(p.name)),
        ...webhookApi.properties.filter((p) => p.name === 'webhookUri'),
      ]

      sensitiveFields.forEach((field) => {
        expect(field.typeOptions?.password).toBe(true)
      })
    })

    test('all credentials should use Discord API v10', () => {
      const botApi = new DiscordBotApi()
      const oauth2Api = new DiscordOAuth2Api()
      const api = new DiscordApi()

      expect(botApi.test.request.baseURL).toContain('/v10')
      expect(oauth2Api.test.request.baseURL).toContain('/v10')
      expect(api.test.request.baseURL).toContain('/v10')
    })

    test('Bot authentication should use correct prefix', () => {
      const api = new DiscordApi()
      const botApi = new DiscordBotApi()
      const oauth2Api = new DiscordOAuth2Api()

      expect(api.authenticate.properties?.headers?.Authorization).toContain('Bot ')
      expect(botApi.authenticate.properties?.headers?.Authorization).toContain('Bot ')
      expect(oauth2Api.authenticate.properties?.headers?.Authorization).toContain('Bot ')
    })
  })

  describe('Credential Type Validation', () => {
    test('all string fields should have string type', () => {
      const credentials = [
        new DiscordApi(),
        new DiscordBotApi(),
        new DiscordOAuth2Api(),
        new DiscordWebhookApi(),
      ]

      credentials.forEach((cred) => {
        cred.properties.forEach((prop) => {
          expect(prop.type).toBe('string')
        })
      })
    })

    test('all credentials should have unique names', () => {
      const credentials = [
        new DiscordApi(),
        new DiscordBotApi(),
        new DiscordOAuth2Api(),
        new DiscordWebhookApi(),
      ]

      const names = credentials.map((c) => c.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    test('all credentials should have display names', () => {
      const credentials = [
        new DiscordApi(),
        new DiscordBotApi(),
        new DiscordOAuth2Api(),
        new DiscordWebhookApi(),
      ]

      credentials.forEach((cred) => {
        expect(cred.displayName).toBeDefined()
        expect(cred.displayName.length).toBeGreaterThan(0)
      })
    })

    test('all credentials should have documentation URLs', () => {
      const credentials = [
        new DiscordApi(),
        new DiscordBotApi(),
        new DiscordOAuth2Api(),
        new DiscordWebhookApi(),
      ]

      credentials.forEach((cred) => {
        expect(cred.documentationUrl).toBeDefined()
        expect(cred.documentationUrl.length).toBeGreaterThan(0)
      })
    })
  })
})
