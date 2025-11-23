/**
 * v2-specific credential handling
 *
 * V2 operations prioritize core n8n Discord credentials over custom legacy credentials
 * to maintain compatibility with standard n8n Discord integrations.
 */

import { Client, GatewayIntentBits, Partials, WebhookClient } from 'discord.js'
import type { ICredentialDataDecryptedObject, IExecuteFunctions } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

/**
 * Discord Bot API Credentials Interface
 * Maps to discordBotApi credential type
 */
export interface IDiscordBotCredentials extends ICredentialDataDecryptedObject {
  botToken: string
}

/**
 * Discord OAuth2 API Credentials Interface
 * Maps to discordOAuth2Api credential type
 */
export interface IDiscordOAuth2Credentials extends ICredentialDataDecryptedObject {
  clientId: string
  clientSecret: string
  botToken: string
}

/**
 * Discord Webhook API Credentials Interface
 * Maps to discordWebhookApi credential type
 */
export interface IDiscordWebhookCredentials extends ICredentialDataDecryptedObject {
  webhookUri: string
}

/**
 * Discord Custom API Credentials Interface
 * Maps to discordApi credential type (legacy)
 */
export interface IDiscordCustomCredentials extends ICredentialDataDecryptedObject {
  token: string
}

export interface IV2DiscordCredentials {
  type: 'botToken' | 'oAuth2' | 'webhook' | 'custom'
  token?: string
  botToken?: string
  clientId?: string
  clientSecret?: string
  webhookUri?: string
  apiKey?: string
  baseUrl?: string
}

/**
 * Get Discord credentials for v2 operations - prioritizes core n8n credentials
 *
 * Enhanced with explicit type interfaces for better type safety and validation.
 * Validates required fields are present before returning credentials.
 */
export async function getV2DiscordCredentials(this: IExecuteFunctions): Promise<IV2DiscordCredentials> {
  const authentication = this.getNodeParameter('authentication', 0) as string

  switch (authentication) {
    case 'botToken': {
      // Use core n8n discordBotApi credentials
      const credentials = (await this.getCredentials('discordBotApi')) as IDiscordBotCredentials
      if (!credentials.botToken) {
        throw new NodeOperationError(this.getNode(), 'Bot token is required for Discord Bot API authentication', {
          description: 'Please configure your Discord Bot API credentials with a valid bot token.',
        })
      }
      return {
        type: 'botToken',
        token: credentials.botToken,
      }
    }

    case 'oAuth2': {
      // Use core n8n discordOAuth2Api credentials
      const credentials = (await this.getCredentials('discordOAuth2Api')) as IDiscordOAuth2Credentials
      if (!credentials.clientId || !credentials.clientSecret || !credentials.botToken) {
        throw new NodeOperationError(
          this.getNode(),
          'Client ID, Client Secret, and Bot Token are required for OAuth2 authentication',
          {
            description: 'Please configure your Discord OAuth2 API credentials with all required fields.',
          },
        )
      }
      return {
        type: 'oAuth2',
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        botToken: credentials.botToken,
      }
    }

    case 'webhook': {
      // Use core n8n discordWebhookApi credentials
      const credentials = (await this.getCredentials('discordWebhookApi')) as IDiscordWebhookCredentials
      if (!credentials.webhookUri) {
        throw new NodeOperationError(this.getNode(), 'Webhook URI is required for Discord Webhook API authentication', {
          description: 'Please configure your Discord Webhook API credentials with a valid webhook URL.',
        })
      }
      return {
        type: 'webhook',
        webhookUri: credentials.webhookUri,
      }
    }

    case 'custom': {
      // Fallback to custom credentials for backward compatibility
      const credentials = (await this.getCredentials('discordApi')) as IDiscordCustomCredentials
      if (!credentials.token) {
        throw new NodeOperationError(this.getNode(), 'Token is required for custom Discord API authentication', {
          description: 'Please configure your custom Discord API credentials with a valid token.',
        })
      }
      return {
        type: 'custom',
        token: credentials.token as string,
        clientId: typeof credentials.clientId === 'string' ? credentials.clientId : undefined,
        apiKey: typeof credentials.apiKey === 'string' ? credentials.apiKey : undefined,
        baseUrl: typeof credentials.baseUrl === 'string' ? credentials.baseUrl : undefined,
      }
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown authentication type: ${authentication}`)
  }
}

/**
 * Create a Discord client for v2 operations using core n8n credentials
 */
export async function createV2DiscordClient(
  this: IExecuteFunctions,
  credentials?: IV2DiscordCredentials,
): Promise<Client | null> {
  if (!credentials) {
    credentials = await getV2DiscordCredentials.call(this)
  }

  // For webhook-only operations, we don't need a full client
  if (credentials.type === 'webhook') {
    return null
  }

  const token = credentials.token || credentials.botToken
  if (!token) {
    throw new NodeOperationError(this.getNode(), 'Bot token is required for Discord client operations')
  }

  // Phase 3.1.1: Use optimized connection pooling
  // Import here to avoid circular dependencies
  const { getDiscordClient } = await import('../../shared')

  try {
    const client = await getDiscordClient({
      token,
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    })

    return client
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to create Discord client: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Create a Discord webhook client for v2 operations
 */
export async function createV2WebhookClient(this: IExecuteFunctions, webhookUri?: string): Promise<WebhookClient> {
  if (!webhookUri) {
    const credentials = await getV2DiscordCredentials.call(this)
    if (credentials.type !== 'webhook' || !credentials.webhookUri) {
      throw new NodeOperationError(this.getNode(), 'Webhook URI is required for webhook operations')
    }
    webhookUri = credentials.webhookUri
  }

  return new WebhookClient({ url: webhookUri })
}

/**
 * Validate that v2 operations are using core n8n credentials
 */
export async function validateV2Credentials(this: IExecuteFunctions): Promise<void> {
  const authentication = this.getNodeParameter('authentication', 0) as string
  const credentials = await getV2DiscordCredentials.call(this)

  // Log credential type being used for debugging
  LoggerProxy.debug(`[v2] Using ${credentials.type} credentials for authentication: ${authentication}`)

  // Warn if using legacy custom credentials in v2
  if (credentials.type === 'custom') {
    LoggerProxy.warn(
      '[v2] Using legacy custom credentials. Consider migrating to core n8n Discord credentials for better integration.',
    )
  }
}

/**
 * Release a V2 Discord client back to the pool by client instance
 */
export async function releaseV2DiscordClientByInstance(client?: Client | null): Promise<void> {
  if (!client) return
  // Avoid circular import - import the shared client manager here
  const { default: DiscordClientManager } = await import('../../shared/client/discord-client-manager')
  const manager = DiscordClientManager.getInstance()
  const token = manager.getTokenForClient(client)
  if (token) {
    manager.releaseClient(token)
  }
}
