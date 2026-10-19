/**
 * Execute-Body Coverage for Guild, Channel, and Role Operations
 *
 * These tests call the actual execute() function for each operation,
 * exercising the getCredentials + operation + cleanup flow that
 * was previously at 0% coverage inside each execute() body.
 *
 * The helpers/index module is mocked so we control all Discord API calls.
 */

// -----------------------------------------------------------------------
// utils mock must happen before any operation imports
// -----------------------------------------------------------------------

jest.mock('../../../../src/nodes/Discord/v2/helpers/utils', () => ({
  updateDisplayOptions: jest.fn((_conditions: unknown, props: unknown) => props),
  isValidSnowflake: jest.fn(() => true),
  collectionToArray: jest.fn((col: Map<string, unknown>, mapper?: (v: unknown) => unknown) =>
    Array.from(col.values()).map((v) => (mapper ? mapper(v) : v)),
  ),
}))

// -----------------------------------------------------------------------
// Shared guild/channel/role mock data
// -----------------------------------------------------------------------

const mockRole = {
  id: 'role1',
  name: 'Admin',
  color: 0xff0000,
  toJSON: () => ({ id: 'role1', name: 'Admin', color: 0xff0000 }),
}

const mockChannel = {
  id: 'ch1',
  name: 'general',
  type: 0,
  toJSON: () => ({ id: 'ch1', name: 'general' }),
}

const rolesCollection = new Map([['role1', mockRole]])

const mockGuild = {
  id: '123456789012345678',
  name: 'Test Guild',
  toJSON: () => ({ id: '123456789012345678', name: 'Test Guild' }),
  channels: {
    fetch: jest.fn().mockResolvedValue(new Map([['ch1', mockChannel]])),
    fetchActiveThreads: jest.fn().mockResolvedValue({ threads: new Map([['t1', { id: 't1', name: 'thread1', toJSON: () => ({ id: 't1' }) }]]) }),
  },
  roles: {
    // Return a Collection (Map) when called with no args (list), single Role when called with id
    fetch: jest.fn().mockImplementation((id?: string) =>
      Promise.resolve(id ? mockRole : rolesCollection),
    ),
  },
}

const mockClient = {
  isReady: jest.fn(() => true),
  guilds: { fetch: jest.fn().mockResolvedValue(mockGuild) },
  channels: { fetch: jest.fn().mockResolvedValue(mockChannel) },
}

// -----------------------------------------------------------------------
// Mock all helpers — covered before any operation module is imported
// -----------------------------------------------------------------------

