/**
 * V2 credential handling
 *
 * V2 operations use the standard n8n `discordBotApi` credential type,
 * which matches the built-in n8n Discord nodes. V1 continues to use
 * `discordApi` (IPC bot token + n8n API key) unchanged.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js'
import type { ICredentialDataDecryptedObject, IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Discord Bot API Credentials Interface
 * Maps to the standard n8n `discordBotApi` credential type.
 */
export interface IDiscordBotCredentials extends ICredentialDataDecryptedObject {
  botToken: string
}

/**
 * V2 Discord credentials shape returned by getV2DiscordCredentials.
 * V2 nodes exclusively use `discordBotApi`, so only `token` is required.
 */
export interface IV2DiscordCredentials {
  token: string
}

/**
 * Fetch and validate Discord Bot API credentials for V2 operations.
 *
 * V2 nodes declare only the `discordBotApi` credential, which is the same
 * type used by the built-in n8n Discord nodes. This keeps credential
 * management consistent across the n8n ecosystem.
 *
 * @returns Validated credentials with a non-empty bot token
 * @throws NodeOperationError when the bot token is missing or empty
 */
export async function getV2DiscordCredentials(this: IExecuteFunctions): Promise<IV2DiscordCredentials> {
  const credentials = (await this.getCredentials('discordBotApi')) as IDiscordBotCredentials

  if (!credentials.botToken) {
    throw new NodeOperationError(this.getNode(), 'Bot token is required for Discord V2 operations', {
      description:
        'Configure your Discord Bot API credentials with a valid bot token from the Discord Developer Portal.',
    })
  }

  return { token: credentials.botToken }
}

/**
 * Create a Discord.js client for V2 operations using the shared connection pool.
 *
 * The pool prevents duplicate logins for the same token and handles reference
 * counting so clients are only destroyed when no operations are using them.
 *
 * @param credentials - V2 credentials from getV2DiscordCredentials
 * @returns A connected Discord.js Client instance
 * @throws NodeOperationError when the client cannot be created or logged in
 */
export async function createV2DiscordClient(
  this: IExecuteFunctions,
  credentials?: IV2DiscordCredentials,
): Promise<Client> {
  if (!credentials) {
    credentials = await getV2DiscordCredentials.call(this)
  }

  // Phase 3.1.1: Use optimized connection pooling
  // Import here to avoid circular dependencies
  const { getDiscordClient } = await import('../../shared')

  try {
    const client = await getDiscordClient({
      token: credentials.token,
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
