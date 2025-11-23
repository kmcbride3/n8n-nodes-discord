import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow'
import { VersionedNodeType } from 'n8n-workflow'

import { DiscordV1 } from './v1/DiscordV1.node'
import { DiscordV2 } from './v2/DiscordV2.node'

// Re-export interfaces for compatibility
export type {
  IDiscordNodeActionParameters,
  IDiscordNodeMessageParameters,
  IDiscordNodePromptParameters,
} from './v1/DiscordV1.node'

export class Discord extends VersionedNodeType {
  constructor() {
    const baseDescription: INodeTypeBaseDescription = {
      displayName: 'Discord Send',
      name: 'discord',
      icon: 'file:discord.svg',
      group: ['output'],
      subtitle: '={{$parameter["type"] || "message"}}',
      description: 'Sends messages, embeds and prompts to Discord',
      defaultVersion: 2,
    }

    const nodeVersions: IVersionedNodeType['nodeVersions'] = {
      1: new DiscordV1(baseDescription),
      2: new DiscordV2(baseDescription),
    }

    super(nodeVersions, baseDescription)
  }
}
