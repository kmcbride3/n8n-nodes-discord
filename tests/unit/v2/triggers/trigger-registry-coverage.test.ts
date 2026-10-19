/**
 * Trigger Registry — Filter and TransformEvent Coverage
 *
 * Exercises every filter() and transformEvent() function in TRIGGER_REGISTRY
 * directly so the lambda bodies (lines 80-730) are counted in coverage.
 *
 * This complements trigger-factory.test.ts which covers message-content patterns;
 * here we focus on the remaining 18 trigger types and the uncovered branches.
 */

import type { ITriggerFunctions } from 'n8n-workflow'

jest.mock('discord.js', () => ({
  Client: jest.fn(),
  GatewayIntentBits: { Guilds: 1, GuildMessages: 512, MessageContent: 32768 },
  IntentsBitField: jest.fn().mockImplementation(() => ({ has: jest.fn(() => true) })),
}))

jest.mock('n8n-workflow', () => ({
  ...jest.requireActual('n8n-workflow'),
  LoggerProxy: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { TRIGGER_REGISTRY } from '../../../../src/nodes/Discord/v2/triggers/triggerRegistry'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeCtx(params: Record<string, unknown> = {}): ITriggerFunctions {
  return {
    getNodeParameter: jest.fn((key: string) => params[key] ?? undefined),
  } as unknown as ITriggerFunctions
}

function makeRoleCache(entries: [string, Record<string, unknown>][] = []) {
  const m = new Map(entries)
  ;(m as unknown as Record<string, unknown>).filter = (fn: (v: unknown, k: string) => boolean) => {
    const result = new Map()
    for (const [k, v] of m) if (fn(v, k)) result.set(k, v)
    return makeRoleCache(Array.from(result.entries()) as [string, Record<string, unknown>][])
  }
  ;(m as unknown as Record<string, unknown>).map = (fn: (v: unknown) => unknown) =>
    Array.from(m.values()).map(fn)
  return m
}

const roleFixture = { id: 'r1', name: 'Member', color: 0, permissions: { toString: () => '0' } }

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg1',
    content: 'hello',
    author: { bot: false, id: 'user1', username: 'Alice', tag: 'Alice#0001' },
    client: { user: { id: 'bot1' } },
    channelId: 'ch1',
    guildId: 'guild1',
    channel: { isDMBased: jest.fn(() => false) },
    attachments: { size: 0, map: jest.fn(() => []) },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    mentions: {
      has: jest.fn(() => false),
      users: new Map(),
      roles: [],
      channels: new Map(),
    },
    partial: false,
    ...overrides,
  }
}

function makeReaction(partial = false, fetchFails = false) {
  return {
    partial,
    fetch: fetchFails
      ? jest.fn().mockRejectedValue(new Error('fetch error'))
      : jest.fn().mockResolvedValue(undefined),
    emoji: { name: '👍', id: null, animated: false },
    count: 3,
    message: { id: 'msg1', channelId: 'ch1', guildId: 'guild1' },
    client: { user: { id: 'bot1' } },
  }
}

function makeUser(bot = false, id = 'user1') {
  return { bot, id, username: 'Alice', tag: 'Alice#0001' }
}

function makeThread(overrides: Record<string, unknown> = {}) {
  return {
    id: 'thread1',
    name: 'my-thread',
    type: 11,
    parentId: 'ch1',
    ownerId: 'user1',
    guild: { id: 'guild1' },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    archived: false,
    locked: false,
    memberCount: 5,
    messageCount: 12,
    ...overrides,
  }
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user1', username: 'Alice', tag: 'Alice#0001', avatar: null, discriminator: '0001', bot: false },
    displayName: 'Alice',
    nickname: null,
    guild: { id: 'guild1' },
    joinedAt: new Date('2024-01-01T00:00:00Z'),
    roles: { cache: makeRoleCache([['r1', roleFixture]]) },
    ...overrides,
  }
}

