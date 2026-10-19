/**
 * Shared message filter helpers for Discord V2 trigger registry.
 *
 * Extracted from the three nearly-identical filter blocks in triggerRegistry.ts
 * (message, message_update, directMessage triggers) to eliminate duplication and
 * centralise the ReDoS-safe regex path via safeRegexTest.
 *
 * @module v2/triggers/message-filters
 */

import type { Message, PartialMessage } from 'discord.js'
import type { ITriggerFunctions } from 'n8n-workflow'

import { safeRegexTest } from '../../helpers/security'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IBotFilterOptions {
  botBehavior?: 'ignoreAllBots' | 'ignoreSelf' | 'ignoreOthers' | 'allowAllBots'
}

export interface IMessageFilterOptions {
  contentMatchType?: string
  contentMatchPattern?: string
  caseSensitive?: boolean
  hasAttachments?: 'any' | 'with' | 'without'
}

// ---------------------------------------------------------------------------
// applyBotFilter
// ---------------------------------------------------------------------------

/**
 * Apply bot-message filtering based on the `botFilters.botBehavior` node parameter.
 *
 * Returns `false` (skip event) when the message should be suppressed, or `true`
 * when it should pass through.  Returns `undefined` when the message is not from
 * a bot — callers should continue to the content-filter step in that case.
 *
 * @param context    - n8n trigger execution context (for getNodeParameter)
 * @param isBot      - Whether message.author.bot is true
 * @param authorId   - message.author.id
 * @param selfId     - client.user?.id (the bot's own Discord user ID)
 * @returns true = pass, false = skip, undefined = not a bot message (continue)
 */
export function applyBotFilter(
  context: ITriggerFunctions,
  isBot: boolean,
  authorId: string,
  selfId: string | undefined,
): boolean | undefined {
  if (!isBot) return undefined // Not a bot — let content filter decide

  const botFilters = context.getNodeParameter('botFilters', 0, {}) as IBotFilterOptions
  const botBehavior = botFilters.botBehavior ?? 'ignoreAllBots'

  switch (botBehavior) {
    case 'ignoreAllBots':
      return false
    case 'ignoreSelf':
      return authorId !== selfId
    case 'ignoreOthers':
      return authorId === selfId
    case 'allowAllBots':
      return true
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// applyMessageContentFilter
// ---------------------------------------------------------------------------

/**
 * Apply content-matching and attachment filters based on node parameters.
 *
 * Returns `true` if the message passes all active filters, `false` otherwise.
 * Uses `safeRegexTest` for the `regex` match type to prevent ReDoS attacks.
 *
 * @param context - n8n trigger execution context (for getNodeParameter)
 * @param message - The fully-fetched Discord Message (or PartialMessage cast to Message)
 * @returns true = pass, false = skip
 */
export function applyMessageContentFilter(context: ITriggerFunctions, message: Message | PartialMessage): boolean {
  const messageFilters = context.getNodeParameter('messageFilters', 0, {}) as IMessageFilterOptions

  const matchType = messageFilters.contentMatchType ?? 'any'
  const pattern = messageFilters.contentMatchPattern ?? ''
  const caseSensitive = messageFilters.caseSensitive ?? false
  const hasAttachmentsFilter = messageFilters.hasAttachments ?? 'any'

  const fullMessage = message as Message

  // Content matching
  if (matchType !== 'any') {
    if (matchType === 'mentionsBot') {
      // mentionsBot doesn't require a pattern
      if (!fullMessage.mentions.has(fullMessage.client.user!)) return false
    } else if (pattern) {
      const content = caseSensitive ? fullMessage.content : fullMessage.content.toLowerCase()
      const searchPattern = caseSensitive ? pattern : pattern.toLowerCase()

      switch (matchType) {
        case 'contains':
          if (!content.includes(searchPattern)) return false
          break
        case 'exact':
          if (content !== searchPattern) return false
          break
        case 'startsWith':
          if (!content.startsWith(searchPattern)) return false
          break
        case 'endsWith':
          if (!content.endsWith(searchPattern)) return false
          break
        case 'regex':
          // Use safeRegexTest to prevent ReDoS attacks on user-supplied patterns
          if (!safeRegexTest(pattern, fullMessage.content, caseSensitive ? '' : 'i')) return false
          break
        case 'mentionsUser': {
          // Support both <@123456789> format and plain ID
          const userId = pattern.replace(/[<@!>]/g, '')
          if (!fullMessage.mentions.users.has(userId)) return false
          break
        }
        case 'mentionsRole': {
          // Support both <@&123456789> format, plain ID, and role name
          const rolePattern = pattern.replace(/[<@&>]/g, '')
          const hasRoleMention = fullMessage.mentions.roles.some(
            (role) => role.id === rolePattern || role.name.toLowerCase() === searchPattern,
          )
          if (!hasRoleMention) return false
          break
        }
        case 'mentionsChannel': {
          // Support both <#123456789> format and plain ID
          const channelId = pattern.replace(/[<#>]/g, '')
          if (!fullMessage.mentions.channels.has(channelId)) return false
          break
        }
      }
    }
  }

  // Attachment filtering
  if (hasAttachmentsFilter === 'with' && fullMessage.attachments.size === 0) return false
  if (hasAttachmentsFilter === 'without' && fullMessage.attachments.size > 0) return false

  return true
}
