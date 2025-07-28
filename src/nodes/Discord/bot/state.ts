import { Collection } from 'discord.js'

export interface ITrigger {
  webhookId: string
  roleIds: string[]
  roleUpdateIds: string[]
  type: string
  channelIds?: string[]
  pattern?: string
  value?: string
  name?: string
  description?: string
  commandFieldDescription?: string
  commandFieldRequired?: boolean
  commandFieldType?: string
  placeholder?: string
  interactionMessageId?: string
  active?: boolean
  botMention?: boolean
  caseSensitive?: boolean
  presence?: string
}

export interface IExecutionMatching {
  channelId: string
  userId?: string
  placeholderId?: string
}

export interface ButtonOption {
  label: string
  value: string
  style?: number
  emoji?: string
  disabled?: boolean
}

export interface SelectOption {
  label: string
  value: string
  description?: string
  emoji?: string
  default?: boolean
}

export interface IPromptData {
  executionId: string
  content: string
  value?: string | null
  userId?: string
  userName?: string
  userTag?: string
  channelId?: string
  messageId?: string
  restrictToRoles?: boolean
  restrictToTriggeringUser?: boolean
  mentionRoles?: string[]
  buttons?: {
    button: ButtonOption[]
    placeholder?: string
  }
  select?: {
    select: SelectOption[]
    placeholder?: string
    minValues?: number
    maxValues?: number
  }
  buttons_row?: number
  select_row?: number
  timeout?: number
  persistent?: boolean
  placeholder?: string
  colorHex?: string
  options?: {
    [key: string]: unknown
    delay?: number
    rowButtons?: number
    largeButtons?: boolean
  }
}

export default {
  promptDataMap: new Collection<string, IPromptData>(),
  ready: false,
  login: false,
  clientId: '',
  token: '',
  testMode: false,
  baseUrl: '',
  autoLogs: false,
  autoLogsChannelId: '',
  logs: [] as string[],
  triggers: {} as Record<string, ITrigger>,
  channels: {} as Record<string, ITrigger[]>,
  executionMatching: new Collection<string, IExecutionMatching>(),
  placeholderMatching: new Collection<string, string>(),
  placeholderWaiting: new Collection<string, boolean>(),
  promptData: new Collection<string, IPromptData>(),
  lastAction: '',
  roles: [] as string[],
  channelList: [] as string[],
}