function makeRole(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role1',
    name: 'Admin',
    color: 0xff0000,
    hoist: true,
    mentionable: false,
    position: 2,
    permissions: { toString: () => '8', bitfield: BigInt(8) },
    guild: { id: 'guild1', name: 'Test Guild' },
    ...overrides,
  }
}

function makePresence(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user1', username: 'Alice' },
    guild: { id: 'guild1' },
    status: 'online',
    activities: [{ name: 'Chess', type: 0, details: 'Playing chess', state: null }],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// MESSAGE TRIGGERS
// ---------------------------------------------------------------------------

describe('Trigger Registry — message_update', () => {
  const trigger = TRIGGER_REGISTRY['message_update']

  test('filter: skips partial messages', () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' }, messageFilters: {} })
    const partial = makeMessage({ partial: true })
    expect(trigger.filter!.call(ctx, makeMessage(), partial as never)).toBe(false)
  })

  test('filter: user message passes through', () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'allowAllBots' }, messageFilters: {} })
    const msg = makeMessage()
    expect(trigger.filter!.call(ctx, msg as never, msg as never)).toBe(true)
  })

  test('filter: bot message is ignored when ignoreAllBots', () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' }, messageFilters: {} })
    const botMsg = makeMessage({ author: { bot: true, id: 'other-bot', username: 'OtherBot', tag: 'OtherBot#0000' } })
    expect(trigger.filter!.call(ctx, makeMessage() as never, botMsg as never)).toBe(false)
  })

  test('transformEvent: returns edit data', () => {
    const ctx = makeCtx()
    const old = makeMessage({ content: 'old' })
    const updated = makeMessage({ content: 'updated', editedAt: new Date() })
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect(result).toBeTruthy()
    expect(result!.messageId).toBe('msg1')
    expect(result!.oldContent).toBe('old')
    expect(result!.newContent).toBe('updated')
  })
})

describe('Trigger Registry — directMessage', () => {
  const trigger = TRIGGER_REGISTRY['directMessage']

  test('filter: rejects non-DM messages', () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' }, messageFilters: {} })
    const msg = makeMessage()
    ;(msg.channel.isDMBased as jest.Mock).mockReturnValue(false)
    expect(trigger.filter!.call(ctx, msg as never)).toBe(false)
  })

  test('filter: passes DM from user', () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'allowAllBots' }, messageFilters: {} })
    const msg = makeMessage()
    ;(msg.channel.isDMBased as jest.Mock).mockReturnValue(true)
    expect(trigger.filter!.call(ctx, msg as never)).toBe(true)
  })

  test('filter: rejects ignoreAllBots DM from bot', () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' }, messageFilters: {} })
    const msg = makeMessage({ author: { bot: true, id: 'bot2', username: 'Bot2', tag: 'Bot2#0000' } })
    ;(msg.channel.isDMBased as jest.Mock).mockReturnValue(true)
    expect(trigger.filter!.call(ctx, msg as never)).toBe(false)
  })

  test('transformEvent: includes attachments', () => {
    const ctx = makeCtx()
    const msg = makeMessage()
    ;(msg.attachments.map as jest.Mock).mockReturnValue([{ id: 'a1', name: 'file.png', url: 'http://x', size: 100, contentType: 'image/png' }])
    const result = trigger.transformEvent.call(ctx, msg as never)
    expect(result!.authorTag).toBe('Alice#0001')
    expect(Array.isArray(result!.attachments)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// REACTION TRIGGERS
// ---------------------------------------------------------------------------

describe('Trigger Registry — reactionAdd', () => {
  const trigger = TRIGGER_REGISTRY['reactionAdd']

  test('filter: allows user reaction (ignoreAllBots)', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' } })
    const result = await trigger.filter!.call(ctx, makeReaction() as never, makeUser(false) as never)
    expect(result).toBe(true)
  })

  test('filter: ignoreAllBots blocks bot reactions', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' } })
    const result = await trigger.filter!.call(ctx, makeReaction() as never, makeUser(true) as never)
    expect(result).toBe(false)
  })

  test('filter: ignoreSelf blocks own bot, allows other bots', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreSelf' } })
    const selfBot = makeUser(true, 'bot1')
    const otherBot = makeUser(true, 'other-bot')
    expect(await trigger.filter!.call(ctx, makeReaction() as never, selfBot as never)).toBe(false)
    expect(await trigger.filter!.call(ctx, makeReaction() as never, otherBot as never)).toBe(true)
  })

  test('filter: ignoreOthers allows own bot', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreOthers' } })
    const selfBot = makeUser(true, 'bot1')
    expect(await trigger.filter!.call(ctx, makeReaction() as never, selfBot as never)).toBe(true)
  })

  test('filter: allowAllBots allows all bots', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'allowAllBots' } })
    expect(await trigger.filter!.call(ctx, makeReaction() as never, makeUser(true, 'any') as never)).toBe(true)
  })

  test('filter: fetches partial reaction', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' } })
    const reaction = makeReaction(true)
    await trigger.filter!.call(ctx, reaction as never, makeUser(false) as never)
    expect(reaction.fetch).toHaveBeenCalled()
  })

  test('filter: returns false when fetch fails', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' } })
    const result = await trigger.filter!.call(ctx, makeReaction(true, true) as never, makeUser(false) as never)
    expect(result).toBe(false)
  })

  test('transformEvent: returns reaction data', () => {
    const ctx = makeCtx()
    const result = trigger.transformEvent.call(ctx, makeReaction() as never, makeUser() as never)
    expect(result!.emoji).toBe('👍')
    expect(result!.userId).toBe('user1')
    expect(result!.count).toBe(3)
  })
})

