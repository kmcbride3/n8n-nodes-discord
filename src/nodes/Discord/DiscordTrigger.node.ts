import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow'
import { VersionedNodeType } from 'n8n-workflow'

import { DiscordTriggerV1 } from './v1/DiscordTriggerV1.node'
import { DiscordTriggerV2 } from './v2/DiscordTriggerV2.node'

export class DiscordTrigger extends VersionedNodeType {
  constructor() {
    const baseDescription: INodeTypeBaseDescription = {
      displayName: 'Discord Trigger',
      name: 'discordTrigger',
      icon: 'file:discord.svg',
      group: ['trigger'],
      subtitle: '={{$parameter["event"] || "Discord event"}}',
      description: 'Trigger based on Discord events',
      defaultVersion: 2,
    }

    const nodeVersions: IVersionedNodeType['nodeVersions'] = {
      1: new DiscordTriggerV1(baseDescription),
      2: new DiscordTriggerV2(baseDescription),
    }

    super(nodeVersions, baseDescription)
  }
}
