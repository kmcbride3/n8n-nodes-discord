/**
 * Unit Tests for Discord Message Operations
 *
 * Tests for shared message-building utilities using Discord.js builders
 * and validation patterns for consistent message handling.
 */

import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
} from 'discord.js'
import { NodeOperationError } from 'n8n-workflow'

import {
  createDiscordEmbed,
  createDiscordButton,
  createDiscordSelectMenu,
  createDiscordActionRow,
  createDiscordAttachments,
  buildDiscordMessage,
  type IDiscordMessageConfig,
} from '../../../src/nodes/Discord/shared/operations/message-operations'
import type { APIEmbed } from 'discord.js'

// Test types matching Discord.js official API types
type TestButtonConfig = {
  style: ButtonStyle
  label?: string
  customId?: string
  url?: string
  emoji?: string | { id?: string; name?: string }
  disabled?: boolean
}

type TestSelectConfig = {
  customId: string
  placeholder: string
  disabled?: boolean
  minValues?: number
  maxValues?: number
  options: Array<{
    label: string
    value: string
    description?: string
    emoji?: string | { id?: string; name?: string }
    default?: boolean
  }>
}
import type { IDiscordFile } from '../../../src/nodes/Discord/v2/helpers/types'

// Mock Discord.js components
jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setURL: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setAuthor: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
  })),
  ButtonBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setLabel: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
    setEmoji: jest.fn().mockReturnThis(),
    setURL: jest.fn().mockReturnThis(),
    setDisabled: jest.fn().mockReturnThis(),
  })),
  StringSelectMenuBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setPlaceholder: jest.fn().mockReturnThis(),
    setMinValues: jest.fn().mockReturnThis(),
    setMaxValues: jest.fn().mockReturnThis(),
    addOptions: jest.fn().mockReturnThis(),
    setDisabled: jest.fn().mockReturnThis(),
  })),
  ActionRowBuilder: jest.fn().mockImplementation(() => ({
    addComponents: jest.fn().mockReturnThis(),
  })),
  AttachmentBuilder: jest.fn().mockImplementation((buffer, options) => ({
    name: options?.name || 'file.txt',
    attachment: buffer,
    description: options?.description,
  })),
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5,
  },
}))

// Mock helper functions
jest.mock('../../../src/nodes/Discord/helpers', () => ({
  validateColorHex: jest.fn((color: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new NodeOperationError(
        {
          id: 'test-node',
          name: 'Test Node',
          typeVersion: 1,
          type: 'test',
          position: [0, 0],
          parameters: {},
        },
        `Invalid color format: ${color}`,
      )
    }
    return color
  }),
}))

