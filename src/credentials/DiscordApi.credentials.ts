import { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow'

export class DiscordApi implements ICredentialType {
  name = 'discordApi'

  displayName = 'Discord App'
  documentationUrl = 'https://github.com/kmcbride3/n8n-nodes-discord'

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bot {{$credentials.token}}',
      },
    },
  }

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://discord.com/api/v10',
      url: '/oauth2/@me',
      method: 'GET',
    },
  }
  properties: INodeProperties[] = [
    {
      displayName: 'Client ID',
      name: 'clientId',
      description: 'The OAuth2 client ID of the Discord App (17-19 digit snowflake ID)',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        password: false,
      },
    },
    {
      displayName: 'Bot Token',
      name: 'token',
      description: 'The bot token of the Discord App (starts with your bot ID)',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        password: true,
      },
    },
    {
      displayName: 'n8n API key',
      name: 'apiKey',
      description: 'The API key of the n8n server for workflow triggering',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        password: true,
      },
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      description:
        '⚠️ SECURITY: Must use HTTPS in production! The API URL of your n8n instance for workflow triggering.',
      type: 'string',
      default: '',
      required: true,
      placeholder: 'https://n8n.example.com/api/v1',
      typeOptions: {
        password: false,
      },
      hint: 'Use HTTPS to protect your API keys in transit. HTTP is only acceptable for local development.',
    },
  ]
}