jest.mock('../../../../src/nodes/Discord/v2/helpers', () => {
  const { NodeOperationError } = jest.requireActual('n8n-workflow') as typeof import('n8n-workflow')

  return {
    NodeOperationError,
    executeV2OperationWithClient: jest.fn(
      async (
        ctx: import('n8n-workflow').IExecuteFunctions,
        ops: {
          getCredentials: (ctx: import('n8n-workflow').IExecuteFunctions) => Promise<unknown>
          operation: (
            ctx: import('n8n-workflow').IExecuteFunctions,
            creds: unknown,
            idx: number,
          ) => Promise<import('n8n-workflow').INodeExecutionData>
          cleanup?: (ctx: import('n8n-workflow').IExecuteFunctions, creds: unknown) => Promise<void>
        },
      ) => {
        const creds = await ops.getCredentials(ctx)
        const input = ctx.getInputData()
        const results: import('n8n-workflow').INodeExecutionData[] = []
        for (let i = 0; i < input.length; i++) {
          results.push(await ops.operation(ctx, creds, i))
        }
        if (ops.cleanup) await ops.cleanup(ctx, creds)
        return [results]
      },
    ),
    getV2DiscordCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
    createV2DiscordClient: jest.fn().mockResolvedValue(mockClient),
    releaseV2DiscordClientByInstance: jest.fn().mockResolvedValue(undefined),
    fetchGuild: jest.fn().mockResolvedValue(mockGuild),
    fetchChannel: jest.fn().mockResolvedValue(mockChannel),
    simplifyGuild: jest.fn((g: { id: string; name: string }) => ({ id: g.id, name: g.name })),
    simplifyChannel: jest.fn((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
    simplifyRole: jest.fn((r: { id: string; name: string }) => ({ id: r.id, name: r.name })),
    simplifyThread: jest.fn((t: { id: string }) => ({ id: t.id })),
    collectionToArray: jest.fn(
      (col: Map<string, unknown>, mapper?: (v: unknown) => unknown) =>
        Array.from(col.values()).map((v) => (mapper ? mapper(v) : v)),
    ),
    updateDisplayOptions: jest.fn((_c: unknown, props: unknown) => props),
  }
})

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

// Guild operations
import * as getGuildOp from '../../../../src/nodes/Discord/v2/actions/guild/getGuild.operation'
import * as listChannelsGuildOp from '../../../../src/nodes/Discord/v2/actions/guild/listChannels.operation'
import * as listRolesGuildOp from '../../../../src/nodes/Discord/v2/actions/guild/listRoles.operation'

// Channel operations
import * as getChannelOp from '../../../../src/nodes/Discord/v2/actions/channel/getChannel.operation'
import * as listThreadsOp from '../../../../src/nodes/Discord/v2/actions/channel/listThreads.operation'

// Role operations
import * as getRoleOp from '../../../../src/nodes/Discord/v2/actions/role/getRole.operation'
import * as listRolesRoleOp from '../../../../src/nodes/Discord/v2/actions/role/listRoles.operation'

// -----------------------------------------------------------------------
// Shared execution context factory
// -----------------------------------------------------------------------

function makeCtx(params: Record<string, unknown> = {}): IExecuteFunctions {
  return {
    getNode: jest.fn(() => ({
      id: 'node1',
      name: 'Discord Test',
      type: 'discord',
      typeVersion: 2,
      position: [0, 0] as [number, number],
      parameters: {},
    })),
    getInputData: jest.fn((): INodeExecutionData[] => [{ json: {} }]),
    continueOnFail: jest.fn(() => false),
    getNodeParameter: jest.fn((key: string, _idx: number, defaultValue?: unknown) => {
      if (key in params) return params[key]
      return defaultValue
    }),
  } as unknown as IExecuteFunctions
}

// -----------------------------------------------------------------------
// Guild: getGuild
// -----------------------------------------------------------------------

describe('getGuild.execute()', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns simplified guild data by default', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: true })
    const [[result]] = await getGuildOp.execute.call(ctx)
    expect(result.json).toMatchObject({ id: '123456789012345678', name: 'Test Guild' })
  })

  test('returns full JSON when simplify=false', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: false })
    const [[result]] = await getGuildOp.execute.call(ctx)
    expect(result.json).toBeDefined()
  })

  test('throws when client is not ready', async () => {
    const helpers = jest.requireMock('../../../../src/nodes/Discord/v2/helpers') as Record<string, jest.Mock>
    helpers.createV2DiscordClient.mockResolvedValueOnce({ isReady: jest.fn(() => false) })
    helpers.executeV2OperationWithClient.mockImplementationOnce(
      async (ctx: IExecuteFunctions, ops: { getCredentials: (c: IExecuteFunctions) => Promise<unknown> }) => {
        await ops.getCredentials(ctx)
      },
    )
    const ctx = makeCtx({ guildId: '123456789012345678' })
    // getCredentials throws NodeOperationError when client not ready
    await expect(getGuildOp.execute.call(ctx)).rejects.toThrow()
  })
})

// -----------------------------------------------------------------------
// Guild: listChannels
// -----------------------------------------------------------------------

describe('listChannelsGuild.execute()', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns channel list', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: true, limit: 100 })
    const [[result]] = await listChannelsGuildOp.execute.call(ctx)
    expect(result.json).toBeDefined()
  })
})