describe('Message Operations Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createDiscordEmbed', () => {
    test('should create a basic embed with title and description', () => {
      const embedConfig: APIEmbed = {
        title: 'Test Title',
        description: 'Test Description',
      }

      const embed = createDiscordEmbed(embedConfig)

      expect(EmbedBuilder).toHaveBeenCalled()
      expect(embed.setTitle).toHaveBeenCalledWith('Test Title')
      expect(embed.setDescription).toHaveBeenCalledWith('Test Description')
    })

    test('should handle embed with all properties', () => {
      const embedConfig: APIEmbed = {
        title: 'Full Embed',
        description: 'Complete description',
        color: 0xff0000,
        url: 'https://example.com',
        image: { url: 'https://example.com/image.png' },
        thumbnail: { url: 'https://example.com/thumb.png' },
        footer: {
          text: 'Footer text',
          icon_url: 'https://example.com/footer.png',
        },
        author: {
          name: 'Author Name',
          url: 'https://example.com/author',
          icon_url: 'https://example.com/author.png',
        },
        timestamp: '2023-01-01T00:00:00.000Z',
        fields: [
          { name: 'Field 1', value: 'Value 1', inline: true },
          { name: 'Field 2', value: 'Value 2', inline: false },
        ],
      }

      const embed = createDiscordEmbed(embedConfig)

      expect(embed.setTitle).toHaveBeenCalledWith('Full Embed')
      expect(embed.setDescription).toHaveBeenCalledWith('Complete description')
      expect(embed.setColor).toHaveBeenCalledWith(0xff0000)
      expect(embed.setURL).toHaveBeenCalledWith('https://example.com')
      expect(embed.setImage).toHaveBeenCalledWith('https://example.com/image.png')
      expect(embed.setThumbnail).toHaveBeenCalledWith('https://example.com/thumb.png')
      expect(embed.setFooter).toHaveBeenCalledWith({
        text: 'Footer text',
        iconURL: 'https://example.com/footer.png',
      })
      expect(embed.setAuthor).toHaveBeenCalledWith({
        name: 'Author Name',
        url: 'https://example.com/author',
        iconURL: 'https://example.com/author.png',
      })
      expect(embed.setTimestamp).toHaveBeenCalledWith(new Date('2023-01-01T00:00:00.000Z'))
      expect(embed.addFields).toHaveBeenCalledWith([
        { name: 'Field 1', value: 'Value 1', inline: true },
        { name: 'Field 2', value: 'Value 2', inline: false },
      ])
    })

    test('should handle empty embed config', () => {
      const embedConfig: APIEmbed = {}

      const embed = createDiscordEmbed(embedConfig)

      expect(EmbedBuilder).toHaveBeenCalled()
      expect(embed.setTitle).not.toHaveBeenCalled()
      expect(embed.setDescription).not.toHaveBeenCalled()
    })

    test('should handle embed with only fields', () => {
      const embedConfig: APIEmbed = {
        fields: [{ name: 'Only Field', value: 'Only Value', inline: false }],
      }

      const embed = createDiscordEmbed(embedConfig)

      expect(embed.addFields).toHaveBeenCalledWith([{ name: 'Only Field', value: 'Only Value', inline: false }])
    })
  })

  describe('createDiscordButton', () => {
    test('should create a primary button with custom ID', () => {
      const buttonConfig: TestButtonConfig = {
        customId: 'test-button',
        label: 'Test Button',
        style: ButtonStyle.Primary,
      }

      const button = createDiscordButton(buttonConfig)

      expect(ButtonBuilder).toHaveBeenCalled()
      expect(button.setCustomId).toHaveBeenCalledWith('test-button')
      expect(button.setLabel).toHaveBeenCalledWith('Test Button')
      expect(button.setStyle).toHaveBeenCalledWith(ButtonStyle.Primary)
    })

    test('should create a link button with URL', () => {
      const buttonConfig: TestButtonConfig = {
        label: 'Link Button',
        style: ButtonStyle.Link,
        url: 'https://example.com',
      }

      const button = createDiscordButton(buttonConfig)

      expect(button.setLabel).toHaveBeenCalledWith('Link Button')
      expect(button.setStyle).toHaveBeenCalledWith(ButtonStyle.Link)
      expect(button.setURL).toHaveBeenCalledWith('https://example.com')
    })

    test('should create a button with emoji', () => {
      const buttonConfig: TestButtonConfig = {
        customId: 'emoji-button',
        label: 'Emoji Button',
        style: ButtonStyle.Success,
        emoji: '🎉',
      }

      const button = createDiscordButton(buttonConfig)

      expect(button.setEmoji).toHaveBeenCalledWith('🎉')
      expect(button.setStyle).toHaveBeenCalledWith(ButtonStyle.Success)
    })

    test('should create a disabled button', () => {
      const buttonConfig: TestButtonConfig = {
        customId: 'disabled-button',
        label: 'Disabled Button',
        style: ButtonStyle.Secondary,
        disabled: true,
      }

      const button = createDiscordButton(buttonConfig)

      expect(button.setDisabled).toHaveBeenCalledWith(true)
      expect(button.setStyle).toHaveBeenCalledWith(ButtonStyle.Secondary)
    })

    test('should handle all button styles', () => {
      const testCases = [
        { style: ButtonStyle.Primary, name: 'Primary' },
        { style: ButtonStyle.Secondary, name: 'Secondary' },
        { style: ButtonStyle.Success, name: 'Success' },
        { style: ButtonStyle.Danger, name: 'Danger' },
        { style: ButtonStyle.Link, name: 'Link' },
      ]

      testCases.forEach(({ style, name }) => {
        const buttonConfig: TestButtonConfig = {
          customId: style === ButtonStyle.Link ? undefined : `test-${name.toLowerCase()}`,
          label: `${name} Button`,
          style,
          url: style === ButtonStyle.Link ? 'https://example.com' : undefined,
        }

        const button = createDiscordButton(buttonConfig)
        expect(button.setStyle).toHaveBeenCalledWith(style)
      })
    })
  })

  describe('createDiscordSelectMenu', () => {
    test('should create a basic select menu', () => {
      const selectConfig: TestSelectConfig = {
        customId: 'test-select',
        placeholder: 'Choose an option',
        options: [
          { label: 'Option 1', value: 'option1', description: 'First option' },
          { label: 'Option 2', value: 'option2', description: 'Second option' },
        ],
      }

      const selectMenu = createDiscordSelectMenu(selectConfig)

      expect(StringSelectMenuBuilder).toHaveBeenCalled()
      expect(selectMenu.setCustomId).toHaveBeenCalledWith('test-select')
      expect(selectMenu.setPlaceholder).toHaveBeenCalledWith('Choose an option')
      expect(selectMenu.addOptions).toHaveBeenCalledWith([
        { label: 'Option 1', value: 'option1', description: 'First option', emoji: undefined, default: false },
        { label: 'Option 2', value: 'option2', description: 'Second option', emoji: undefined, default: false },
      ])
    })

    test('should create select menu with min/max values', () => {
      const selectConfig: TestSelectConfig = {
        customId: 'multi-select',
        placeholder: 'Choose multiple',
        minValues: 2,
        maxValues: 5,
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
          { label: 'C', value: 'c' },
        ],
      }

      const selectMenu = createDiscordSelectMenu(selectConfig)

      expect(selectMenu.setMinValues).toHaveBeenCalledWith(2)
      expect(selectMenu.setMaxValues).toHaveBeenCalledWith(5)
    })

    test('should create disabled select menu', () => {
      const selectConfig: TestSelectConfig = {
        customId: 'disabled-select',
        placeholder: 'Disabled menu',
        disabled: true,
        options: [{ label: 'Option', value: 'option' }],
      }

      const selectMenu = createDiscordSelectMenu(selectConfig)

      expect(selectMenu.setDisabled).toHaveBeenCalledWith(true)
    })
  })

  describe('createDiscordActionRow', () => {
    test('should create action row with buttons', () => {
      const button1 = new ButtonBuilder()
      const button2 = new ButtonBuilder()
      const components = [button1, button2]

      const actionRow = createDiscordActionRow(components)

      expect(ActionRowBuilder).toHaveBeenCalled()
      expect(actionRow.addComponents).toHaveBeenCalledTimes(2)
      expect(actionRow.addComponents).toHaveBeenCalledWith(button1)
      expect(actionRow.addComponents).toHaveBeenCalledWith(button2)
    })

    test('should create action row with select menu', () => {
      const selectMenu = new StringSelectMenuBuilder()

      const actionRow = createDiscordActionRow([selectMenu])

      expect(actionRow.addComponents).toHaveBeenCalledWith(selectMenu)
    })

    test('should handle empty components array', () => {
      const actionRow = createDiscordActionRow([])

      expect(actionRow.addComponents).not.toHaveBeenCalled()
    })
  })

  describe('createDiscordAttachments', () => {
    test('should create attachments from file objects', () => {
      const files: IDiscordFile[] = [
        {
          attachment: Buffer.from('test file content'),
          name: 'test.txt',
          description: 'text/plain',
        },
        {
          attachment: Buffer.from('image data'),
          name: 'image.png',
          description: 'image/png',
        },
      ]

      const attachments = createDiscordAttachments(files)

      expect(AttachmentBuilder).toHaveBeenCalledTimes(2)
      expect(AttachmentBuilder).toHaveBeenCalledWith(files[0].attachment, {
        name: 'test.txt',
        description: 'text/plain',
      })
      expect(AttachmentBuilder).toHaveBeenCalledWith(files[1].attachment, {
        name: 'image.png',
        description: 'image/png',
      })
      expect(attachments).toHaveLength(2)
    })

    test('should create attachments from binary data strings', () => {
      const files = ['data:text/plain;base64,dGVzdCBkYXRh'] // "test data" in base64

      const attachments = createDiscordAttachments(files)

      expect(AttachmentBuilder).toHaveBeenCalledTimes(1)
      expect(attachments).toHaveLength(1)
    })

    test('should handle mixed file types', () => {
      const files: (IDiscordFile | string)[] = [
        {
          attachment: Buffer.from('object file'),
          name: 'object.txt',
          description: 'text/plain',
        },
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      ]

      const attachments = createDiscordAttachments(files)

      expect(AttachmentBuilder).toHaveBeenCalledTimes(2)
      expect(attachments).toHaveLength(2)
    })

    test('should handle empty files array', () => {
      const attachments = createDiscordAttachments([])

      expect(attachments).toHaveLength(0)
      expect(AttachmentBuilder).not.toHaveBeenCalled()
    })
  })

  describe('buildDiscordMessage', () => {
    test('should build a basic text message', () => {
      const messageConfig: IDiscordMessageConfig = {
        content: 'Hello, Discord!',
      }

      const message = buildDiscordMessage(messageConfig)

      expect(message.content).toBe('Hello, Discord!')
      expect(message.embeds).toBeUndefined()
      expect(message.components).toBeUndefined()
      expect(message.files).toBeUndefined()
    })

    test('should build a message with embed', () => {
      const messageConfig: IDiscordMessageConfig = {
        content: 'Message with embed',
        embed: {
          title: 'Embed Title',
          description: 'Embed Description',
        },
      }

      const message = buildDiscordMessage(messageConfig)

      expect(message.content).toBe('Message with embed')
      expect(message.embeds).toHaveLength(1)
      expect(EmbedBuilder).toHaveBeenCalled()
    })

    test('should build a message with components', () => {
      const messageConfig: IDiscordMessageConfig = {
        content: 'Message with components',
        components: [
          {
            customId: 'btn1',
            label: 'Button 1',
            style: ButtonStyle.Primary,
          },
          {
            customId: 'select-test',
            placeholder: 'Choose option',
            options: [
              { label: 'Option A', value: 'a' },
              { label: 'Option B', value: 'b' },
            ],
          },
        ],
      }

      const message = buildDiscordMessage(messageConfig)

      expect(message.content).toBe('Message with components')
      expect(message.components).toBeDefined()
    })

    test('should build a message with attachments', () => {
      const messageConfig: IDiscordMessageConfig = {
        content: 'Message with files',
        files: [
          {
            attachment: Buffer.from('file content'),
            name: 'attachment.txt',
            description: 'text/plain',
          },
        ],
      }

      const message = buildDiscordMessage(messageConfig)

      expect(message.content).toBe('Message with files')
      expect(message.files).toHaveLength(1)
      expect(AttachmentBuilder).toHaveBeenCalled()
    })

    test('should build a complete message with all components', () => {
      const messageConfig: IDiscordMessageConfig = {
        content: 'Complete message',
        embed: {
          title: 'Complete Embed',
          description: 'All features',
        },
        components: [
          {
            customId: 'complete-btn',
            label: 'Complete Button',
            style: ButtonStyle.Primary,
          },
          {
            customId: 'complete-select',
            placeholder: 'Complete select',
            options: [{ label: 'Complete', value: 'complete' }],
          },
        ],
        files: [
          {
            attachment: Buffer.from('complete file'),
            name: 'complete.txt',
            description: 'text/plain',
          },
        ],
      }

      const message = buildDiscordMessage(messageConfig)

      expect(message.content).toBe('Complete message')
      expect(message.embeds).toHaveLength(1)
      expect(message.components).toBeDefined()
      expect(message.files).toHaveLength(1)
    })

    test('should handle message with only embed (no content)', () => {
      const messageConfig: IDiscordMessageConfig = {
        embed: {
          title: 'Only Embed',
          description: 'No content text',
        },
      }

      const message = buildDiscordMessage(messageConfig)

      expect(message.content).toBeUndefined()
      expect(message.embeds).toHaveLength(1)
    })

    test('should handle allowedMentions configuration', () => {
      const messageConfig: IDiscordMessageConfig = {
        content: 'Message with mentions',
        allowedMentions: {
          users: ['123456789'],
          roles: ['987654321'],
          parse: [],
        },
      }

      const message = buildDiscordMessage(messageConfig)

      expect(message.content).toBe('Message with mentions')
      expect(message.allowedMentions).toEqual({
        users: ['123456789'],
        roles: ['987654321'],
        parse: [],
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid button style gracefully', () => {
      const buttonConfig = {
        customId: 'invalid-style',
        label: 'Invalid Style',
        style: 999 as ButtonStyle, // Invalid style value
      }

      // Should not throw, should handle gracefully
      expect(() => createDiscordButton(buttonConfig)).not.toThrow()
    })

    test('should handle empty select menu options', () => {
      const selectConfig: TestSelectConfig = {
        customId: 'empty-select',
        placeholder: 'No options',
        options: [],
      }

      const selectMenu = createDiscordSelectMenu(selectConfig)

      expect(selectMenu.addOptions).toHaveBeenCalledWith([])
    })

    test('should handle attachment creation with invalid data', () => {
      const invalidFiles = [null, undefined] as unknown as IDiscordFile[]

      expect(() => createDiscordAttachments(invalidFiles)).toThrow()
    })

    test('should handle invalid data strings gracefully', () => {
      const invalidDataString = ['invalid-data-string']

      // Should not throw for invalid data strings, will create with default name
      expect(() => createDiscordAttachments(invalidDataString)).not.toThrow()
    })
  })
})
