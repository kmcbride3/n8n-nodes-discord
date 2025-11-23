/**
 * v1-specific credential handling
 *
 * V1 operations continue using the original custom Discord credentials
 * to maintain backward compatibility and avoid breaking existing workflows.
 */

import { type IExecuteFunctions, LoggerProxy, NodeOperationError } from 'n8n-workflow'

export interface IV1DiscordCredentials {
  type: 'custom'
  token: string
  clientId: string
  apiKey: string
  baseUrl: string
}

/**
 * Get Discord credentials for v1 operations - uses only custom credentials
 */
export async function getV1DiscordCredentials(this: IExecuteFunctions): Promise<IV1DiscordCredentials> {
  // v1 only supports custom credentials for backward compatibility
  const credentials = await this.getCredentials('discordApi')

  return {
    type: 'custom',
    token: credentials.token as string,
    clientId: credentials.clientId as string,
    apiKey: credentials.apiKey as string,
    baseUrl: credentials.baseUrl as string,
  }
}

/**
 * Validate that v1 operations are using the correct legacy credentials
 */
export async function validateV1Credentials(this: IExecuteFunctions): Promise<void> {
  const credentials = await getV1DiscordCredentials.call(this)

  // Log credential type being used for debugging with n8n LoggerProxy
  LoggerProxy.debug('V1 Discord credentials loaded', {
    credentialType: credentials.type,
    hasToken: !!credentials.token,
    hasClientId: !!credentials.clientId,
    hasApiKey: !!credentials.apiKey,
  })

  // Ensure all required fields are present
  if (!credentials.token || !credentials.clientId || !credentials.apiKey) {
    throw new NodeOperationError(this.getNode(), 'v1 operations require complete custom Discord credentials')
  }
}
