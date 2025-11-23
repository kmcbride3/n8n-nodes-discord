/**
 * Discord V2 Trigger Registry
 *
 * Central registry of all Discord triggers with declarative configuration.
 * This consolidates trigger logic that was previously scattered across multiple files.
 *
 * Each trigger configuration defines:
 * - triggerType: For intent validation and client caching
 * - discordEvent: Discord.js event name to listen to
 * - transformEvent: Function to transform Discord.js event data to n8n workflow data
 * - filter: Optional function to skip certain events
 */

import type {
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  PartialGuildMember,
  PartialMessage,
  Presence,
  ThreadChannel,
} from 'discord.js'
import type { ITriggerFunctions } from 'n8n-workflow'

import type { TriggerType } from '../triggerHelpers'

/**
 * Trigger configuration interface
 */
export interface TriggerConfig {
  /** TriggerType for intent validation and caching */
  triggerType: TriggerType

  /** Discord.js event name to listen to */
  discordEvent: string

  /** Transform Discord.js event data to n8n workflow data */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformEvent: (this: ITriggerFunctions, ...eventArgs: any[]) => Record<string, unknown> | null

  /** Optional filter to skip certain events */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (this: ITriggerFunctions, ...eventArgs: any[]) => boolean
}

/**
 * Central registry of all Discord triggers
 * Adding a new trigger is as simple as adding a configuration entry
 */