describe('Trigger Registry — reactionRemove', () => {
  const trigger = TRIGGER_REGISTRY['reactionRemove']

  test('filter: same bot-behavior logic as reactionAdd', async () => {
    const ctx = makeCtx({ botFilters: { botBehavior: 'ignoreAllBots' } })
    expect(await trigger.filter!.call(ctx, makeReaction() as never, makeUser(false) as never)).toBe(true)
    expect(await trigger.filter!.call(ctx, makeReaction() as never, makeUser(true) as never)).toBe(false)
  })

  test('filter: returns false when partial fetch fails', async () => {
    const ctx = makeCtx({ botFilters: {} })
    expect(await trigger.filter!.call(ctx, makeReaction(true, true) as never, makeUser() as never)).toBe(false)
  })

  test('transformEvent: returns remove data', () => {
    const ctx = makeCtx()
    const result = trigger.transformEvent.call(ctx, makeReaction() as never, makeUser() as never)
    expect(result!.messageId).toBe('msg1')
  })
})

// ---------------------------------------------------------------------------
// THREAD TRIGGERS
// ---------------------------------------------------------------------------

describe('Trigger Registry — thread', () => {
  const trigger = TRIGGER_REGISTRY['thread']

  test('transformEvent: maps all thread fields', () => {
    const ctx = makeCtx()
    const result = trigger.transformEvent.call(ctx, makeThread() as never)
    expect(result!.threadId).toBe('thread1')
    expect(result!.name).toBe('my-thread')
    expect(result!.parentId).toBe('ch1')
    expect(result!.guildId).toBe('guild1')
    expect(result!.archived).toBe(false)
    expect(result!.memberCount).toBe(5)
  })
})

