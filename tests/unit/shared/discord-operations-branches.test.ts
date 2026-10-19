/**
 * Discord Operations — Happy-Path and Missing-Branch Coverage
 *
 * The existing discord-operations.test.ts covers only the "client not ready"
 * failure path for each function (meaning isClientReady() = false).  This file
 * exercises the branches that require a ready client:
 *
 * - Successful guild-member operations
 * - Error paths that need a live client (role not found, non-text channel, etc.)
 * - Optional-parameter branches in sendChannelMessage / getChannelMessages
 * - timeoutMember with null timeout (remove timeout path)
 * - createChannelWebhook channel-without-webhook error
 * - bulkDeleteMessages channel-without-bulkDelete error
 * - executeWebhookMessage with all options
 */

import { NodeOperationError } from 'n8n-workflow'
import type { IExecuteFunctions } from 'n8n-workflow'
import type { Client } from 'discord.js'

import * as discordOps from '../../../src/nodes/Discord/v2/helpers/discord-operations'

// ---------------------------------------------------------------------------
// Mock node context
// ---------------------------------------------------------------------------

const mockNode = {
  id: 'test-node',
  name: 'Test Node',
  type: 'discord',
  typeVersion: 2,
  position: [0, 0] as [number, number],
  parameters: {},
}

const mockCtx = {
  getNode: jest.fn(() => mockNode),
} as unknown as IExecuteFunctions

// ---------------------------------------------------------------------------
// Spec helpers
// ---------------------------------------------------------------------------

function readyClient(guildShape: Record<string, unknown> = {}, channelShape: Record<string, unknown> = {}): Client {
  return {
    isReady: jest.fn(() => true),
    guilds: {
      fetch: jest.fn().mockResolvedValue({
        id: 'guild1',
        name: 'Test Guild',
        bans: { create: jest.fn().mockResolvedValue(undefined) },
        members: {
          fetch: jest.fn().mockResolvedValue({
            roles: {
              add: jest.fn().mockResolvedValue(undefined),
              remove: jest.fn().mockResolvedValue(undefined),
            },
            kick: jest.fn().mockResolvedValue(undefined),
            timeout: jest.fn().mockResolvedValue(undefined),
          }),
        },
        roles: {
          fetch: jest.fn().mockResolvedValue({
            id: 'role1',
            name: 'Admin',
          }),
        },
        channels: { fetch: jest.fn().mockResolvedValue(new Map()) },
        ...guildShape,
      }),
    },
    channels: {
      fetch: jest.fn().mockResolvedValue({
        isTextBased: jest.fn(() => true),
        bulkDelete: jest.fn().mockResolvedValue(undefined),
        messages: {
          fetch: jest.fn().mockResolvedValue(
            new Map([
              [
                'msg1',
                {
                  id: 'msg1',
                  content: 'hello',
                  author: { id: 'u1' },
                  toJSON: () => ({ id: 'msg1', content: 'hello' }),
                },
              ],
            ]),
          ),
        },
        send: jest.fn().mockResolvedValue({
          id: 'sent1',
          content: 'hi',
          channel_id: 'ch1',
          author: { id: 'bot1' },
          embeds: [],
          components: [],
          timestamp: new Date().toISOString(),
          toJSON: () => ({ id: 'sent1' }),
        }),
        createWebhook: jest.fn().mockResolvedValue({
          id: 'wh1',
          token: 'tok',
          url: 'https://discord.com/api/webhooks/wh1/tok',
          name: 'My Webhook',
          channelId: 'ch1',
          guildId: 'guild1',
          avatar: null,
        }),
        ...channelShape,
      }),
    },
  } as unknown as Client
}

// ---------------------------------------------------------------------------
// addMemberRole — happy path & role-not-found
// ---------------------------------------------------------------------------

