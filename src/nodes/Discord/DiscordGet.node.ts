import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow'
import { VersionedNodeType } from 'n8n-workflow'

import { DiscordGetV2 } from './v2/DiscordGetV2.node'

export class DiscordGet extends VersionedNodeType {
  constructor() {
    const baseDescription: INodeTypeBaseDescription = {
      displayName: 'Discord Get',
      name: 'discordGet',
      icon: 'file:discord.svg',
      group: ['transform'],
      subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
      description: 'Fetch data from Discord (channels, messages, users, guilds, etc.)',
      defaultVersion: 2,
    }

    const nodeVersions: IVersionedNodeType['nodeVersions'] = {
      2: new DiscordGetV2(baseDescription),
    }

    super(nodeVersions, baseDescription)
  }
}
