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
  ClientEvents,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  PartialGuildMember,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  Presence,
  Role,
  ThreadChannel,
  User,
} from 'discord.js'
import type { ITriggerFunctions } from 'n8n-workflow'

import type { TriggerType } from '../triggerHelpers'
import { applyBotFilter, applyMessageContentFilter } from './message-filters'

/**
 * Trigger configuration interface.
 *
 * Implementations in TRIGGER_REGISTRY are type-checked via defineTrigger() helper
 * which preserves the concrete K event key. The interface itself uses `any[]` for
 * the heterogeneous registry map — concrete argument types are validated per entry.
 */
export interface TriggerConfig {
  /** TriggerType for intent validation and caching */
  triggerType: TriggerType

  /** Discord.js event name to listen to */
  discordEvent: keyof ClientEvents

  /** Transform Discord.js event data to n8n workflow data */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformEvent: (this: ITriggerFunctions, ...eventArgs: any[]) => Record<string, unknown> | null

  /** Optional filter to skip certain events (supports async for partial data fetching) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (this: ITriggerFunctions, ...eventArgs: any[]) => boolean | Promise<boolean>
}

/**
 * Strongly-typed helper for creating trigger registry entries.
 * Ensures transformEvent and filter receive the correct discord.js event arguments.
 */
function defineTrigger<K extends keyof ClientEvents>(config: {
  triggerType: TriggerType
  discordEvent: K
  transformEvent: (this: ITriggerFunctions, ...eventArgs: ClientEvents[K]) => Record<string, unknown> | null
  filter?: (this: ITriggerFunctions, ...eventArgs: ClientEvents[K]) => boolean | Promise<boolean>
}): TriggerConfig {
  return config as TriggerConfig
}

/**
 * Central registry of all Discord triggers
 * Adding a new trigger is as simple as adding a configuration entry
 */
export const TRIGGER_REGISTRY: Record<string, TriggerConfig> = {
  // ============================================================================
  // MESSAGE TRIGGERS
  // ============================================================================

  message: defineTrigger({
    triggerType: 'message',
    discordEvent: 'messageCreate',
    filter(message: Message) {
      const botResult = applyBotFilter(this, message.author.bot, message.author.id, message.client.user?.id)
      if (botResult !== undefined) return botResult
      return applyMessageContentFilter(this, message)
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
  }),

  message_update: defineTrigger({
    triggerType: 'message_update',
    discordEvent: 'messageUpdate',
    filter(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
      // Skip partial messages
      if (newMessage.partial) return false
      const fullMessage = newMessage as Message
      const botResult = applyBotFilter(
        this,
        Boolean(fullMessage.author?.bot),
        fullMessage.author?.id ?? '',
        fullMessage.client.user?.id,
      )
      if (botResult !== undefined) return botResult
      return applyMessageContentFilter(this, fullMessage)
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
  }),

  directMessage: defineTrigger({
    triggerType: 'directMessage',
    discordEvent: 'messageCreate',
    filter(message: Message) {
      if (!message.channel.isDMBased()) return false
      const botResult = applyBotFilter(this, message.author.bot, message.author.id, message.client.user?.id)
      if (botResult !== undefined) return botResult
      return applyMessageContentFilter(this, message)
    },
    transformEvent(message: Message) {
      return {
        messageId: message.id,
        content: message.content,
        authorId: message.author.id,
        authorUsername: message.author.username,
        authorTag: message.author.tag,
        channelId: message.channelId,
        timestamp: message.createdAt.toISOString(),
        attachments: message.attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
          contentType: attachment.contentType,
        })),
      }
    },
  }),

  // ============================================================================
  // REACTION TRIGGERS
  // ============================================================================

  reactionAdd: defineTrigger({
    triggerType: 'reactionAdd',
    discordEvent: 'messageReactionAdd',
    async filter(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
      // Fetch partial reaction if needed
      if (reaction.partial) {
        try {
          await reaction.fetch()
        } catch {
          return false
        }
      }

      // Apply bot filtering based on user configuration
      const botFilters = this.getNodeParameter('botFilters', 0, {}) as {
        botBehavior?: 'ignoreAllBots' | 'ignoreSelf' | 'ignoreOthers' | 'allowAllBots'
      }
      const botBehavior = botFilters.botBehavior || 'ignoreAllBots'

      if (user.bot) {
        const selfId = reaction.client.user?.id
        switch (botBehavior) {
          case 'ignoreAllBots':
            return false
          case 'ignoreSelf':
            return user.id !== selfId
          case 'ignoreOthers':
            return user.id === selfId
          case 'allowAllBots':
            return true
        }
      }

      return true
    },
    transformEvent(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
      return {
        emoji: reaction.emoji.name || reaction.emoji.id,
        emojiId: reaction.emoji.id,
        emojiAnimated: reaction.emoji.animated,
        count: reaction.count,
        messageId: reaction.message.id,
        channelId: reaction.message.channelId,
        guildId: reaction.message.guildId,
        userId: user.id,
        userName: user.username,
        userTag: user.tag,
        timestamp: new Date().toISOString(),
      }
    },
  }),