describe('addMemberRole', () => {
  test('succeeds when role exists', async () => {
    await expect(
      discordOps.addMemberRole.call(mockCtx, 'guild1', 'user1', 'role1', 'reason', readyClient()),
    ).resolves.toBeUndefined()
  })

  test('throws NodeOperationError when role not found', async () => {
    const client = readyClient({
      roles: { fetch: jest.fn().mockResolvedValue(null) },
    })
    await expect(
      discordOps.addMemberRole.call(mockCtx, 'guild1', 'user1', 'role1', undefined, client),
    ).rejects.toThrow(NodeOperationError)
  })
})

// ---------------------------------------------------------------------------
// removeMemberRole — happy path & role-not-found
// ---------------------------------------------------------------------------

describe('removeMemberRole', () => {
  test('succeeds when role exists', async () => {
    await expect(
      discordOps.removeMemberRole.call(mockCtx, 'guild1', 'user1', 'role1', 'reason', readyClient()),
    ).resolves.toBeUndefined()
  })

  test('throws NodeOperationError when role not found', async () => {
    const client = readyClient({
      roles: { fetch: jest.fn().mockResolvedValue(null) },
    })
    await expect(
      discordOps.removeMemberRole.call(mockCtx, 'guild1', 'user1', 'role1', undefined, client),
    ).rejects.toThrow(NodeOperationError)
  })
})

// ---------------------------------------------------------------------------
// banMember — happy path with deleteMessageDays
// ---------------------------------------------------------------------------

describe('banMember', () => {
  test('succeeds with default deleteMessageDays (0)', async () => {
    await expect(
      discordOps.banMember.call(mockCtx, 'guild1', 'user1', 0, 'spam', readyClient()),
    ).resolves.toBeUndefined()
  })

  test('converts deleteMessageDays to seconds', async () => {
    const banCreate = jest.fn().mockResolvedValue(undefined)
    const client = readyClient({ bans: { create: banCreate } })
    await discordOps.banMember.call(mockCtx, 'guild1', 'user1', 7, 'spam', client)
    expect(banCreate).toHaveBeenCalledWith('user1', {
      deleteMessageSeconds: 7 * 24 * 60 * 60,
      reason: 'spam',
    })
  })
})

// ---------------------------------------------------------------------------
// kickMember — happy path
// ---------------------------------------------------------------------------

