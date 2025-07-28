import { AttachmentBuilder, Channel, Client, ColorResolvable, EmbedBuilder, Message, TextChannel } from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { IDiscordNodeMessageParameters } from '../../Discord.node'
import { addLog } from '../helpers'
import state from '../state'

/**
 * Creates a data URL file attachment
 */
function createAttachmentFromDataUrl(dataUrl: string, prefix: string): { attachment: AttachmentBuilder; url: string } {
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64')
  const reg = new RegExp(/data:image\/([a-z]+);base64/gi)
  const mime = reg.exec(dataUrl) ?? []
  const fileName = `${prefix}.${mime[1]}`
  const file = new AttachmentBuilder(buffer, { name: fileName })
  return {
    attachment: file,
    url: `attachment://${fileName}`,
  }
}

/**
 * Creates an embed based on node parameters
 */
function createEmbed(nodeParameters: IDiscordNodeMessageParameters): {
  embed: EmbedBuilder | undefined
  embedFiles: AttachmentBuilder[]
} {
  const embedFiles: AttachmentBuilder[] = []

  if (!nodeParameters.embed) {
    return { embed: undefined, embedFiles }
  }

  const embed = new EmbedBuilder()

  if (nodeParameters.title) embed.setTitle(nodeParameters.title)
  if (nodeParameters.url) embed.setURL(nodeParameters.url)
  if (nodeParameters.description) embed.setDescription(nodeParameters.description)
  if (nodeParameters.color) embed.setColor(nodeParameters.color as ColorResolvable)
  if (nodeParameters.timestamp) embed.setTimestamp(Date.parse(nodeParameters.timestamp))

  // Handle footer
  if (nodeParameters.footerText) {
    let iconURL = nodeParameters.footerIconUrl
    if (iconURL?.match(/^data:/)) {
      const result = createAttachmentFromDataUrl(iconURL, 'footer')
      embedFiles.push(result.attachment)
      iconURL = result.url
    }
    embed.setFooter({
      text: nodeParameters.footerText,
      ...(iconURL ? { iconURL } : {}),
    })
  }

  // Handle image
  if (nodeParameters.imageUrl) {
    if (/^data:/.test(nodeParameters.imageUrl)) {
      const result = createAttachmentFromDataUrl(nodeParameters.imageUrl, 'image')
      embedFiles.push(result.attachment)
      embed.setImage(result.url)
    } else embed.setImage(nodeParameters.imageUrl)
  }

  // Handle thumbnail
  if (nodeParameters.thumbnailUrl) {
    if (/^data:/.test(nodeParameters.thumbnailUrl)) {
      const result = createAttachmentFromDataUrl(nodeParameters.thumbnailUrl, 'thumbnail')
      embedFiles.push(result.attachment)
      embed.setThumbnail(result.url)
    } else embed.setThumbnail(nodeParameters.thumbnailUrl)
  }

  // Handle author
  if (nodeParameters.authorName) {
    let iconURL = nodeParameters.authorIconUrl
    if (iconURL?.match(/^data:/)) {
      const result = createAttachmentFromDataUrl(iconURL, 'author')
      embedFiles.push(result.attachment)
      iconURL = result.url
    }
    embed.setAuthor({
      name: nodeParameters.authorName,
      ...(iconURL ? { iconURL } : {}),
      ...(nodeParameters.authorUrl ? { url: nodeParameters.authorUrl } : {}),
    })
  }

  // Handle fields
  if (nodeParameters.fields?.field) {
    nodeParameters.fields.field.forEach((field: { name?: string; value?: string; inline?: boolean }) => {
      if (field.name && field.value) {
        embed.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline,
        })
      } else {
        embed.addFields({ name: '\u200B', value: '\u200B' })
      }
    })
  }

  return { embed, embedFiles }
}

/**
 * Prepares files for the message
 */
function prepareFiles(
  nodeParameters: IDiscordNodeMessageParameters,
  embedFiles: AttachmentBuilder[],
): (AttachmentBuilder | string | Buffer)[] {
  let files: (AttachmentBuilder | string | Buffer)[] = []

  if (nodeParameters.files?.file) {
    files = nodeParameters.files.file.map((file: { url: string }) => {
      if (/^data:/.test(file.url)) {
        return Buffer.from(file.url.split(',')[1], 'base64')
      }
      return file.url
    })
  }

  if (embedFiles.length) files = files.concat(embedFiles)

  return files
}

/**
 * Creates content for the message including mentions
 */
