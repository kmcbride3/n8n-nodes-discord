/**
 * Phase 3.2: Test Setup Configuration
 *
 * Jest setup configuration for Discord node testing with proper Discord.js mocking
 */

// Suppress deprecation warnings from dependencies
const originalEmitWarning = process.emitWarning
process.emitWarning = function (warning: any, ...args: any[]) {
  // Suppress DEP0169 warning from dependencies (url.parse in node_modules)
  if (typeof warning === 'string' && warning.includes('DEP0169')) {
    return
  }
  if (warning && warning.code === 'DEP0169') {
    return
  }
  // Let other warnings through
  return originalEmitWarning.call(process, warning, ...args)
}

// Create comprehensive Discord.js mocks
const mockClient = {
  login: jest.fn().mockResolvedValue('token'),
  destroy: jest.fn().mockResolvedValue(undefined),
  user: { id: '123456789012345678', username: 'TestBot', tag: 'TestBot#0001' },
  guilds: {
    cache: new Map(),
    fetch: jest.fn(),
  },
  channels: {
    cache: new Map(),
    fetch: jest.fn(),
  },
  users: {
    cache: new Map(),
    fetch: jest.fn(),
  },
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  ws: {
    status: 0, // Ready status
    ping: 50,
  },
  readyAt: new Date(),
  uptime: 60000,
}

const mockGuild = {
  id: '123456789012345678',
  name: 'Test Guild',
  members: {
    cache: new Map(),
    fetch: jest.fn(),
    ban: jest.fn().mockResolvedValue(undefined),
    kick: jest.fn().mockResolvedValue(undefined),
  },
  channels: {
    cache: new Map(),
    fetch: jest.fn(),
  },
  roles: {
    cache: new Map(),
    fetch: jest.fn(),
  },
}