describe('kickMember', () => {
  test('succeeds with reason', async () => {
    await expect(
      discordOps.kickMember.call(mockCtx, 'guild1', 'user1', 'rule violation', readyClient()),
    ).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// timeoutMember — with and without timeout
// ---------------------------------------------------------------------------

describe('timeoutMember', () => {
  test('applies timeout when timeoutUntil provided', async () => {
    const futureDate = new Date(Date.now() + 3_600_000).toISOString()
    await expect(
      discordOps.timeoutMember.call(mockCtx, 'guild1', 'user1', futureDate, 'spam', readyClient()),
    ).resolves.toBeUndefined()
  })

  test('removes timeout when timeoutUntil is null', async () => {
    const memberTimeout = jest.fn().mockResolvedValue(undefined)
    const client = readyClient({
      members: { fetch: jest.fn().mockResolvedValue({ timeout: memberTimeout }) },
    })
    await discordOps.timeoutMember.call(mockCtx, 'guild1', 'user1', null, undefined, client)
    expect(memberTimeout).toHaveBeenCalledWith(null, undefined)
  })
})

// ---------------------------------------------------------------------------
// deleteMessage — happy path & non-text-channel error
// ---------------------------------------------------------------------------

describe('deleteMessage', () => {
  test('succeeds with text channel', async () => {
    const msgDelete = jest.fn().mockResolvedValue(undefined)
    const client = readyClient(
      {},
      {
        isTextBased: jest.fn(() => true),
        messages: { fetch: jest.fn().mockResolvedValue({ delete: msgDelete }) },
      },
    )
    await expect(
      discordOps.deleteMessage.call(mockCtx, 'ch1', 'msg1', 'cleanup', client),
    ).resolves.toBeUndefined()
    expect(msgDelete).toHaveBeenCalled()
  })

  test('throws when channel is not text-based', async () => {
    const client = readyClient({}, { isTextBased: jest.fn(() => false) })
    await expect(
      discordOps.deleteMessage.call(mockCtx, 'ch1', 'msg1', undefined, client),
    ).rejects.toThrow(NodeOperationError)
  })
})

// ---------------------------------------------------------------------------
// bulkDeleteMessages — happy path & no-bulkDelete error
// ---------------------------------------------------------------------------

describe('bulkDeleteMessages', () => {
  test('succeeds with bulk-delete capable channel', async () => {
    await expect(
      discordOps.bulkDeleteMessages.call(mockCtx, 'ch1', ['m1', 'm2'], 'clean', readyClient()),
    ).resolves.toBeUndefined()
  })

  test('throws when channel lacks bulkDelete', async () => {
    const client = readyClient({}, { isTextBased: jest.fn(() => true) }) // no bulkDelete prop
    ;(client.channels.fetch as jest.Mock).mockResolvedValue({
      isTextBased: jest.fn(() => true),
      // deliberately no 'bulkDelete' key
    })
    await expect(
      discordOps.bulkDeleteMessages.call(mockCtx, 'ch1', ['m1'], undefined, client),
    ).rejects.toThrow(NodeOperationError)
  })
})

// ---------------------------------------------------------------------------
// getChannelMessages — with all option variants
// ---------------------------------------------------------------------------

describe('getChannelMessages', () => {
  test('fetches without any options', async () => {
    const result = await discordOps.getChannelMessages.call(mockCtx, 'ch1', 50, undefined, undefined, undefined, readyClient())
    expect(Array.isArray(result)).toBe(true)
  })

  test('passes before/after/around options', async () => {
    const fetchMessages = jest.fn().mockResolvedValue(new Map())
    const client = readyClient({}, { isTextBased: jest.fn(() => true), messages: { fetch: fetchMessages } })
    await discordOps.getChannelMessages.call(mockCtx, 'ch1', 10, 'msg-before', 'msg-after', 'msg-around', client)
    expect(fetchMessages).toHaveBeenCalledWith({
      limit: 10,
      before: 'msg-before',
      after: 'msg-after',
      around: 'msg-around',
    })
  })

  test('throws when channel is not text-based', async () => {
    const client = readyClient({}, { isTextBased: jest.fn(() => false) })
    await expect(
      discordOps.getChannelMessages.call(mockCtx, 'ch1', 50, undefined, undefined, undefined, client),
    ).rejects.toThrow(NodeOperationError)
  })
})

// ---------------------------------------------------------------------------
// sendChannelMessage — all option branches
// ---------------------------------------------------------------------------

describe('sendChannelMessage', () => {
  test('sends plain content', async () => {
    const result = await discordOps.sendChannelMessage.call(mockCtx, 'ch1', 'Hello!', undefined, undefined, readyClient())
    expect(result).toHaveProperty('id', 'sent1')
  })

  test('includes embeds when provided', async () => {
    const send = jest.fn().mockResolvedValue({ id: 'sent1', toJSON: () => ({ id: 'sent1' }) })
    const client = readyClient({}, { isTextBased: jest.fn(() => true), send })
    await discordOps.sendChannelMessage.call(
      mockCtx, 'ch1', 'msg', { embeds: [{ title: 'Embed' }] }, undefined, client,
    )
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }))
  })

  test('includes files from options.files and top-level files', async () => {
    const send = jest.fn().mockResolvedValue({ id: 'sent1', toJSON: () => ({ id: 'sent1' }) })
    const client = readyClient({}, { isTextBased: jest.fn(() => true), send })
    await discordOps.sendChannelMessage.call(
      mockCtx, 'ch1', 'msg', { files: [{ name: 'f1.txt' }] }, [{ name: 'f2.txt' }], client,
    )
    // top-level files override options.files
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ files: expect.any(Array) }))
  })

  test('includes components when provided', async () => {
    const send = jest.fn().mockResolvedValue({ id: 'sent1', toJSON: () => ({ id: 'sent1' }) })
    const client = readyClient({}, { isTextBased: jest.fn(() => true), send })
    await discordOps.sendChannelMessage.call(
      mockCtx, 'ch1', 'msg', { components: [{ type: 1, components: [] }] }, undefined, client,
    )
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ components: expect.any(Array) }))
  })

  test('includes allowedMentions when provided', async () => {
    const send = jest.fn().mockResolvedValue({ id: 'sent1', toJSON: () => ({ id: 'sent1' }) })
    const client = readyClient({}, { isTextBased: jest.fn(() => true), send })
    await discordOps.sendChannelMessage.call(
      mockCtx, 'ch1', 'msg', { allowedMentions: { parse: [] } }, undefined, client,
    )
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: expect.any(Object) }))
  })

  test('throws when channel does not support send', async () => {
    ;(readyClient().channels.fetch as jest.Mock).mockResolvedValue(null)
    const client = readyClient()
    ;(client.channels.fetch as jest.Mock).mockResolvedValue(null)
    await expect(
      discordOps.sendChannelMessage.call(mockCtx, 'ch1', 'Hello!', undefined, undefined, client),
    ).rejects.toThrow(NodeOperationError)
  })
})

