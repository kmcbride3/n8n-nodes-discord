import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow'

export class DiscordOAuth2Api implements ICredentialType {
  name = 'discordOAuth2Api'
  displayName = 'Discord OAuth2 API'
  documentationUrl = 'discord'

  properties: INodeProperties[] = [
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Discord application Client ID from the Discord Developer Portal',
    },
    {
      displayName: 'Client Secret',
      name: 'clientSecret',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        password: true,
      },
      description: 'Your Discord application Client Secret from the Discord Developer Portal',
    },
    {
      displayName: 'Bot Token',
      name: 'botToken',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        password: true,
      },
      description: 'Your Discord bot token from the Discord Developer Portal',
    },
  ]

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bot {{$credentials.botToken}}',
      },
    },
  }

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://discord.com/api/v10/',
      url: '/users/@me/guilds',
    },
  }
}