const mockChannel = {
  id: '123456789012345678',
  name: 'test-channel',
  type: 0, // Text channel
  send: jest.fn().mockResolvedValue({ id: '123456789012345678' }),
  bulkDelete: jest.fn().mockResolvedValue(new Map()),
  messages: {
    fetch: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  createMessageCollector: jest.fn(),
  createMessageComponentCollector: jest.fn(),
}

const mockMessage = {
  id: '123456789012345678',
  content: 'Test message',
  author: { id: '123456789012345678', username: 'TestUser' },
  channel: mockChannel,
  guild: mockGuild,
  delete: jest.fn().mockResolvedValue(undefined),
  edit: jest.fn().mockResolvedValue({}),
  react: jest.fn().mockResolvedValue(undefined),
  reply: jest.fn().mockResolvedValue({}),
}

const mockMember = {
  id: '123456789012345678',
  user: { id: '123456789012345678', username: 'TestUser' },
  guild: mockGuild,
  ban: jest.fn().mockResolvedValue(undefined),
  kick: jest.fn().mockResolvedValue(undefined),
  timeout: jest.fn().mockResolvedValue(undefined),
  roles: {
    add: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    cache: new Map(),
  },
}

// Mock Discord.js classes and functions
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
  GatewayIntentBits: {
    Guilds: 1 << 0,
    GuildMembers: 1 << 1,
    GuildMessages: 1 << 9,
    MessageContent: 1 << 15,
    GuildMessageReactions: 1 << 10,
    DirectMessages: 1 << 12,
  },
  IntentsBitField: {
    Flags: {
      Guilds: 1 << 0,
      GuildMembers: 1 << 1,
      GuildBans: 1 << 2,
      GuildEmojisAndStickers: 1 << 3,
      GuildIntegrations: 1 << 4,
      GuildWebhooks: 1 << 5,
      GuildInvites: 1 << 6,
      GuildVoiceStates: 1 << 7,
      GuildPresences: 1 << 8,
      GuildMessages: 1 << 9,
      GuildMessageReactions: 1 << 10,
      GuildMessageTyping: 1 << 11,
      DirectMessages: 1 << 12,
      DirectMessageReactions: 1 << 13,
      DirectMessageTyping: 1 << 14,
      MessageContent: 1 << 15,
      GuildScheduledEvents: 1 << 16,
      AutoModerationConfiguration: 1 << 20,
      AutoModerationExecution: 1 << 21,
      GuildModeration: 1 << 22,
    },
  },
  MessageFlags: {
    Ephemeral: 1 << 6,
    SuppressEmbeds: 1 << 2,
    SuppressNotifications: 1 << 12,
    Loading: 1 << 7,
    FailedToMentionSomeRolesInThread: 1 << 8,
    ShouldShowLinkNotDiscordWarning: 1 << 10,
  },
  ComponentType: {
    ActionRow: 1,
    Button: 2,
    StringSelect: 3,
    TextInput: 4,
    UserSelect: 5,
    RoleSelect: 6,
    MentionableSelect: 7,
    ChannelSelect: 8,
  },
  InteractionType: {
    Ping: 1,
    ApplicationCommand: 2,
    MessageComponent: 3,
    ApplicationCommandAutocomplete: 4,
    ModalSubmit: 5,
  },
  ApplicationCommandType: {
    ChatInput: 1,
    User: 2,
    Message: 3,
  },
  ApplicationCommandOptionType: {
    Subcommand: 1,
    SubcommandGroup: 2,
    String: 3,
    Integer: 4,
    Boolean: 5,
    User: 6,
    Channel: 7,
    Role: 8,
    Mentionable: 9,
    Number: 10,
    Attachment: 11,
  },
  TextInputStyle: {
    Short: 1,
    Paragraph: 2,
  },
  ActivityType: {
    Playing: 0,
    Streaming: 1,
    Listening: 2,
    Watching: 3,
    Custom: 4,
    Competing: 5,
  },
  Partials: {
    Message: 0,
    Channel: 1,
    Reaction: 2,
    User: 3,
    GuildMember: 4,
  },
  Collection: Map,
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({
      title: 'Test Embed',
      description: 'Test Description',
      color: 0x0099ff,
    }),
  })),
  ActionRowBuilder: jest.fn().mockImplementation(() => ({
    addComponents: jest.fn().mockReturnThis(),
    setComponents: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({ type: 1, components: [] }),
  })),
  ButtonBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setLabel: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
    setEmoji: jest.fn().mockReturnThis(),
    setDisabled: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({
      type: 2,
      style: 1,
      label: 'Test Button',
      custom_id: 'test_button',
    }),
  })),
  SelectMenuBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setPlaceholder: jest.fn().mockReturnThis(),
    addOptions: jest.fn().mockReturnThis(),
    setOptions: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({
      type: 3,
      custom_id: 'test_select',
      placeholder: 'Select an option',
      options: [],
    }),
  })),
  AttachmentBuilder: jest.fn().mockImplementation((attachment: unknown, options?: Record<string, unknown>) => ({
    attachment,
    name: (options && (options['name'] as string)) || 'attachment.txt',
    description: options && (options['description'] as string),
  })),
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5,
  },
  ChannelType: {
    GuildText: 0,
    DM: 1,
    GuildVoice: 2,
    GroupDM: 3,
    GuildCategory: 4,
  },
  PermissionFlagsBits: {
    SendMessages: BigInt(1 << 11),
    ManageMessages: BigInt(1 << 13),
    BanMembers: BigInt(1 << 2),
    KickMembers: BigInt(1 << 1),
    ManageRoles: BigInt(1 << 28),
  },
  SnowflakeUtil: {
    timestampFrom: jest.fn((snowflake: string) => {
      // Mock Discord snowflake timestamp extraction
      const id = BigInt(snowflake)
      const discordEpoch = BigInt('1420070400000')
      const shiftedId = id >> BigInt(22)
      return Number(shiftedId + discordEpoch)
    }),
    isValid: jest.fn((snowflake: string) => {
      return /^\d{17,19}$/.test(snowflake)
    }),
    decode: jest.fn((snowflake: string) => {
      // Mock Discord snowflake decode - validates and extracts parts
      if (!/^\d{17,19}$/.test(snowflake)) {
        throw new Error('Invalid snowflake')
      }
      const id = BigInt(snowflake)
      const discordEpoch = BigInt('1420070400000')
      const timestamp = Number((id >> BigInt(22)) + discordEpoch)
      const workerId = Number((id & BigInt(0x3e0000)) >> BigInt(17))
      const processId = Number((id & BigInt(0x1f000)) >> BigInt(12))
      const increment = Number(id & BigInt(0xfff))
      return {
        timestamp: new Date(timestamp),
        workerId,
        processId,
        increment,
        binary: id.toString(2).padStart(64, '0'),
      }
    }),
  },
  verifyString: jest.fn((data: unknown, error?: string) => {
    if (typeof data !== 'string') {
      throw new Error(error || 'Expected string')
    }
    return data
  }),
  // Mock error types
  DiscordAPIError: jest.fn().mockImplementation((message: string, code: number) => {
    const error = new Error(message)
    error.name = 'DiscordAPIError'
    ;(error as Error & Record<string, unknown>).code = code
    return error
  }),
  RateLimitError: jest.fn().mockImplementation((message: string) => {
    const error = new Error(message)
    error.name = 'RateLimitError'
    return error
  }),
  HTTPError: jest.fn().mockImplementation((message: string, status: number) => {
    const error = new Error(message)
    error.name = 'HTTPError'
    ;(error as Error & Record<string, unknown>).status = status
    return error
  }),
  // Mock REST client for rate limiting tests
  REST: jest.fn().mockImplementation(() => ({
    setToken: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Mock n8n workflow types with proper class constructors matching n8n's actual signature
class NodeOperationError extends Error {
  node?: unknown
  context?: unknown
  constructor(node: unknown, message: string, context?: unknown) {
    super(message)
    this.name = 'NodeOperationError'
    this.node = node
    this.context = context
    Object.setPrototypeOf(this, NodeOperationError.prototype)
  }
}

class NodeApiError extends Error {
  node?: unknown
  context?: unknown
  constructor(node: unknown, message: string, context?: unknown) {
    super(message)
    this.name = 'NodeApiError'
    this.node = node
    this.context = context
    Object.setPrototypeOf(this, NodeApiError.prototype)
  }
}

class NodeSSLError extends Error {
  node?: unknown
  constructor(node: unknown, message: string) {
    super(message)
    this.name = 'NodeSSLError'
    this.node = node
    Object.setPrototypeOf(this, NodeSSLError.prototype)
  }
}

jest.mock('n8n-workflow', () => ({
  NodeOperationError,
  NodeApiError,
  NodeSSLError,
  LoggerProxy: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  },
}))

// Export mock objects for use in tests
export const discordMocks = {
  client: mockClient,
  guild: mockGuild,
  channel: mockChannel,
  message: mockMessage,
  member: mockMember,
}

// Set test timeout
jest.setTimeout(30000)