// ---------------------------------------------------------------------------
// createChannelWebhook — happy path & no-createWebhook error
// ---------------------------------------------------------------------------

describe('createChannelWebhook', () => {
  test('creates webhook on a supported channel', async () => {
    const result = await discordOps.createChannelWebhook.call(mockCtx, 'ch1', 'bot-hook', undefined, 'setup', readyClient())
    expect(result).toHaveProperty('id', 'wh1')
    expect(result).toHaveProperty('token', 'tok')
  })

  test('throws when channel does not support createWebhook', async () => {
    const client = readyClient()
    ;(client.channels.fetch as jest.Mock).mockResolvedValue({ /* no createWebhook */ })
    await expect(
      discordOps.createChannelWebhook.call(mockCtx, 'ch1', 'bot-hook', undefined, undefined, client),
    ).rejects.toThrow(NodeOperationError)
  })
})

// ---------------------------------------------------------------------------
// executeWebhookMessage — with various options and null return
// ---------------------------------------------------------------------------

jest.mock('discord.js', () => {
  const actual = jest.requireActual('discord.js') as Record<string, unknown>
  return {
    ...actual,
    REST: jest.fn().mockImplementation(() => ({
      setToken: jest.fn().mockReturnThis(),
      post: jest.fn().mockResolvedValue({ id: 'sent1', content: 'hi', channel_id: 'ch1', embeds: [], components: [], timestamp: new Date().toISOString(), author: { id: 'w1' }, webhook_id: 'wh1' }),
      patch: jest.fn().mockResolvedValue({ id: 'sent1' }),
    })),
    Routes: actual.Routes,
    WebhookClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        id: 'sent1',
        channel_id: 'ch1',
        content: 'hello',
        embeds: [],
        components: [],
        timestamp: new Date().toISOString(),
        author: { id: 'w1' },
        webhook_id: 'wh1',
      }),
    })),
  }
})

describe('executeWebhookMessage', () => {
  test('sends with all options', async () => {
    const result = await discordOps.executeWebhookMessage.call(
      mockCtx,
      'wh1',
      'tok',
      'content',
      [{ title: 'Embed' }],
      [{ name: 'file.txt' }],
      [{ type: 1 }],
      'BotUser',
      'https://example.com/avatar.png',
      true,
      'thread1',
    )
    expect(result).not.toBeNull()
    expect(result!.id).toBe('sent1')
  })

  test('sends with minimal options', async () => {
    const result = await discordOps.executeWebhookMessage.call(mockCtx, 'wh1', 'tok')
    expect(result).not.toBeNull()
  })
})
