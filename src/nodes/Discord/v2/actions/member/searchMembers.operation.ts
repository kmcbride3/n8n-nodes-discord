/**
 * SearchMembers Operation
 * Search for members in a guild with various filters
 */

import type { Client, GuildMember } from 'discord.js'
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

import type { IV2DiscordCredentials } from '../../helpers'
import { executeV2OperationWithClient, fetchGuild, simplifyMember, updateDisplayOptions } from '../../helpers'

export const properties = updateDisplayOptions(
  {
    show: {
      resource: ['user'],
      operation: ['searchMembers'],
    },
  },
  [
    {
      displayName: 'Guild ID',
      name: 'guildId',
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the guild to search members in',
    },
    {
      displayName: 'Search Query',
      name: 'searchQuery',
      type: 'string',
      required: true,
      default: '',
      description: 'Search for members by username or nickname (case-insensitive)',
    },
    {
      displayName: 'Limit',
      name: 'limit',
      type: 'number',
      default: 100,
      description: 'Maximum number of members to search (Discord API limit: 1000)',
      typeOptions: {
        minValue: 1,
        maxValue: 1000,
      },
    },
    {
      displayName: 'Filter Options',
      name: 'filterOptions',
      type: 'collection',
      default: {},
      placeholder: 'Add Filter',
      description: 'Additional filters to apply',
      options: [
        {
          displayName: 'Role ID',
          name: 'roleId',
          type: 'string',
          default: '',
          description: 'Filter by members who have this role',
        },
        {
          displayName: 'Has Avatar',
          name: 'hasAvatar',
          type: 'boolean',
          default: false,
          description: 'Filter by members who have set a custom avatar',
        },
        {
          displayName: 'Is Bot',
          name: 'isBot',
          type: 'boolean',
          default: false,
          description: 'Filter by bot accounts',
        },
        {
          displayName: 'Is Boosting',
          name: 'isBoosting',
          type: 'boolean',
          default: false,
          description: 'Filter by members who are boosting the server',
        },
      ],
    },
    {
      displayName: 'Simplify Output',
      name: 'simplify',
      type: 'boolean',
      default: true,
      description: 'Whether to return simplified output or full Discord API response',
    },
  ],
)

interface ISearchMembersCredentials extends IV2DiscordCredentials {
  client: Client
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return executeV2OperationWithClient<ISearchMembersCredentials>(this, {
    getCredentials: async (ctx) => {
      const { createV2DiscordClient, getV2DiscordCredentials, NodeOperationError } = await import('../../helpers')
      const credentials = await getV2DiscordCredentials.call(ctx)
      const client = await createV2DiscordClient.call(ctx, credentials)

      if (!client) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client is required for get operations')
      }

      if (!client.isReady()) {
        throw new NodeOperationError(ctx.getNode(), 'Discord client failed to initialize properly', {
          description: 'The Discord client connection is not ready. Please check your bot token and try again.',
        })
      }

      return { ...credentials, client }
    },
    operation: async (ctx, { client }, itemIndex) => {
      const guildId = ctx.getNodeParameter('guildId', itemIndex) as string
      const searchQuery = ctx.getNodeParameter('searchQuery', itemIndex) as string
      const limit = ctx.getNodeParameter('limit', itemIndex, 100) as number
      const filterOptions = ctx.getNodeParameter('filterOptions', itemIndex, {}) as {
        roleId?: string
        hasAvatar?: boolean
        isBot?: boolean
        isBoosting?: boolean
      }
      const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean

      const guild = await fetchGuild(ctx, client, guildId, itemIndex)

      // Use Discord.js search functionality (searches by username/nickname)
      const members = await guild.members.search({
        query: searchQuery,
        limit,
      })

      // Convert Collection to array
      let filteredMembers = Array.from(members.values())

      // Apply additional filters
      if (filterOptions.roleId) {
        filteredMembers = filteredMembers.filter((member: GuildMember) =>
          member.roles.cache.has(filterOptions.roleId as string),
        )
      }

      if (filterOptions.hasAvatar !== undefined) {
        filteredMembers = filteredMembers.filter(
          (member: GuildMember) => (member.avatar !== null) === filterOptions.hasAvatar,
        )
      }

      if (filterOptions.isBot !== undefined) {
        filteredMembers = filteredMembers.filter((member: GuildMember) => member.user.bot === filterOptions.isBot)
      }

      if (filterOptions.isBoosting !== undefined) {
        filteredMembers = filteredMembers.filter((member: GuildMember) => {
          const isBoosting = member.premiumSince !== null
          return isBoosting === filterOptions.isBoosting
        })
      }

      // Simplify if requested
      const results = simplify
        ? filteredMembers.map((member) => simplifyMember(member))
        : filteredMembers.map((member) => member.toJSON())

      return {
        json: {
          guildId,
          searchQuery,
          count: results.length,
          members: results,
        },
      }
    },
    cleanup: async (ctx, { client }) => {
      const { releaseV2DiscordClientByInstance } = await import('../../helpers')
      await releaseV2DiscordClientByInstance(client)
    },
  })
}
