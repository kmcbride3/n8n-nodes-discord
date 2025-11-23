/**
 * Pure Discord.js Operations for n8n
 *
 * This file provides Discord.js-based implementations for common operations
 * that can be used in n8n node execution contexts.
 *
 * These functions prioritize Discord.js built-in functionality and fall back
 * to Discord.js REST API when a full client instance is not available.
 */

import type {
  APIMessage,
  APIWebhook,
  Client,
  MessageCreateOptions,
  NewsChannel,
  RESTPostAPIWebhookWithTokenJSONBody,
  TextChannel,
  WebhookMessageCreateOptions,
} from 'discord.js'
import { REST, Routes, WebhookClient } from 'discord.js'
import type { IExecuteFunctions } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Check if a Discord client is available and ready
 */
function isClientReady(client?: Client): client is Client {
  return client !== undefined && client.isReady()
}

/**
 * Add a role to a guild member using Discord.js methods
 */
export async function addMemberRole(
  this: IExecuteFunctions,
  guildId: string,
  userId: string,
  roleId: string,
  reason?: string,
  client?: Client,
): Promise<void> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for guild member operations')
  }

  const guild = await client.guilds.fetch(guildId)
  const member = await guild.members.fetch(userId)
  const role = await guild.roles.fetch(roleId)

  if (!role) {
    throw new NodeOperationError(this.getNode(), `Role ${roleId} not found`)
  }

  await member.roles.add(role, reason)
}

/**
 * Remove a role from a guild member using Discord.js methods
 */
export async function removeMemberRole(
  this: IExecuteFunctions,
  guildId: string,
  userId: string,
  roleId: string,
  reason?: string,
  client?: Client,
): Promise<void> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for guild member operations')
  }

  const guild = await client.guilds.fetch(guildId)
  const member = await guild.members.fetch(userId)
  const role = await guild.roles.fetch(roleId)

  if (!role) {
    throw new NodeOperationError(this.getNode(), `Role ${roleId} not found`)
  }

  await member.roles.remove(role, reason)
}

/**
 * Ban a guild member using Discord.js methods
 */
export async function banMember(
  this: IExecuteFunctions,
  guildId: string,
  userId: string,
  deleteMessageDays = 0,
  reason?: string,
  client?: Client,
): Promise<void> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for guild member operations')
  }

  const guild = await client.guilds.fetch(guildId)
  // Convert days to seconds for Discord.js v14
  const deleteMessageSeconds = deleteMessageDays * 24 * 60 * 60

  await guild.bans.create(userId, {
    deleteMessageSeconds,
    reason,
  })
}

/**
 * Kick a guild member using Discord.js methods
 */
export async function kickMember(
  this: IExecuteFunctions,
  guildId: string,
  userId: string,
  reason?: string,
  client?: Client,
): Promise<void> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for guild member operations')
  }

  const guild = await client.guilds.fetch(guildId)
  const member = await guild.members.fetch(userId)

  await member.kick(reason)
}

/**
 * Timeout a guild member using Discord.js methods
 */
export async function timeoutMember(
  this: IExecuteFunctions,
  guildId: string,
  userId: string,
  timeoutUntil: string | null,
  reason?: string,
  client?: Client,
): Promise<void> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for guild member operations')
  }

  const guild = await client.guilds.fetch(guildId)
  const member = await guild.members.fetch(userId)

  const timeoutDuration = timeoutUntil ? new Date(timeoutUntil).getTime() - Date.now() : null

  await member.timeout(timeoutDuration, reason)
}

/**
 * Delete a message using Discord.js methods
 */
export async function deleteMessage(
  this: IExecuteFunctions,
  channelId: string,
  messageId: string,
  reason?: string,
  client?: Client,
): Promise<void> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for message operations')
  }

  const channel = await client.channels.fetch(channelId)
  if (!channel?.isTextBased()) {
    throw new NodeOperationError(this.getNode(), `Channel ${channelId} is not a text channel`)
  }

  const message = await channel.messages.fetch(messageId)
  await message.delete()
}

/**
 * Bulk delete messages using Discord.js methods
 */
export async function bulkDeleteMessages(
  this: IExecuteFunctions,
  channelId: string,
  messageIds: string[],
  reason?: string,
  client?: Client,
): Promise<void> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for message operations')
  }

  const channel = await client.channels.fetch(channelId)
  if (!channel?.isTextBased() || !('bulkDelete' in channel)) {
    throw new NodeOperationError(this.getNode(), `Channel ${channelId} does not support bulk delete`)
  }

  await channel.bulkDelete(messageIds, true) // filterOld = true to skip old messages
}

/**
 * Get messages from a channel using Discord.js methods
 */
export async function getChannelMessages(
  this: IExecuteFunctions,
  channelId: string,
  limit = 50,
  before?: string,
  after?: string,
  around?: string,
  client?: Client,
): Promise<object[]> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for message operations')
  }

  const channel = await client.channels.fetch(channelId)
  if (!channel?.isTextBased()) {
    throw new NodeOperationError(this.getNode(), `Channel ${channelId} is not a text channel`)
  }

  const options: { limit: number; before?: string; after?: string; around?: string } = { limit }
  if (before) options.before = before
  if (after) options.after = after
  if (around) options.around = around

  const messagesResult = await channel.messages.fetch(options)
  return Array.from(messagesResult.values()).map((msg) => msg.toJSON() as object)
}

/**
 * Send a message to a Discord channel using Discord.js methods
 */
