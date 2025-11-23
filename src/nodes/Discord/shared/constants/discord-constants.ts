/**
 * Discord API Constants
 *
 * This module provides Discord API limits, validation patterns, and error messages
 * that are NOT available in Discord.js.
 *
 * NOTE: For Discord.js enums and constants (ButtonStyle, ChannelType, IntentsBitField, etc.),
 * import directly from 'discord.js' instead of re-exporting them here.
 *
 * @see https://discord.com/developers/docs/resources/channel
 * @see https://discord.com/developers/docs/resources/guild
 */

/**
 * Discord API Limits - Use these instead of magic numbers
 */
export const DiscordLimits = {
  // Message limits
  MESSAGE_CONTENT_MAX: 2000,
  MESSAGE_EMBEDS_MAX: 10,
  MESSAGE_ATTACHMENTS_MAX: 10,
  MESSAGE_BULK_DELETE_MAX: 100,
  MESSAGE_BULK_DELETE_MIN: 1,

  // Embed limits
  EMBED_TITLE_MAX: 256,
  EMBED_DESCRIPTION_MAX: 4096,
  EMBED_FIELDS_MAX: 25,
  EMBED_FIELD_NAME_MAX: 256,
  EMBED_FIELD_VALUE_MAX: 1024,
  EMBED_FOOTER_TEXT_MAX: 2048,
  EMBED_AUTHOR_NAME_MAX: 256,
  EMBED_TOTAL_CHARACTERS_MAX: 6000,

  // Component limits
  ACTION_ROW_COMPONENTS_MAX: 5,
  SELECT_MENU_OPTIONS_MAX: 25,
  SELECT_MENU_VALUES_MIN: 1,
  SELECT_MENU_VALUES_MAX: 25,
  BUTTON_LABEL_MAX: 80,

  // Member limits
  MEMBER_TIMEOUT_MAX_SECONDS: 28 * 24 * 60 * 60, // 28 days
  MEMBER_BAN_DELETE_MESSAGE_DAYS_MAX: 7,
  MEMBER_BAN_DELETE_MESSAGE_DAYS_MIN: 0,

  // Guild limits
  GUILD_NAME_MAX: 100,
  GUILD_DESCRIPTION_MAX: 120,

  // Channel limits
  CHANNEL_NAME_MAX: 100,
  CHANNEL_TOPIC_MAX: 1024,

  // Role limits
  ROLE_NAME_MAX: 100,

  // Audit log limits
  AUDIT_LOG_REASON_MAX: 512,

  // Rate limiting (Discord.js handles this automatically)
  RATE_LIMIT_GLOBAL_DELAY: 1000,
  RATE_LIMIT_RETRY_AFTER_MAX: 120000,

  // Snowflake validation
  SNOWFLAKE_MIN_LENGTH: 17,
  SNOWFLAKE_MAX_LENGTH: 19,

  // Webhook limits
  WEBHOOK_NAME_MAX: 80,
  WEBHOOK_AVATAR_SIZE_MAX: 256 * 1024, // 256KB

  // File upload limits (per file)
  FILE_SIZE_MAX_BASIC: 8 * 1024 * 1024, // 8MB for basic users
  FILE_SIZE_MAX_NITRO: 50 * 1024 * 1024, // 50MB for Nitro users

  // Timeout values (Discord.js defaults - don't override unless necessary)
  DEFAULT_REQUEST_TIMEOUT: 15000, // 15 seconds
  DEFAULT_REQUEST_RETRIES: 3,

  // Color values
  COLOR_MIN: 0x000000,
  COLOR_MAX: 0xffffff,
} as const

/**
 * Common Discord.js Validation Patterns
 */
export const DiscordValidationPatterns = {
  // Snowflake ID pattern (17-19 digits)
  SNOWFLAKE: /^\d{17,19}$/,

  // Hex color pattern (#RRGGBB or RRGGBB)
  HEX_COLOR: /^#?([A-Fa-f0-9]{6})$/,

  // Discord mention patterns
  USER_MENTION: /<@!?(\d{17,19})>/,
  ROLE_MENTION: /<@&(\d{17,19})>/,
  CHANNEL_MENTION: /<#(\d{17,19})>/,

  // Discord emoji patterns
  CUSTOM_EMOJI: /<a?:(\w+):(\d{17,19})>/,
  UNICODE_EMOJI:
    /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu,

  // Bot token pattern (basic validation)
  BOT_TOKEN: /^[\w\-.~]+\.[\w\-.~]+\.[\w\-.~]+$/,

  // Webhook token pattern
  WEBHOOK_TOKEN: /^[\w\-.~]+$/,
} as const

/**
 * Discord.js error type mapping for better user experience
 * Consolidated from error-handling.ts for reuse across modules
 */
export const DISCORD_ERROR_MESSAGES = {
  // Authentication errors
  50001: 'Missing access to perform this action. Check bot permissions.',
  50013: 'Missing permissions to perform this action in this channel or server.',
  50014: 'Invalid authentication token. Please check your Discord bot token.',

  // Resource not found errors
  10003: 'Unknown channel. The channel may have been deleted or the bot lacks access.',
  10008: 'Unknown message. The message may have been deleted.',
  10011: 'Unknown role. The role may have been deleted.',
  10013: 'Unknown user. The user may no longer exist.',
  10014: 'Unknown emoji. The emoji may have been deleted.',

  // Rate limiting
  20028: 'Rate limited. Discord is temporarily limiting requests.',

  // Content errors
  50035: 'Invalid form body. Check message content, embeds, or attachments.',
  50045: 'File uploaded is too large. Discord has file size limits.',
  50046: 'File uploaded is not an image. Only images are allowed for this field.',

  // Channel errors
  50021: 'Missing access to the channel.',
  50034: 'You can only bulk delete messages that are under 14 days old.',

  // Guild errors
  30001: 'Maximum number of guilds reached.',
  30007: 'Maximum number of webhooks reached.',
  30016: 'Maximum number of roles reached.',

  // Message errors
  50006: 'Cannot send an empty message.',
  50025: 'Invalid message content. Message may be too long or contain invalid characters.',
  50033: 'Invalid recipients. Check user IDs and permissions.',

  // General errors
  0: 'Unknown error occurred while communicating with Discord.',
  10062: 'Unknown interaction. The interaction may have expired.',
  40001: 'Unauthorized. Invalid Discord token or insufficient permissions.',
  40060: 'Interaction has already been acknowledged.',
} as const