export const TRIGGER_REGISTRY: Record<string, TriggerConfig> = {
  // ============================================================================
  // MESSAGE TRIGGERS
  // ============================================================================

  message: {
    triggerType: 'message',
    discordEvent: 'messageCreate',
    filter(message: Message) {
      // Skip bot messages
      return !message.author.bot
    },
    transformEvent(message: Message) {
      return {
        messageId: message.id,
        content: message.content,
        authorId: message.author.id,
        authorUsername: message.author.username,
        channelId: message.channelId,
        guildId: message.guildId,
        timestamp: message.createdAt.toISOString(),
      }
    },
  },

  message_update: {
    triggerType: 'message_update',
    discordEvent: 'messageUpdate',
    filter(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
      // Skip partial messages and bot messages
      return !newMessage.partial && !newMessage.author?.bot
    },
    transformEvent(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
      const fullMessage = newMessage as Message
      return {
        messageId: fullMessage.id,
        oldContent: oldMessage.content,
        newContent: fullMessage.content,
        authorId: fullMessage.author.id,
        channelId: fullMessage.channelId,
        guildId: fullMessage.guildId,
        editedTimestamp: fullMessage.editedAt?.toISOString() || new Date().toISOString(),
      }
    },
  },

  // ============================================================================
  // THREAD TRIGGERS
  // ============================================================================

  thread: {
    triggerType: 'thread',
    discordEvent: 'threadCreate',
    transformEvent(thread: ThreadChannel) {
      return {
        threadId: thread.id,
        name: thread.name,
        type: thread.type,
        parentId: thread.parentId,
        ownerId: thread.ownerId,
        guildId: thread.guild?.id,
        createdAt: thread.createdAt?.toISOString(),
        archived: thread.archived,
        locked: thread.locked,
        memberCount: thread.memberCount,
        messageCount: thread.messageCount,
      }
    },
  },

  thread_update: {
    triggerType: 'thread_update',
    discordEvent: 'threadUpdate',
    transformEvent(oldThread: ThreadChannel, newThread: ThreadChannel) {
      return {
        threadId: newThread.id,
        name: newThread.name,
        type: newThread.type,
        parentId: newThread.parentId,
        guildId: newThread.guild?.id,
        changes: {
          name: oldThread.name !== newThread.name ? { old: oldThread.name, new: newThread.name } : undefined,
          archived:
            oldThread.archived !== newThread.archived
              ? { old: oldThread.archived, new: newThread.archived }
              : undefined,
          locked: oldThread.locked !== newThread.locked ? { old: oldThread.locked, new: newThread.locked } : undefined,
        },
        updatedAt: new Date().toISOString(),
      }
    },
  },

  // ============================================================================
  // COMMAND/INTERACTION TRIGGERS
  // ============================================================================

  command: {
    triggerType: 'command',
    discordEvent: 'interactionCreate',
    filter(interaction: Interaction) {
      // Only handle slash command interactions
      return interaction.isChatInputCommand()
    },
    transformEvent(interaction: Interaction) {
      const commandInteraction = interaction as ChatInputCommandInteraction

      // Get command name from node parameters
      const commandName = this.getNodeParameter('name', 0) as string

      // Filter by command name
      if (commandInteraction.commandName !== commandName) {
        return null // Skip this interaction
      }

      // Filter by channel if specified
      const channelIds = this.getNodeParameter('channelIds', 0) as string[]
      if (channelIds.length > 0 && commandInteraction.channelId && !channelIds.includes(commandInteraction.channelId)) {
        return null // Skip this interaction
      }

      // Extract command options
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commandOptions: Record<string, any> = {}
      try {
        const inputOption = commandInteraction.options.get('input')
        if (inputOption) {
          const value = inputOption.value
          if (typeof value === 'string') {
            try {
              commandOptions.input = JSON.parse(value)
            } catch {
              commandOptions.input = value
            }
          }
        }
      } catch {
        // Option doesn't exist or wrong type, continue with empty options
      }

      return {
        commandName: commandInteraction.commandName,
        commandOptions,
        userId: commandInteraction.user.id,
        userName: commandInteraction.user.username,
        userTag: commandInteraction.user.tag,
        channelId: commandInteraction.channelId,
        guildId: commandInteraction.guildId,
        interactionId: commandInteraction.id,
        timestamp: new Date().toISOString(),
      }
    },
  },

  interaction: {
    triggerType: 'interaction',
    discordEvent: 'interactionCreate',
    filter(interaction: Interaction) {
      // Only handle component interactions (buttons, select menus)
      return interaction.isMessageComponent()
    },
    transformEvent(interaction: Interaction) {
      if (!interaction.isMessageComponent()) {
        return null
      }

      // Get message ID from node parameters
      const messageId = this.getNodeParameter('interactionMessageId', 0) as string

      // Filter by message ID
      if (interaction.message.id !== messageId) {
        return null
      }

      // Extract interaction values
      let interactionValues: string[] = []
      if (interaction.isStringSelectMenu()) {
        interactionValues = interaction.values
      } else if (interaction.isButton()) {
        interactionValues = [interaction.customId]
      }

      return {
        interactionType: interaction.componentType,
        customId: interaction.customId,
        interactionValues,
        messageId: interaction.message.id,
        userId: interaction.user.id,
        userName: interaction.user.username,
        userTag: interaction.user.tag,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        timestamp: new Date().toISOString(),
      }
    },
  },

  // ============================================================================
  // USER/MEMBER TRIGGERS
  // ============================================================================

  userJoins: {
    triggerType: 'userJoins',
    discordEvent: 'guildMemberAdd',
    filter(member: GuildMember) {
      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || member.guild?.id === guildId
    },
    transformEvent(member: GuildMember) {
      return {
        userId: member.user.id,
        userName: member.user.username,
        userTag: member.user.tag,
        displayName: member.displayName,
        nickname: member.nickname,
        guildId: member.guild.id,
        joinedAt: member.joinedAt?.toISOString(),
        avatar: member.user.avatar,
        discriminator: member.user.discriminator,
        bot: member.user.bot,
        roles: member.roles.cache.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          permissions: role.permissions.toString(),
        })),
      }
    },
  },

  userLeaves: {
    triggerType: 'userLeaves',
    discordEvent: 'guildMemberRemove',
    filter(member: GuildMember | PartialGuildMember) {
      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || member.guild?.id === guildId
    },
    transformEvent(member: GuildMember | PartialGuildMember) {
      return {
        userId: member.user.id,
        userName: member.user.username,
        userTag: member.user.tag,
        guildId: member.guild.id,
        avatar: member.user.avatar,
        discriminator: member.user.discriminator,
        bot: member.user.bot,
        leftAt: new Date().toISOString(),
      }
    },
  },

  userUpdate: {
    triggerType: 'userUpdate',
    discordEvent: 'guildMemberUpdate',
    filter(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || newMember.guild?.id === guildId
    },
    transformEvent(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      return {
        userId: newMember.user.id,
        userName: newMember.user.username,
        userTag: newMember.user.tag,
        guildId: newMember.guild.id,
        changes: {
          nickname:
            oldMember.nickname !== newMember.nickname
              ? { old: oldMember.nickname, new: newMember.nickname }
              : undefined,
          roles: {
            added: newMember.roles.cache
              .filter((role) => !oldMember.roles.cache.has(role.id))
              .map((role) => ({
                id: role.id,
                name: role.name,
              })),
            removed: oldMember.roles.cache
              .filter((role) => !newMember.roles.cache.has(role.id))
              .map((role) => ({
                id: role.id,
                name: role.name,
              })),
          },
        },
        timestamp: new Date().toISOString(),
      }
    },
  },

  presenceUpdate: {
    triggerType: 'presenceUpdate',
    discordEvent: 'presenceUpdate',
    filter(oldPresence: Presence | null, newPresence: Presence) {
      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || newPresence.guild?.id === guildId
    },
    transformEvent(oldPresence: Presence | null, newPresence: Presence) {
      return {
        userId: newPresence.user?.id,
        userName: newPresence.user?.username,
        guildId: newPresence.guild?.id,
        status: newPresence.status,
        oldStatus: oldPresence?.status,
        activities: newPresence.activities.map((activity) => ({
          name: activity.name,
          type: activity.type,
          details: activity.details,
          state: activity.state,
        })),
        timestamp: new Date().toISOString(),
      }
    },
  },

  userNickUpdated: {
    triggerType: 'userNickUpdated',
    discordEvent: 'guildMemberUpdate',
    filter(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      // Only trigger if nickname actually changed
      if (oldMember.nickname === newMember.nickname) {
        return false
      }

      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || newMember.guild?.id === guildId
    },
    transformEvent(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      return {
        userId: newMember.user.id,
        userName: newMember.user.username,
        userTag: newMember.user.tag,
        guildId: newMember.guild.id,
        oldNickname: oldMember.nickname,
        newNickname: newMember.nickname,
        timestamp: new Date().toISOString(),
      }
    },
  },

  userRoleAdded: {
    triggerType: 'userRoleAdded',
    discordEvent: 'guildMemberUpdate',
    filter(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      // Only trigger if roles were actually added
      const addedRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id))
      if (addedRoles.size === 0) {
        return false
      }

      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || newMember.guild?.id === guildId
    },
    transformEvent(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      const addedRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id))

      return {
        userId: newMember.user.id,
        userName: newMember.user.username,
        userTag: newMember.user.tag,
        guildId: newMember.guild.id,
        addedRoles: addedRoles.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          permissions: role.permissions.toString(),
        })),
        timestamp: new Date().toISOString(),
      }
    },
  },

  userRoleRemoved: {
    triggerType: 'userRoleRemoved',
    discordEvent: 'guildMemberUpdate',
    filter(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      // Only trigger if roles were actually removed
      const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id))
      if (removedRoles.size === 0) {
        return false
      }

      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || newMember.guild?.id === guildId
    },
    transformEvent(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
      const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id))

      return {
        userId: newMember.user.id,
        userName: newMember.user.username,
        userTag: newMember.user.tag,
        guildId: newMember.guild.id,
        removedRoles: removedRoles.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          permissions: role.permissions.toString(),
        })),
        timestamp: new Date().toISOString(),
      }
    },
  },
}
