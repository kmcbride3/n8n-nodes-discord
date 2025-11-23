/**
 * Discord Fetch Helpers - V2
 *
 * Centralized helpers for fetching Discord data using Discord.js native methods.
 * Provides consistent error handling, caching support, and data simplification.
 *
 * @module v2/helpers/discord-fetch
 */

import type {
  Channel,
  Client,
  Collection,
  Guild,
  GuildAuditLogsEntry,
  GuildEmoji,
  GuildMember,
  GuildScheduledEvent,
  Invite,
  Message,
  Role,
  ThreadChannel,
  User,
  Webhook,
} from 'discord.js'
import { ChannelType } from 'discord.js'
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

import { isValidSnowflake } from './utils'

/**
 * Fetch a Discord channel with validation
 * Uses Discord.js built-in caching
 */
export async function fetchChannel(
  context: IExecuteFunctions,
  client: Client,
  channelId: string,
  itemIndex: number,
): Promise<Channel> {
  if (!isValidSnowflake(channelId)) {
    throw new NodeOperationError(
      context.getNode(),
      `Invalid channel ID: ${channelId} is not a valid Discord snowflake ID`,
      { itemIndex },
    )
  }

  const channel = await client.channels.fetch(channelId).catch((error) => {
    throw new NodeOperationError(context.getNode(), `Failed to fetch channel: ${error.message}`, {
      itemIndex,
      description: 'Channel may not exist or bot lacks access permissions',
    })
  })

  if (!channel) {
    throw new NodeOperationError(context.getNode(), `Channel ${channelId} not found`, { itemIndex })
  }

  return channel
}

/**
 * Fetch a Discord guild with validation
 * Uses Discord.js built-in caching
 */
export async function fetchGuild(
  context: IExecuteFunctions,
  client: Client,
  guildId: string,
  itemIndex: number,
): Promise<Guild> {
  if (!isValidSnowflake(guildId)) {
    throw new NodeOperationError(
      context.getNode(),
      `Invalid guild ID: ${guildId} is not a valid Discord snowflake ID`,
      { itemIndex },
    )
  }

  const guild = await client.guilds.fetch(guildId).catch((error) => {
    throw new NodeOperationError(context.getNode(), `Failed to fetch guild: ${error.message}`, {
      itemIndex,
      description: 'Guild may not exist or bot is not a member',
    })
  })

  if (!guild) {
    throw new NodeOperationError(context.getNode(), `Guild ${guildId} not found`, { itemIndex })
  }

  return guild
}

/**
 * Fetch a Discord user with validation
 * Uses Discord.js built-in caching
 */
export async function fetchUser(
  context: IExecuteFunctions,
  client: Client,
  userId: string,
  itemIndex: number,
): Promise<User> {
  if (!isValidSnowflake(userId)) {
    throw new NodeOperationError(context.getNode(), `Invalid user ID: ${userId} is not a valid Discord snowflake ID`, {
      itemIndex,
    })
  }

  const user = await client.users.fetch(userId).catch((error) => {
    throw new NodeOperationError(context.getNode(), `Failed to fetch user: ${error.message}`, {
      itemIndex,
      description: 'User may not exist or bot lacks access',
    })
  })

  if (!user) {
    throw new NodeOperationError(context.getNode(), `User ${userId} not found`, { itemIndex })
  }

  return user
}

/**
 * Fetch a guild member with validation
 * Uses Discord.js built-in caching
 */
export async function fetchMember(
  context: IExecuteFunctions,
  guild: Guild,
  userId: string,
  itemIndex: number,
): Promise<GuildMember> {
  if (!isValidSnowflake(userId)) {
    throw new NodeOperationError(context.getNode(), `Invalid user ID: ${userId} is not a valid Discord snowflake ID`, {
      itemIndex,
    })
  }

  const member = await guild.members.fetch(userId).catch((error) => {
    throw new NodeOperationError(context.getNode(), `Failed to fetch member: ${error.message}`, {
      itemIndex,
      description: 'Member may not exist in this guild or bot lacks permissions',
    })
  })

  if (!member) {
    throw new NodeOperationError(context.getNode(), `Member ${userId} not found in guild ${guild.id}`, { itemIndex })
  }

  return member
}

