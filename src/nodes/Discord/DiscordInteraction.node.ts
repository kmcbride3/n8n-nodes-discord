import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow'
import { VersionedNodeType } from 'n8n-workflow'

import { DiscordInteractionV2 } from './v2/DiscordInteractionV2.node'

export class DiscordInteraction extends VersionedNodeType {
  constructor() {
    const baseDescription: INodeTypeBaseDescription = {
      displayName: 'Discord Interaction',
      name: 'discordInteraction',
      icon: 'file:discord.svg',
      group: ['trigger'],
      subtitle: '={{$parameter["interactionType"] || "Discord interaction"}}',
      description: 'Handle Discord interactions (buttons, select menus, modals, commands)',
      defaultVersion: 2,
    }

    const nodeVersions: IVersionedNodeType['nodeVersions'] = {
      2: new DiscordInteractionV2(baseDescription),
    }

    super(nodeVersions, baseDescription)
  }
}
