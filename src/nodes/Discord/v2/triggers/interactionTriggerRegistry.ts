/**
 * Discord Interaction Trigger Registry
 *
 * Defines interaction trigger configurations for button clicks, select menus,
 * modals, and slash commands with customId filtering
 */

import type { Interaction } from 'discord.js'
import type { ITriggerFunctions } from 'n8n-workflow'

import type { InteractionTriggerType } from '../triggerHelpers'
import { INTERACTION_TRIGGER_INTENT_REQUIREMENTS } from '../triggerHelpers'

/**
 * Configuration for an interaction trigger type
 */
export interface InteractionTriggerConfig {
  /** Trigger type identifier */
  type: InteractionTriggerType
  /** Discord.js event name to listen for */
  discordEvent: string
  /** Required Gateway intents */
  requiredIntents: number[]
  /** Filter function to determine if interaction should trigger workflow */
  filter: (interaction: Interaction, triggerFunctions: ITriggerFunctions) => Promise<boolean> | boolean
  /** Transform interaction data into n8n workflow data */
  transform: (interaction: Interaction) => Record<string, unknown>
}

/**
 * Registry of all interaction trigger configurations
 */
export const INTERACTION_TRIGGER_REGISTRY: Record<InteractionTriggerType, InteractionTriggerConfig> = {
  buttonInteraction: {
    type: 'buttonInteraction',
    discordEvent: 'interactionCreate',
    requiredIntents: INTERACTION_TRIGGER_INTENT_REQUIREMENTS.buttonInteraction,
    filter: async (interaction, triggerFunctions) => {
      if (!interaction.isButton()) return false

      const customIdPattern = triggerFunctions.getNodeParameter('customIdPattern', '') as string
      if (!customIdPattern) return true

      // Support exact match, starts with, contains, regex
      const matchType = triggerFunctions.getNodeParameter('matchType', 'exact') as string
      const customId = interaction.customId

      switch (matchType) {
        case 'exact':
          return customId === customIdPattern
        case 'startsWith':
          return customId.startsWith(customIdPattern)
        case 'contains':
          return customId.includes(customIdPattern)
        case 'regex':
          try {
            const regex = new RegExp(customIdPattern)
            return regex.test(customId)
          } catch {
            return false
          }
        default:
          return false
      }
    },
    transform: (interaction) => {
      if (!interaction.isButton()) return {}

      return {
        interactionId: interaction.id,
        interactionType: 'button',
        customId: interaction.customId,
        user: {
          id: interaction.user.id,
          username: interaction.user.username,
          discriminator: interaction.user.discriminator,
          avatar: interaction.user.avatar,
          bot: interaction.user.bot,
        },
        member: interaction.member
          ? {
              id: interaction.member.user.id,
              nickname: 'nickname' in interaction.member ? interaction.member.nickname : null,
              roles:
                'roles' in interaction.member && interaction.member.roles && 'cache' in interaction.member.roles
                  ? Array.from(interaction.member.roles.cache.values()).map((r) => r.id)
                  : [],
            }
          : undefined,
        channel: interaction.channel
          ? {
              id: interaction.channel.id,
              type: interaction.channel.type,
            }
          : undefined,
        guild: interaction.guild
          ? {
              id: interaction.guild.id,
              name: interaction.guild.name,
            }
          : undefined,
        message: interaction.message
          ? {
              id: interaction.message.id,
              content: interaction.message.content,
              channelId: interaction.message.channelId,
            }
          : undefined,
        token: interaction.token,
        createdTimestamp: interaction.createdTimestamp,
      }
    },
  },

  selectMenuInteraction: {
    type: 'selectMenuInteraction',
    discordEvent: 'interactionCreate',
    requiredIntents: INTERACTION_TRIGGER_INTENT_REQUIREMENTS.selectMenuInteraction,
    filter: async (interaction, triggerFunctions) => {
      if (!interaction.isAnySelectMenu()) return false

      const customIdPattern = triggerFunctions.getNodeParameter('customIdPattern', '') as string
      if (!customIdPattern) return true

      const matchType = triggerFunctions.getNodeParameter('matchType', 'exact') as string
      const customId = interaction.customId

      switch (matchType) {
        case 'exact':
          return customId === customIdPattern
        case 'startsWith':
          return customId.startsWith(customIdPattern)
        case 'contains':
          return customId.includes(customIdPattern)
        case 'regex':
          try {
            const regex = new RegExp(customIdPattern)
            return regex.test(customId)
          } catch {
            return false
          }
        default:
          return false
      }
    },
    transform: (interaction) => {
      if (!interaction.isAnySelectMenu()) return {}

      return {
        interactionId: interaction.id,
        interactionType: 'selectMenu',
        customId: interaction.customId,
        values: interaction.values,
        user: {
          id: interaction.user.id,
          username: interaction.user.username,
          discriminator: interaction.user.discriminator,
          avatar: interaction.user.avatar,
          bot: interaction.user.bot,
        },
        member: interaction.member
          ? {
              id: interaction.member.user.id,
              nickname: 'nickname' in interaction.member ? interaction.member.nickname : null,
              roles:
                'roles' in interaction.member && interaction.member.roles && 'cache' in interaction.member.roles
                  ? Array.from(interaction.member.roles.cache.values()).map((r) => r.id)
                  : [],
            }
          : undefined,
        channel: interaction.channel
          ? {
              id: interaction.channel.id,
              type: interaction.channel.type,
            }
          : undefined,
        guild: interaction.guild
          ? {
              id: interaction.guild.id,
              name: interaction.guild.name,
            }
          : undefined,
        message: interaction.message
          ? {
              id: interaction.message.id,
              content: interaction.message.content,
              channelId: interaction.message.channelId,
            }
          : undefined,
        token: interaction.token,
        createdTimestamp: interaction.createdTimestamp,
      }
    },
  },

  modalInteraction: {
    type: 'modalInteraction',
    discordEvent: 'interactionCreate',
    requiredIntents: INTERACTION_TRIGGER_INTENT_REQUIREMENTS.modalInteraction,
    filter: async (interaction, triggerFunctions) => {
      if (!interaction.isModalSubmit()) return false

      const customIdPattern = triggerFunctions.getNodeParameter('customIdPattern', '') as string
      if (!customIdPattern) return true

      const matchType = triggerFunctions.getNodeParameter('matchType', 'exact') as string
      const customId = interaction.customId

      switch (matchType) {
        case 'exact':
          return customId === customIdPattern
        case 'startsWith':
          return customId.startsWith(customIdPattern)
        case 'contains':
          return customId.includes(customIdPattern)
        case 'regex':
          try {
            const regex = new RegExp(customIdPattern)
            return regex.test(customId)
          } catch {
            return false
          }
        default:
          return false
      }
    },
    transform: (interaction) => {
      if (!interaction.isModalSubmit()) return {}

      const fields: Record<string, string> = {}
      interaction.fields.fields.forEach((field) => {
        if ('value' in field && typeof field.value === 'string') {
          fields[field.customId] = field.value
        }
      })

      return {
        interactionId: interaction.id,
        interactionType: 'modal',
        customId: interaction.customId,
        fields,
        user: {
          id: interaction.user.id,
          username: interaction.user.username,
          discriminator: interaction.user.discriminator,
          avatar: interaction.user.avatar,
          bot: interaction.user.bot,
        },
        member: interaction.member
          ? {
              id: interaction.member.user.id,
              nickname: 'nickname' in interaction.member ? interaction.member.nickname : null,
              roles:
                'roles' in interaction.member && interaction.member.roles && 'cache' in interaction.member.roles
                  ? Array.from(interaction.member.roles.cache.values()).map((r) => r.id)
                  : [],
            }
          : undefined,
        channel: interaction.channel
          ? {
              id: interaction.channel.id,
              type: interaction.channel.type,
            }
          : undefined,
        guild: interaction.guild
          ? {
              id: interaction.guild.id,
              name: interaction.guild.name,
            }
          : undefined,
        token: interaction.token,
        createdTimestamp: interaction.createdTimestamp,
      }
    },
  },

  commandInteraction: {
    type: 'commandInteraction',
    discordEvent: 'interactionCreate',
    requiredIntents: INTERACTION_TRIGGER_INTENT_REQUIREMENTS.commandInteraction,
    filter: async (interaction, triggerFunctions) => {
      if (!interaction.isChatInputCommand()) return false

      const commandName = triggerFunctions.getNodeParameter('commandName', '') as string
      if (!commandName) return true

      return interaction.commandName === commandName
    },
    transform: (interaction) => {
      if (!interaction.isChatInputCommand()) return {}

      const options: Record<string, unknown> = {}
      interaction.options.data.forEach((option) => {
        options[option.name] = option.value
      })

      return {
        interactionId: interaction.id,
        interactionType: 'command',
        commandName: interaction.commandName,
        commandId: interaction.commandId,
        options,
        user: {
          id: interaction.user.id,
          username: interaction.user.username,
          discriminator: interaction.user.discriminator,
          avatar: interaction.user.avatar,
          bot: interaction.user.bot,
        },
        member: interaction.member
          ? {
              id: interaction.member.user.id,
              nickname: 'nickname' in interaction.member ? interaction.member.nickname : null,
              roles:
                'roles' in interaction.member && interaction.member.roles && 'cache' in interaction.member.roles
                  ? Array.from(interaction.member.roles.cache.values()).map((r) => r.id)
                  : [],
            }
          : undefined,
        channel: interaction.channel
          ? {
              id: interaction.channel.id,
              type: interaction.channel.type,
            }
          : undefined,
        guild: interaction.guild
          ? {
              id: interaction.guild.id,
              name: interaction.guild.name,
            }
          : undefined,
        token: interaction.token,
        createdTimestamp: interaction.createdTimestamp,
      }
    },
  },
}