/**
 * Fetch a message with validation
 * Uses Discord.js built-in caching
 */
export async function fetchMessage(
  context: IExecuteFunctions,
  channel: Channel,
  messageId: string,
  itemIndex: number,
): Promise<Message> {
  if (!isValidSnowflake(messageId)) {
    throw new NodeOperationError(
      context.getNode(),
      `Invalid message ID: ${messageId} is not a valid Discord snowflake ID`,
      { itemIndex },
    )
  }

  if (!('messages' in channel)) {
    throw new NodeOperationError(context.getNode(), 'Channel does not support messages', {
      itemIndex,
      description: `Channel type ${channel.type} cannot contain messages`,
    })
  }

  const message = await channel.messages.fetch(messageId).catch((error) => {
    throw new NodeOperationError(context.getNode(), `Failed to fetch message: ${error.message}`, {
      itemIndex,
      description: 'Message may have been deleted or bot lacks access',
    })
  })

  if (!message) {
    throw new NodeOperationError(context.getNode(), `Message ${messageId} not found`, { itemIndex })
  }

  return message
}

/**
 * Simplify Discord User data for n8n output
 */
export function simplifyUser(user: User): IDataObject {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    tag: user.tag,
    displayName: user.displayName,
    avatar: user.avatar,
    avatarURL: user.displayAvatarURL(),
    bot: user.bot,
    system: user.system,
    createdAt: user.createdAt.toISOString(),
    createdTimestamp: user.createdTimestamp,
  }
}

/**
 * Simplify Discord Guild Member data for n8n output
 */
export function simplifyMember(member: GuildMember): IDataObject {
  return {
    id: member.id,
    user: simplifyUser(member.user),
    nickname: member.nickname,
    displayName: member.displayName,
    roles: member.roles.cache.map((role) => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
    })),
    joinedAt: member.joinedAt?.toISOString() || null,
    joinedTimestamp: member.joinedTimestamp,
    premiumSince: member.premiumSince?.toISOString() || null,
    pending: member.pending,
    communicationDisabledUntil: member.communicationDisabledUntil?.toISOString() || null,
    permissions: member.permissions.toArray(),
  }
}

/**
 * Simplify Discord Message data for n8n output
 */
export function simplifyMessage(message: Message): IDataObject {
  return {
    id: message.id,
    channelId: message.channelId,
    guildId: message.guildId,
    author: simplifyUser(message.author),
    content: message.content,
    cleanContent: message.cleanContent,
    createdAt: message.createdAt.toISOString(),
    createdTimestamp: message.createdTimestamp,
    editedAt: message.editedAt?.toISOString() || null,
    editedTimestamp: message.editedTimestamp,
    tts: message.tts,
    pinned: message.pinned,
    type: message.type,
    embeds: message.embeds.map((embed) => embed.toJSON()),
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.name,
      size: attachment.size,
      url: attachment.url,
      proxyURL: attachment.proxyURL,
      contentType: attachment.contentType,
      width: attachment.width,
      height: attachment.height,
    })),
    reactions: message.reactions.cache.map((reaction) => ({
      emoji: reaction.emoji.name || reaction.emoji.id,
      count: reaction.count,
      me: reaction.me,
    })),
    mentions: {
      users: message.mentions.users.map((user) => simplifyUser(user)),
      roles: message.mentions.roles.map((role) => ({ id: role.id, name: role.name })),
      everyone: message.mentions.everyone,
    },
    url: message.url,
  }
}

/**
 * Simplify Discord Channel data for n8n output
 */