  reactionRemove: defineTrigger({
    triggerType: 'reactionRemove',
    discordEvent: 'messageReactionRemove',
    async filter(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
      // Fetch partial reaction if needed
      if (reaction.partial) {
        try {
          await reaction.fetch()
        } catch {
          return false
        }
      }

      // Apply bot filtering based on user configuration
      const botFilters = this.getNodeParameter('botFilters', 0, {}) as {
        botBehavior?: 'ignoreAllBots' | 'ignoreSelf' | 'ignoreOthers' | 'allowAllBots'
      }
      const botBehavior = botFilters.botBehavior || 'ignoreAllBots'

      if (user.bot) {
        const selfId = reaction.client.user?.id
        switch (botBehavior) {
          case 'ignoreAllBots':
            return false
          case 'ignoreSelf':
            return user.id !== selfId
          case 'ignoreOthers':
            return user.id === selfId
          case 'allowAllBots':
            return true
        }
      }

      return true
    },
    transformEvent(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
      return {
        emoji: reaction.emoji.name || reaction.emoji.id,
        emojiId: reaction.emoji.id,
        emojiAnimated: reaction.emoji.animated,
        count: reaction.count,
        messageId: reaction.message.id,
        channelId: reaction.message.channelId,
        guildId: reaction.message.guildId,
        userId: user.id,
        userName: user.username,
        userTag: user.tag,
        timestamp: new Date().toISOString(),
      }
    },
  }),

  // ============================================================================
  // THREAD TRIGGERS
  // ============================================================================

  thread: defineTrigger({
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
  }),

  thread_update: defineTrigger({
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
  }),

  // ============================================================================
  // COMMAND/INTERACTION TRIGGERS
  // ============================================================================

  command: defineTrigger({
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
  }),

  interaction: defineTrigger({
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
  }),

  // ============================================================================
  // USER/MEMBER TRIGGERS
  // ============================================================================

  userJoins: defineTrigger({
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
  }),

  userLeaves: defineTrigger({
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
  }),

  userUpdate: defineTrigger({
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
  }),

  presenceUpdate: defineTrigger({
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
  }),

  userNickUpdated: defineTrigger({
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
  }),

  userRoleAdded: defineTrigger({
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
  }),

  userRoleRemoved: defineTrigger({
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
  }),

  // ============================================================================
  // ROLE LIFECYCLE TRIGGERS
  // ============================================================================

  roleCreate: defineTrigger({
    triggerType: 'roleCreate',
    discordEvent: 'roleCreate',
    filter(role: Role) {
      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || role.guild.id === guildId
    },
    transformEvent(role: Role) {
      return {
        roleId: role.id,
        roleName: role.name,
        roleColor: role.color,
        roleHoist: role.hoist,
        roleMentionable: role.mentionable,
        rolePosition: role.position,
        rolePermissions: role.permissions.toString(),
        guildId: role.guild.id,
        guildName: role.guild.name,
        timestamp: new Date().toISOString(),
      }
    },
  }),

  roleDelete: defineTrigger({
    triggerType: 'roleDelete',
    discordEvent: 'roleDelete',
    filter(role: Role) {
      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || role.guild.id === guildId
    },
    transformEvent(role: Role) {
      return {
        roleId: role.id,
        roleName: role.name,
        roleColor: role.color,
        roleHoist: role.hoist,
        roleMentionable: role.mentionable,
        rolePosition: role.position,
        rolePermissions: role.permissions.toString(),
        guildId: role.guild.id,
        guildName: role.guild.name,
        timestamp: new Date().toISOString(),
      }
    },
  }),

  roleUpdate: defineTrigger({
    triggerType: 'roleUpdate',
    discordEvent: 'roleUpdate',
    filter(oldRole: Role, newRole: Role) {
      // Only trigger if meaningful properties changed
      const hasChanges =
        oldRole.name !== newRole.name ||
        oldRole.color !== newRole.color ||
        oldRole.hoist !== newRole.hoist ||
        oldRole.mentionable !== newRole.mentionable ||
        oldRole.permissions.bitfield !== newRole.permissions.bitfield ||
        oldRole.position !== newRole.position

      if (!hasChanges) {
        return false
      }

      // Filter by guild if specified
      const guildId = this.getNodeParameter('guildId', 0) as string
      return !guildId || newRole.guild.id === guildId
    },
    transformEvent(oldRole: Role, newRole: Role) {
      return {
        roleId: newRole.id,
        roleName: newRole.name,
        guildId: newRole.guild.id,
        guildName: newRole.guild.name,
        changes: {
          name: oldRole.name !== newRole.name ? { old: oldRole.name, new: newRole.name } : undefined,
          color: oldRole.color !== newRole.color ? { old: oldRole.color, new: newRole.color } : undefined,
          hoist: oldRole.hoist !== newRole.hoist ? { old: oldRole.hoist, new: newRole.hoist } : undefined,
          mentionable:
            oldRole.mentionable !== newRole.mentionable
              ? { old: oldRole.mentionable, new: newRole.mentionable }
              : undefined,
          position:
            oldRole.position !== newRole.position ? { old: oldRole.position, new: newRole.position } : undefined,
          permissions:
            oldRole.permissions.bitfield !== newRole.permissions.bitfield
              ? { old: oldRole.permissions.toString(), new: newRole.permissions.toString() }
              : undefined,
        },
        timestamp: new Date().toISOString(),
      }
    },
  }),
}
