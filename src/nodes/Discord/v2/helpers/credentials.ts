import { GatewayIntentBits, REST, WebhookClient } from 'discord.js'
import type { Client } from 'discord.js'
import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { getDiscordClient as getPooledDiscordClient } from '../../shared/client/discord-client-manager'

export interface IDiscordCredentials {
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
 * Get Discord credentials based on authentication type
 */
export async function getDiscordCredentials(this: IExecuteFunctions): Promise<IDiscordCredentials> {
  const authentication = this.getNodeParameter('authentication', 0) as string

  switch (authentication) {
    case 'botToken': {
      const credentials = await this.getCredentials('discordBotApi')
      return {
        type: 'botToken',
        token: credentials.botToken as string,
      }
    }

    case 'oAuth2': {
      const credentials = await this.getCredentials('discordOAuth2Api')
      return {
        type: 'oAuth2',
        clientId: credentials.clientId as string,
        clientSecret: credentials.clientSecret as string,
        botToken: credentials.botToken as string,
      }
    }

    case 'webhook': {
      const credentials = await this.getCredentials('discordWebhookApi')
      return {
        type: 'webhook',
        webhookUri: credentials.webhookUri as string,
      }
    }

    case 'custom': {
      const credentials = await this.getCredentials('discordApi')
      return {
        type: 'custom',
        token: credentials.token as string,
        clientId: credentials.clientId as string,
        apiKey: credentials.apiKey as string,
        baseUrl: credentials.baseUrl as string,
      }
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown authentication type: ${authentication}`)
  }
}

/**
 * Create a Discord client based on credentials
 */
export async function createDiscordClient(
  this: IExecuteFunctions,
  credentials?: IDiscordCredentials,
): Promise<Client | null> {
  if (!credentials) {
    credentials = await getDiscordCredentials.call(this)
  }

  // For webhook-only operations, we don't need a full client
  if (credentials.type === 'webhook') {
    return null
  }

  const token = credentials.token || credentials.botToken
  if (!token) {
    throw new NodeOperationError(this.getNode(), 'Bot token is required for Discord client operations')
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
  })

  await client.login(token)
  return client
}

/**
 * Create a Discord webhook client
 */
export function createWebhookClient(webhookUri: string): WebhookClient {
  return new WebhookClient({ url: webhookUri })
}

/**
 * Create a Discord REST client
 */
export function createRestClient(token: string): REST {
  return new REST({ version: '10' }).setToken(token)
}