export function simplifyChannel(channel: Channel): IDataObject {
  const base: IDataObject = {
    id: channel.id,
    type: channel.type,
    createdAt: channel.createdAt?.toISOString() || new Date().toISOString(),
    createdTimestamp: channel.createdTimestamp,
  }

  if ('name' in channel) {
    base.name = channel.name
  }

  if ('parent' in channel && channel.parent) {
    base.parent = { id: channel.parent.id, name: channel.parent.name }
  }

  if ('guild' in channel && channel.guild) {
    base.guildId = channel.guild.id
  }

  if ('topic' in channel) {
    base.topic = channel.topic
  }

  if ('nsfw' in channel) {
    base.nsfw = channel.nsfw
  }

  if ('position' in channel) {
    base.position = channel.position
  }

  // Voice channel specific fields
  if (channel.type === ChannelType.GuildVoice) {
    if ('bitrate' in channel) base.bitrate = channel.bitrate
    if ('userLimit' in channel) base.userLimit = channel.userLimit
    if ('rtcRegion' in channel) base.rtcRegion = channel.rtcRegion
    if ('videoQualityMode' in channel) base.videoQualityMode = channel.videoQualityMode
  }

  // Stage channel specific fields
  if (channel.type === ChannelType.GuildStageVoice) {
    if ('bitrate' in channel) base.bitrate = channel.bitrate
    if ('rtcRegion' in channel) base.rtcRegion = channel.rtcRegion
    if ('stageInstance' in channel && channel.stageInstance) {
      base.stageInstance = {
        id: channel.stageInstance.id,
        topic: channel.stageInstance.topic,
        privacyLevel: channel.stageInstance.privacyLevel,
      }
    }
  }

  // Forum channel specific fields
  if (channel.type === ChannelType.GuildForum) {
    if ('availableTags' in channel) {
      base.availableTags = channel.availableTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        moderated: tag.moderated,
        emoji: tag.emoji,
      }))
    }
    if ('defaultReactionEmoji' in channel) base.defaultReactionEmoji = channel.defaultReactionEmoji
    if ('defaultThreadRateLimitPerUser' in channel)
      base.defaultThreadRateLimitPerUser = channel.defaultThreadRateLimitPerUser
    if ('defaultSortOrder' in channel) base.defaultSortOrder = channel.defaultSortOrder
    if ('defaultForumLayout' in channel) base.defaultForumLayout = channel.defaultForumLayout
  }

  // Thread specific fields
  if ('ownerId' in channel) {
    base.ownerId = channel.ownerId
  }

  if ('archived' in channel) {
    base.archived = channel.archived
    base.autoArchiveDuration = channel.autoArchiveDuration
    base.archiveTimestamp = channel.archiveTimestamp
    base.locked = channel.locked
  }

  // Rate limit per user (threads and text channels)
  if ('rateLimitPerUser' in channel) {
    base.rateLimitPerUser = channel.rateLimitPerUser
  }

  return base
}

/**
 * Simplify Discord Guild data for n8n output
 */
export function simplifyGuild(guild: Guild): IDataObject {
  return {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    icon: guild.icon,
    iconURL: guild.iconURL(),
    banner: guild.banner,
    bannerURL: guild.bannerURL(),
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
    premiumTier: guild.premiumTier,
    premiumSubscriptionCount: guild.premiumSubscriptionCount,
    verificationLevel: guild.verificationLevel,
    vanityURLCode: guild.vanityURLCode,
    features: guild.features,
    createdAt: guild.createdAt.toISOString(),
    createdTimestamp: guild.createdTimestamp,
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
    emojis: guild.emojis.cache.size,
  }
}

/**
 * Simplify Discord Role data for n8n output
 */
export function simplifyRole(role: Role): IDataObject {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    hexColor: role.hexColor,
    hoist: role.hoist,
    position: role.position,
    permissions: role.permissions.toArray(),
    managed: role.managed,
    mentionable: role.mentionable,
    tags: role.tags,
    createdAt: role.createdAt.toISOString(),
    createdTimestamp: role.createdTimestamp,
  }
}

/**
 * Simplify Discord Audit Log Entry for n8n output
 */