export async function sendChannelMessage(
  this: IExecuteFunctions,
  channelId: string,
  content: string,
  options?: {
    embeds?: object[]
    files?: object[]
    components?: object[]
    allowedMentions?: object
  },
  files?: object[],
  client?: Client,
): Promise<APIMessage> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for message operations')
  }

  const channel = await client.channels.fetch(channelId)
  if (!channel || !('send' in channel)) {
    throw new NodeOperationError(this.getNode(), `Channel ${channelId} does not support sending messages`)
  }

  const messageOptions: MessageCreateOptions = { content }
  if (options?.embeds?.length) messageOptions.embeds = options.embeds as MessageCreateOptions['embeds']
  if (options?.files?.length) messageOptions.files = options.files as MessageCreateOptions['files']
  if (files?.length) messageOptions.files = files as MessageCreateOptions['files']
  if (options?.components?.length) {
    messageOptions.components = options.components as MessageCreateOptions['components']
  }
  if (options?.allowedMentions) {
    messageOptions.allowedMentions = options.allowedMentions as MessageCreateOptions['allowedMentions']
  }

  const message = await channel.send(messageOptions)
  return message.toJSON() as APIMessage
}

/**
 * Send interaction response using Discord.js REST client
 * Leverages Discord.js built-in multipart form-data handling for files
 */
export async function sendInteractionResponse(
  this: IExecuteFunctions,
  interactionId: string,
  interactionToken: string,
  botToken: string,
  responseType: number,
  data: {
    content?: string
    embeds?: object[]
    files?: object[]
    components?: object[]
    flags?: number
    tts?: boolean
  },
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(botToken)

  // Use Discord.js REST client which handles file uploads automatically
  await rest.post(Routes.interactionCallback(interactionId, interactionToken), {
    body: {
      type: responseType,
      data,
    },
    files: data.files as any[], // Discord.js REST handles AttachmentBuilder[] automatically
  })
}

/**
 * Send interaction follow-up message using Discord.js REST client
 * Leverages Discord.js built-in multipart form-data handling for files
 */
export async function sendInteractionFollowUp(
  this: IExecuteFunctions,
  applicationId: string,
  interactionToken: string,
  botToken: string,
  data: RESTPostAPIWebhookWithTokenJSONBody & { files?: object[] },
): Promise<APIMessage> {
  const rest = new REST({ version: '10' }).setToken(botToken)

  // Use Discord.js REST client which handles file uploads automatically
  const response = (await rest.post(Routes.webhook(applicationId, interactionToken), {
    body: data,
    files: data.files as any[], // Discord.js REST handles AttachmentBuilder[] automatically
  })) as APIMessage

  return response
}

/**
 * Edit interaction original response using Discord.js REST client
 * Leverages Discord.js built-in multipart form-data handling for files
 */
export async function editInteractionResponse(
  this: IExecuteFunctions,
  applicationId: string,
  interactionToken: string,
  botToken: string,
  data: { content?: string; embeds?: object[]; files?: object[]; components?: object[] },
): Promise<APIMessage> {
  const rest = new REST({ version: '10' }).setToken(botToken)

  // Use Discord.js REST client which handles file uploads automatically
  const response = (await rest.patch(Routes.webhookMessage(applicationId, interactionToken, '@original'), {
    body: data,
    files: data.files as any[], // Discord.js REST handles AttachmentBuilder[] automatically
  })) as APIMessage

  return response
}

/**
 * Create a webhook using Discord.js channel managers
 */
export async function createChannelWebhook(
  this: IExecuteFunctions,
  channelId: string,
  name: string,
  avatar?: string,
  reason?: string,
  client?: Client,
): Promise<APIWebhook> {
  if (!isClientReady(client)) {
    throw new NodeOperationError(this.getNode(), 'Discord client is required for webhook operations')
  }

  const channel = await client.channels.fetch(channelId)
  if (!channel || !('createWebhook' in channel)) {
    throw new NodeOperationError(this.getNode(), `Channel ${channelId} does not support webhook creation`)
  }

  const webhookOptions = { name, avatar, reason }
  const webhook = await (channel as TextChannel | NewsChannel).createWebhook(webhookOptions)
  return {
    id: webhook.id,
    token: webhook.token || '',
    url: webhook.url,
    name: webhook.name,
    channel_id: webhook.channelId,
    guild_id: webhook.guildId || '',
    avatar: webhook.avatar,
  } as APIWebhook
}

/**
 * Execute a webhook using Discord.js WebhookClient
 */
export async function executeWebhookMessage(
  this: IExecuteFunctions,
  webhookId: string,
  webhookToken: string,
  content?: string,
  embeds?: object[],
  files?: object[],
  components?: object[],
  username?: string,
  avatarURL?: string,
  wait?: boolean,
  threadId?: string,
): Promise<APIMessage | null> {
  const webhook = new WebhookClient({ id: webhookId, token: webhookToken })

  const options: WebhookMessageCreateOptions = {}
  if (content) options.content = content
  if (embeds?.length) options.embeds = embeds as WebhookMessageCreateOptions['embeds']
  if (files?.length) options.files = files as WebhookMessageCreateOptions['files']
  if (components?.length) options.components = components as WebhookMessageCreateOptions['components']
  if (username) options.username = username
  if (avatarURL) options.avatarURL = avatarURL
  if (threadId) options.threadId = threadId

  // WebhookClient.send returns a Message if wait is true (default), or null if wait is false
  const message = await webhook.send(options)
  return message
    ? ({
        id: message.id,
        channel_id: message.channel_id,
        content: message.content,
        embeds: message.embeds,
        components: message.components,
        timestamp: message.timestamp,
        author: message.author,
        webhook_id: message.webhook_id || undefined,
      } as APIMessage)
    : null
}