function createContent(nodeParameters: IDiscordNodeMessageParameters): string {
  let content = ''
  let mentions = ''

  if (nodeParameters.content) content += nodeParameters.content

  nodeParameters.mentionRoles.forEach((role: string) => {
    mentions += ` <@&${role}>`
  })

  if (mentions) content += mentions

  return content
}

/**
 * Handles updating a placeholder message
 */
async function handlePlaceholderUpdate(
  channel: Channel,
  executionMatching: { placeholderId?: string; channelId?: string },
  sendObject: { content: string; embeds?: EmbedBuilder[]; files?: (AttachmentBuilder | string | Buffer)[] },
  channelId: string,
  socket: Socket,
  ipc: typeof Ipc,
  client: Client,
): Promise<boolean> {
  if (!executionMatching?.placeholderId) return false

  const realPlaceholderId = state.placeholderMatching[executionMatching.placeholderId]
  if (!realPlaceholderId) return false

  // Check if channel has messages collection (exists on text-based channels)
  const message =
    'messages' in channel
      ? await channel.messages.fetch(realPlaceholderId).catch((e: Error) => {
          addLog(`${e}`, client)
        })
      : undefined

  if (executionMatching.placeholderId) {
    const placeholderId = executionMatching.placeholderId
    Reflect.deleteProperty(state.placeholderMatching, placeholderId)
  }

  if (message?.edit) {
    let retryCount = 0
    const retry = async () => {
      const placeholderId = executionMatching.placeholderId
      if (placeholderId && state.placeholderWaiting[placeholderId] && retryCount < 10) {
        retryCount++
        setTimeout(() => retry(), 300)
      } else {
        await message.edit(sendObject).catch((e: Error) => {
          addLog(`${e}`, client)
        })
        ipc.server.emit(socket, 'send:message', {
          channelId,
          messageId: message.id,
        })
      }
    }
    await retry()
    return true
  }

  return false
}

/**
 * Processes the message channel
 */
async function processMessageChannel(
  channel: Channel,
  nodeParameters: IDiscordNodeMessageParameters,
  executionMatching: { placeholderId?: string; channelId?: string } | undefined,
  socket: Socket,
  channelId: string,
  ipc: typeof Ipc,
  client: Client,
): Promise<void> {
  if (!channel || !channel.isTextBased()) return

  addLog(`send:message to ${channelId}`, client)

  // Create embed if needed
  const { embed, embedFiles } = createEmbed(nodeParameters)

  // Prepare content and files
  const content = createContent(nodeParameters)
  const files = prepareFiles(nodeParameters, embedFiles)

  // Create the message object
  const sendObject = {
    content: content ?? '',
    ...(embed ? { embeds: [embed] } : {}),
    ...(files.length ? { files } : {}),
  }

  // Handle placeholder message update if needed
  if (nodeParameters.triggerPlaceholder && executionMatching?.placeholderId) {
    const updated = await handlePlaceholderUpdate(
      channel,
      executionMatching,
      sendObject,
      channelId,
      socket,
      ipc,
      client,
    )
    if (updated) return
  }

  // Send new message
  const message = (await (channel as TextChannel).send(sendObject).catch((e: Error) => {
    addLog(`${e}`, client)
  })) as Message

  ipc.server.emit(socket, 'send:message', { channelId, messageId: message?.id })
}

export default function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('send:message', (nodeParameters: IDiscordNodeMessageParameters, socket: Socket) => {
    try {
      if (state.ready) {
        const executionMatching = state.executionMatching[nodeParameters.executionId]
        let channelId = ''

        if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel) {
          channelId = executionMatching?.channelId || ''
        } else {
          channelId = nodeParameters.channelId
        }

        client.channels
          .fetch(channelId)
          .then(async (channel: Channel | null): Promise<void> => {
            if (channel) {
              await processMessageChannel(channel, nodeParameters, executionMatching, socket, channelId, ipc, client)
            } else {
              addLog(`Channel ${channelId} not found`, client)
              ipc.server.emit(socket, 'send:message', false)
            }
          })
          .catch((e: Error) => {
            addLog(`${e}`, client)
            ipc.server.emit(socket, 'send:message', false)
          })
      }
    } catch (e) {
      addLog(`${e}`, client)
      ipc.server.emit(socket, 'send:message', false)
    }
  })

  ipc.of.bot.on('send:message', (data: { channelId: string; content: string }) => {
    const channel = client.channels.cache.get(data.channelId)
    if (channel && channel.isTextBased()) {
      ;(channel as TextChannel).send(data.content)
    }
  })
}