export function simplifyAuditLogEntry(entry: GuildAuditLogsEntry): IDataObject {
  return {
    id: entry.id,
    actionType: entry.actionType,
    targetId: entry.targetId,
    targetType: entry.targetType,
    executorId: entry.executorId,
    reason: entry.reason,
    changes: entry.changes,
    createdAt: entry.createdAt.toISOString(),
    createdTimestamp: entry.createdTimestamp,
  }
}

/**
 * Simplify Discord Scheduled Event for n8n output
 */
export function simplifyScheduledEvent(event: GuildScheduledEvent): IDataObject {
  return {
    id: event.id,
    guildId: event.guildId,
    channelId: event.channelId,
    name: event.name,
    description: event.description,
    scheduledStartAt: event.scheduledStartAt?.toISOString() || null,
    scheduledStartTimestamp: event.scheduledStartTimestamp,
    scheduledEndAt: event.scheduledEndAt?.toISOString() || null,
    scheduledEndTimestamp: event.scheduledEndTimestamp,
    privacyLevel: event.privacyLevel,
    status: event.status,
    entityType: event.entityType,
    entityId: event.entityId,
    userCount: event.userCount,
    creatorId: event.creatorId,
    url: event.url,
    coverImageURL: event.coverImageURL(),
  }
}

/**
 * Simplify Discord Invite for n8n output
 */
export function simplifyInvite(invite: Invite): IDataObject {
  return {
    code: invite.code,
    url: invite.url,
    guildId: invite.guild?.id,
    channelId: invite.channel?.id,
    inviterId: invite.inviter?.id,
    uses: invite.uses,
    maxUses: invite.maxUses,
    maxAge: invite.maxAge,
    temporary: invite.temporary,
    createdAt: invite.createdAt?.toISOString() || null,
    createdTimestamp: invite.createdTimestamp,
    expiresAt: invite.expiresAt?.toISOString() || null,
    expiresTimestamp: invite.expiresTimestamp,
  }
}

/**
 * Simplify Discord Emoji for n8n output
 */
export function simplifyEmoji(emoji: GuildEmoji): IDataObject {
  return {
    id: emoji.id,
    name: emoji.name,
    animated: emoji.animated,
    managed: emoji.managed,
    available: emoji.available,
    requireColons: emoji.requiresColons,
    roles: emoji.roles.cache.map((role) => ({ id: role.id, name: role.name })),
    url: emoji.url,
    imageURL: emoji.imageURL(),
    createdAt: emoji.createdAt?.toISOString() || null,
    createdTimestamp: emoji.createdTimestamp,
  }
}

/**
 * Simplify Discord Thread for n8n output
 */
export function simplifyThread(thread: ThreadChannel): IDataObject {
  return {
    id: thread.id,
    name: thread.name,
    type: thread.type,
    guildId: thread.guildId,
    parentId: thread.parentId,
    ownerId: thread.ownerId,
    archived: thread.archived,
    autoArchiveDuration: thread.autoArchiveDuration,
    archiveTimestamp: thread.archiveTimestamp,
    locked: thread.locked,
    invitable: thread.invitable,
    memberCount: thread.memberCount,
    messageCount: thread.messageCount,
    createdAt: thread.createdAt?.toISOString() || null,
    createdTimestamp: thread.createdTimestamp,
  }
}

/**
 * Simplify Discord Webhook for n8n output
 */
export function simplifyWebhook(webhook: Webhook): IDataObject {
  return {
    id: webhook.id,
    name: webhook.name,
    avatar: webhook.avatar,
    avatarURL: webhook.avatarURL(),
    channelId: webhook.channelId,
    guildId: webhook.guildId,
    applicationId: webhook.applicationId,
    token: webhook.token,
    url: webhook.url,
    type: webhook.type,
    createdAt: webhook.createdAt.toISOString(),
    createdTimestamp: webhook.createdTimestamp,
  }
}

/**
 * Convert Discord Collection to array with optional simplification
 */
export function collectionToArray<T>(
  collection: Collection<string, T>,
  simplifyFn?: (item: T) => IDataObject,
): IDataObject[] | T[] {
  const array = Array.from(collection.values())
  return simplifyFn ? array.map(simplifyFn) : (array as T[])
}