describe('Trigger Registry — thread_update', () => {
  const trigger = TRIGGER_REGISTRY['thread_update']

  test('transformEvent: includes change diffs when values differ', () => {
    const ctx = makeCtx()
    const old = makeThread({ name: 'old-name', archived: false, locked: false })
    const updated = makeThread({ name: 'new-name', archived: true, locked: true })
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect(result!.threadId).toBe('thread1')
    expect((result!.changes as Record<string, unknown>).name).toEqual({ old: 'old-name', new: 'new-name' })
    expect((result!.changes as Record<string, unknown>).archived).toEqual({ old: false, new: true })
  })

  test('transformEvent: undefined when values unchanged', () => {
    const ctx = makeCtx()
    const t = makeThread()
    const result = trigger.transformEvent.call(ctx, t as never, t as never)
    expect((result!.changes as Record<string, unknown>).name).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// COMMAND / INTERACTION TRIGGERS
// ---------------------------------------------------------------------------

describe('Trigger Registry — command', () => {
  const trigger = TRIGGER_REGISTRY['command']

  function makeCommandInteraction(overrides: Record<string, unknown> = {}) {
    return {
      isChatInputCommand: jest.fn(() => true),
      commandName: 'hello',
      channelId: 'ch1',
      guildId: 'guild1',
      id: 'int1',
      user: { id: 'user1', username: 'Alice', tag: 'Alice#0001' },
      options: { get: jest.fn(() => null) },
      ...overrides,
    }
  }

  test('filter: only passes chat-input commands', () => {
    const ctx = makeCtx()
    const cmdInteraction = makeCommandInteraction()
    const nonCmd = { isChatInputCommand: jest.fn(() => false) }
    expect(trigger.filter!.call(ctx, cmdInteraction as never)).toBe(true)
    expect(trigger.filter!.call(ctx, nonCmd as never)).toBe(false)
  })

  test('transformEvent: returns null when command name does not match', () => {
    const ctx = makeCtx({ name: 'other', channelIds: [] })
    const result = trigger.transformEvent.call(ctx, makeCommandInteraction({ commandName: 'hello' }) as never)
    expect(result).toBeNull()
  })

  test('transformEvent: filters by channelIds', () => {
    const ctx = makeCtx({ name: 'hello', channelIds: ['other-channel'] })
    const result = trigger.transformEvent.call(ctx, makeCommandInteraction() as never)
    expect(result).toBeNull()
  })

  test('transformEvent: returns data on matching command', () => {
    const ctx = makeCtx({ name: 'hello', channelIds: [] })
    const result = trigger.transformEvent.call(ctx, makeCommandInteraction() as never)
    expect(result!.commandName).toBe('hello')
    expect(result!.userId).toBe('user1')
  })

  test('transformEvent: parses JSON option value', () => {
    const ctx = makeCtx({ name: 'hello', channelIds: [] })
    const interaction = makeCommandInteraction({
      options: { get: jest.fn(() => ({ value: '{"key":"val"}' })) },
    })
    const result = trigger.transformEvent.call(ctx, interaction as never)
    expect((result!.commandOptions as Record<string, unknown>).input).toEqual({ key: 'val' })
  })

  test('transformEvent: uses raw string for non-JSON option value', () => {
    const ctx = makeCtx({ name: 'hello', channelIds: [] })
    const interaction = makeCommandInteraction({
      options: { get: jest.fn(() => ({ value: 'plain text' })) },
    })
    const result = trigger.transformEvent.call(ctx, interaction as never)
    expect((result!.commandOptions as Record<string, unknown>).input).toBe('plain text')
  })
})

describe('Trigger Registry — interaction', () => {
  const trigger = TRIGGER_REGISTRY['interaction']

  function makeComponentInteraction(overrides: Record<string, unknown> = {}) {
    return {
      isMessageComponent: jest.fn(() => true),
      isStringSelectMenu: jest.fn(() => false),
      isButton: jest.fn(() => true),
      componentType: 2, // Button
      customId: 'btn_yes',
      message: { id: 'msg1' },
      channelId: 'ch1',
      guildId: 'guild1',
      user: { id: 'user1', username: 'Alice', tag: 'Alice#0001' },
      ...overrides,
    }
  }

  test('filter: only passes message component interactions', () => {
    const ctx = makeCtx()
    const comp = makeComponentInteraction()
    const nonComp = { isMessageComponent: jest.fn(() => false) }
    expect(trigger.filter!.call(ctx, comp as never)).toBe(true)
    expect(trigger.filter!.call(ctx, nonComp as never)).toBe(false)
  })

  test('transformEvent: returns null for non-component', () => {
    const ctx = makeCtx({ interactionMessageId: 'msg1' })
    const nonComp = { isMessageComponent: jest.fn(() => false) }
    expect(trigger.transformEvent.call(ctx, nonComp as never)).toBeNull()
  })

  test('transformEvent: returns null when message ID does not match', () => {
    const ctx = makeCtx({ interactionMessageId: 'other-msg' })
    expect(trigger.transformEvent.call(ctx, makeComponentInteraction() as never)).toBeNull()
  })

  test('transformEvent: returns button interaction data', () => {
    const ctx = makeCtx({ interactionMessageId: 'msg1' })
    const result = trigger.transformEvent.call(ctx, makeComponentInteraction() as never)
    expect(result!.customId).toBe('btn_yes')
    expect(result!.interactionValues).toEqual(['btn_yes'])
  })

  test('transformEvent: returns select menu values', () => {
    const ctx = makeCtx({ interactionMessageId: 'msg1' })
    const select = makeComponentInteraction({
      isStringSelectMenu: jest.fn(() => true),
      isButton: jest.fn(() => false),
      values: ['opt1', 'opt2'],
    })
    const result = trigger.transformEvent.call(ctx, select as never)
    expect(result!.interactionValues).toEqual(['opt1', 'opt2'])
  })
})

// ---------------------------------------------------------------------------
// USER / MEMBER TRIGGERS
// ---------------------------------------------------------------------------

describe('Trigger Registry — userJoins', () => {
  const trigger = TRIGGER_REGISTRY['userJoins']

  test('filter: passes when guildId matches', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    expect(trigger.filter!.call(ctx, makeMember() as never)).toBe(true)
  })

  test('filter: blocks when guildId does not match', () => {
    const ctx = makeCtx({ guildId: 'other' })
    expect(trigger.filter!.call(ctx, makeMember() as never)).toBe(false)
  })

  test('filter: passes when no guildId filter', () => {
    const ctx = makeCtx({ guildId: '' })
    expect(trigger.filter!.call(ctx, makeMember() as never)).toBe(true)
  })

  test('transformEvent: returns member join data with roles', () => {
    const ctx = makeCtx()
    const result = trigger.transformEvent.call(ctx, makeMember() as never)
    expect(result!.userId).toBe('user1')
    expect(result!.guildId).toBe('guild1')
    expect(Array.isArray(result!.roles)).toBe(true)
  })
})

describe('Trigger Registry — userLeaves', () => {
  const trigger = TRIGGER_REGISTRY['userLeaves']

  test('filter: respects guildId', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    expect(trigger.filter!.call(ctx, makeMember() as never)).toBe(true)
  })

  test('transformEvent: returns user left data', () => {
    const ctx = makeCtx()
    const result = trigger.transformEvent.call(ctx, makeMember() as never)
    expect(result!.userId).toBe('user1')
    expect(result!.leftAt).toBeTruthy()
  })
})

describe('Trigger Registry — userUpdate', () => {
  const trigger = TRIGGER_REGISTRY['userUpdate']

  const makeUpdatedMember = (nickname: string | null, roleIds: string[] = ['r1']) => ({
    user: { id: 'user1', username: 'Alice', tag: 'Alice#0001' },
    guild: { id: 'guild1' },
    nickname,
    roles: {
      cache: makeRoleCache(roleIds.map((id) => [id, { id, name: `Role_${id}` }])),
    },
  })

  test('filter: passes when guild matches', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    const old = makeUpdatedMember(null)
    const updated = makeUpdatedMember('NewNick')
    expect(trigger.filter!.call(ctx, old as never, updated as never)).toBe(true)
  })

  test('transformEvent: includes role changes', () => {
    const ctx = makeCtx()
    const old = makeUpdatedMember(null, ['r1'])
    const updated = makeUpdatedMember('NewNick', ['r1', 'r2'])
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect(result!.userId).toBe('user1')
    expect((result!.changes as Record<string, unknown>).nickname).toEqual({ old: null, new: 'NewNick' })
  })
})

describe('Trigger Registry — presenceUpdate', () => {
  const trigger = TRIGGER_REGISTRY['presenceUpdate']

  test('filter: passes when guildId matches', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    expect(trigger.filter!.call(ctx, null as never, makePresence() as never)).toBe(true)
  })

  test('transformEvent: includes activities and status diff', () => {
    const ctx = makeCtx()
    const old = makePresence({ status: 'offline' })
    const result = trigger.transformEvent.call(ctx, old as never, makePresence() as never)
    expect(result!.status).toBe('online')
    expect(result!.oldStatus).toBe('offline')
    expect(Array.isArray(result!.activities)).toBe(true)
  })

  test('transformEvent: handles null old presence', () => {
    const ctx = makeCtx()
    const result = trigger.transformEvent.call(ctx, null as never, makePresence() as never)
    expect(result!.oldStatus).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// NICK / ROLE CHANGE TRIGGERS
// ---------------------------------------------------------------------------

describe('Trigger Registry — userNickUpdated', () => {
  const trigger = TRIGGER_REGISTRY['userNickUpdated']

  const makeNickMember = (nick: string | null) => ({
    user: { id: 'u1', username: 'Alice', tag: 'Alice#0001' },
    guild: { id: 'guild1' },
    nickname: nick,
    roles: { cache: makeRoleCache([]) },
  })

  test('filter: returns false when nickname unchanged', () => {
    const ctx = makeCtx({ guildId: '' })
    const m = makeNickMember('same')
    expect(trigger.filter!.call(ctx, m as never, m as never)).toBe(false)
  })

  test('filter: passes when nickname changed', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    const old = makeNickMember(null)
    const updated = makeNickMember('NewNick')
    expect(trigger.filter!.call(ctx, old as never, updated as never)).toBe(true)
  })

  test('transformEvent: returns nick change', () => {
    const ctx = makeCtx()
    const old = makeNickMember('OldNick')
    const updated = makeNickMember('NewNick')
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect(result!.oldNickname).toBe('OldNick')
    expect(result!.newNickname).toBe('NewNick')
  })
})

describe('Trigger Registry — userRoleAdded', () => {
  const trigger = TRIGGER_REGISTRY['userRoleAdded']

  const base = { user: { id: 'u1', username: 'A', tag: 'A#0001' }, guild: { id: 'guild1' }, nickname: null }

  test('filter: returns false when no roles added', () => {
    const ctx = makeCtx({ guildId: '' })
    const m = { ...base, roles: { cache: makeRoleCache([['r1', roleFixture]]) } }
    expect(trigger.filter!.call(ctx, m as never, m as never)).toBe(false)
  })

  test('filter: passes when role added', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    const old = { ...base, roles: { cache: makeRoleCache([]) } }
    const updated = { ...base, roles: { cache: makeRoleCache([['r1', roleFixture]]) } }
    expect(trigger.filter!.call(ctx, old as never, updated as never)).toBe(true)
  })

  test('transformEvent: returns added roles', () => {
    const ctx = makeCtx()
    const old = { ...base, roles: { cache: makeRoleCache([]) } }
    const updated = { ...base, roles: { cache: makeRoleCache([['r1', { ...roleFixture, permissions: { toString: () => '0' } }]]) } }
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect(Array.isArray(result!.addedRoles)).toBe(true)
    expect((result!.addedRoles as unknown[]).length).toBe(1)
  })
})

describe('Trigger Registry — userRoleRemoved', () => {
  const trigger = TRIGGER_REGISTRY['userRoleRemoved']

  const base = { user: { id: 'u1', username: 'A', tag: 'A#0001' }, guild: { id: 'guild1' }, nickname: null }

  test('filter: returns false when no roles removed', () => {
    const ctx = makeCtx({ guildId: '' })
    const m = { ...base, roles: { cache: makeRoleCache([]) } }
    expect(trigger.filter!.call(ctx, m as never, m as never)).toBe(false)
  })

  test('filter: passes when role removed', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    const old = { ...base, roles: { cache: makeRoleCache([['r1', roleFixture]]) } }
    const updated = { ...base, roles: { cache: makeRoleCache([]) } }
    expect(trigger.filter!.call(ctx, old as never, updated as never)).toBe(true)
  })

  test('transformEvent: returns removed roles', () => {
    const ctx = makeCtx()
    const old = { ...base, roles: { cache: makeRoleCache([['r1', { ...roleFixture, permissions: { toString: () => '0' } }]]) } }
    const updated = { ...base, roles: { cache: makeRoleCache([]) } }
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect(Array.isArray(result!.removedRoles)).toBe(true)
    expect((result!.removedRoles as unknown[]).length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// ROLE LIFECYCLE TRIGGERS
// ---------------------------------------------------------------------------

describe('Trigger Registry — roleCreate', () => {
  const trigger = TRIGGER_REGISTRY['roleCreate']

  test('filter: passes when guildId matches', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    expect(trigger.filter!.call(ctx, makeRole() as never)).toBe(true)
  })

  test('filter: blocks mismatched guildId', () => {
    const ctx = makeCtx({ guildId: 'other' })
    expect(trigger.filter!.call(ctx, makeRole() as never)).toBe(false)
  })

  test('filter: passes with no guildId filter', () => {
    const ctx = makeCtx({ guildId: '' })
    expect(trigger.filter!.call(ctx, makeRole() as never)).toBe(true)
  })

  test('transformEvent: returns role creation data', () => {
    const ctx = makeCtx()
    const result = trigger.transformEvent.call(ctx, makeRole() as never)
    expect(result!.roleId).toBe('role1')
    expect(result!.roleName).toBe('Admin')
    expect(result!.guildId).toBe('guild1')
  })
})

describe('Trigger Registry — roleDelete', () => {
  const trigger = TRIGGER_REGISTRY['roleDelete']

  test('filter and transformEvent mirror roleCreate', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    expect(trigger.filter!.call(ctx, makeRole() as never)).toBe(true)
    const result = trigger.transformEvent.call(ctx, makeRole() as never)
    expect(result!.roleId).toBe('role1')
  })
})

describe('Trigger Registry — roleUpdate', () => {
  const trigger = TRIGGER_REGISTRY['roleUpdate']

  test('filter: returns false when nothing changed', () => {
    const ctx = makeCtx({ guildId: '' })
    const r = makeRole()
    expect(trigger.filter!.call(ctx, r as never, r as never)).toBe(false)
  })

  test('filter: passes when name changes', () => {
    const ctx = makeCtx({ guildId: 'guild1' })
    const old = makeRole({ name: 'OldName' })
    const updated = makeRole({ name: 'NewName' })
    expect(trigger.filter!.call(ctx, old as never, updated as never)).toBe(true)
  })

  test('filter: passes when permissions change', () => {
    const ctx = makeCtx({ guildId: '' })
    const old = makeRole({ permissions: { toString: () => '8', bitfield: BigInt(8) } })
    const updated = makeRole({ permissions: { toString: () => '16', bitfield: BigInt(16) } })
    expect(trigger.filter!.call(ctx, old as never, updated as never)).toBe(true)
  })

  test('transformEvent: includes change diffs', () => {
    const ctx = makeCtx()
    const old = makeRole({ name: 'Old', color: 0x000000 })
    const updated = makeRole({ name: 'New', color: 0xff0000 })
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect((result!.changes as Record<string, unknown>).name).toEqual({ old: 'Old', new: 'New' })
    expect((result!.changes as Record<string, unknown>).color).toEqual({ old: 0x000000, new: 0xff0000 })
  })

  test('transformEvent: undefined diff when value unchanged', () => {
    const ctx = makeCtx()
    const old = makeRole({ name: 'Same', color: 0xffffff })
    const updated = makeRole({ name: 'Other', color: 0xffffff })
    const result = trigger.transformEvent.call(ctx, old as never, updated as never)
    expect((result!.changes as Record<string, unknown>).color).toBeUndefined()
  })
})