// -----------------------------------------------------------------------
// Guild: listRoles
// -----------------------------------------------------------------------

describe('listRolesGuild.execute()', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns role list', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: true, limit: 100 })
    const [[result]] = await listRolesGuildOp.execute.call(ctx)
    expect(result.json).toBeDefined()
    expect((result.json as Record<string, unknown>).guildId).toBe('123456789012345678')
  })

  test('uses full role JSON when simplify=false', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: false, limit: 100 })
    const [[result]] = await listRolesGuildOp.execute.call(ctx)
    expect(result.json).toBeDefined()
  })
})

// -----------------------------------------------------------------------
// Channel: getChannel
// -----------------------------------------------------------------------

describe('getChannel.execute()', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns simplified channel data', async () => {
    const ctx = makeCtx({ channelId: '123456789012345679', simplify: true })
    const [[result]] = await getChannelOp.execute.call(ctx)
    expect(result.json).toMatchObject({ id: 'ch1', name: 'general' })
  })

  test('returns full channel JSON when simplify=false', async () => {
    const ctx = makeCtx({ channelId: '123456789012345679', simplify: false })
    const [[result]] = await getChannelOp.execute.call(ctx)
    expect(result.json).toBeDefined()
  })
})

// -----------------------------------------------------------------------
// Channel: listThreads
// -----------------------------------------------------------------------

describe('listThreads.execute()', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns thread list from guild', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: true, limit: 100 })
    const [[result]] = await listThreadsOp.execute.call(ctx)
    expect(result.json).toBeDefined()
  })
})

// -----------------------------------------------------------------------
// Role: getRole
// -----------------------------------------------------------------------

describe('getRole.execute()', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns simplified role data', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', roleId: 'role1', simplify: true })
    const [[result]] = await getRoleOp.execute.call(ctx)
    expect(result.json).toMatchObject({ id: 'role1', name: 'Admin' })
  })

  test('returns full role JSON when simplify=false', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', roleId: 'role1', simplify: false })
    const [[result]] = await getRoleOp.execute.call(ctx)
    expect(result.json).toBeDefined()
  })

  test('throws NodeOperationError when role not found', async () => {
    const helpers = jest.requireMock('../../../../src/nodes/Discord/v2/helpers') as Record<string, jest.Mock>
    // Make fetchGuild return guild where roles.fetch returns null
    helpers.fetchGuild.mockResolvedValueOnce({
      ...mockGuild,
      roles: { fetch: jest.fn().mockResolvedValue(null) },
    })
    const ctx = makeCtx({ guildId: '123456789012345678', roleId: 'missing-role', simplify: true })
    await expect(getRoleOp.execute.call(ctx)).rejects.toThrow()
  })
})

// -----------------------------------------------------------------------
// Role: listRoles (role namespace)
// -----------------------------------------------------------------------

describe('listRoles (role namespace).execute()', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns role list', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: true })
    const [[result]] = await listRolesRoleOp.execute.call(ctx)
    expect(result.json).toBeDefined()
    expect((result.json as Record<string, unknown>).guildId).toBe('123456789012345678')
  })

  test('returns raw roles when simplify=false', async () => {
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: false })
    const [[result]] = await listRolesRoleOp.execute.call(ctx)
    expect((result.json as Record<string, unknown>).roles).toBeDefined()
  })
})

// -----------------------------------------------------------------------
// Cleanup is called in all operations
// -----------------------------------------------------------------------

describe('cleanup is called after execute()', () => {
  test('releaseV2DiscordClientByInstance is invoked', async () => {
    const helpers = jest.requireMock('../../../../src/nodes/Discord/v2/helpers') as Record<string, jest.Mock>
    const ctx = makeCtx({ guildId: '123456789012345678', simplify: true })
    await getGuildOp.execute.call(ctx)
    // cleanup calls releaseV2DiscordClientByInstance
    expect(helpers.releaseV2DiscordClientByInstance).toHaveBeenCalled()
  })
})
