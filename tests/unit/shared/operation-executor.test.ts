/**
 * Shared Operation Executor — Coverage for executeDiscordOperation
 *
 * The shared executor at src/nodes/Discord/shared/execution/operation-executor.ts
 * was at 26% statement coverage.  This file exercises:
 * - Happy path: single item, successful operation
 * - Validator returning false (pushes error item, continues)
 * - Executor throwing an error (re-throws via handleDiscordError)
 * - Cleanup called in finally block
 * - createDiscordOperationResponse and validateMemberOperationParams helpers
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow'

// ---------------------------------------------------------------------------
// Module mocks — must come before imports of the module under test
// ---------------------------------------------------------------------------

jest.mock('../../../src/nodes/Discord/v2/helpers', () => ({
  getV2DiscordCredentials: jest.fn().mockResolvedValue({ token: 'tok' }),
  createV2DiscordClient: jest.fn().mockResolvedValue({ isReady: () => true }),
  handleDiscordError: jest.fn((err, ctx, name) => {
    const { NodeOperationError } = jest.requireActual('n8n-workflow') as typeof import('n8n-workflow')
    throw new NodeOperationError(ctx.getNode(), String(err instanceof Error ? err.message : err))
  }),
}))

jest.mock('../../../src/nodes/Discord/v2/helpers/type-helpers', () => ({
  toIDataObject: jest.fn((x: unknown) => x as Record<string, unknown>),
}))

jest.mock('../../../src/nodes/Discord/v2/helpers/v2-credentials', () => ({
  releaseV2DiscordClientByInstance: jest.fn().mockResolvedValue(undefined),
}))

import {
  executeDiscordOperation,
  validateMemberOperationParams,
  createDiscordOperationResponse,
} from '../../../src/nodes/Discord/shared/execution/operation-executor'
import type {
  IDiscordOperationConfig,
  IDiscordOperationContext,
  IDiscordOperationResult,
} from '../../../src/nodes/Discord/shared/types/shared-interfaces'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockNode = {
  id: 'node1',
  name: 'Test',
  type: 'discord',
  typeVersion: 2,
  position: [0, 0] as [number, number],
  parameters: {},
}

function makeCtx(params: Record<string, unknown> = {}, items = [{ json: {} }]): IExecuteFunctions {
  return {
    getNode: jest.fn(() => mockNode),
    getInputData: jest.fn(() => items as INodeExecutionData[]),
    continueOnFail: jest.fn(() => false),
    getNodeParameter: jest.fn((key: string) => params[key]),
  } as unknown as IExecuteFunctions
}

type TestParams = { guildId: string; userId: string }
type TestResult = IDiscordOperationResult

function makeConfig(
  overrides: Partial<IDiscordOperationConfig<TestParams>> = {},
): IDiscordOperationConfig<TestParams> {
  return {
    operationName: 'testOp',
    parameterExtractor: (_ctx, _i) => ({ guildId: 'g1', userId: 'u1' }),
    ...overrides,
  }
}

function makeExecutor(result: TestResult) {
  return async (_params: TestParams, _ctx: IDiscordOperationContext): Promise<TestResult> => result
}

const successResult: TestResult = {
  success: true,
  guildId: 'g1',
  userId: 'u1',
  action: 'testOp',
  timestamp: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// executeDiscordOperation
// ---------------------------------------------------------------------------

describe('executeDiscordOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // re-establish default mock behaviour after clearAllMocks
    const helpers = jest.requireMock('../../../src/nodes/Discord/v2/helpers') as Record<string, jest.Mock>
    helpers.getV2DiscordCredentials.mockResolvedValue({ token: 'tok' })
    helpers.createV2DiscordClient.mockResolvedValue({ isReady: () => true })
    helpers.handleDiscordError.mockImplementation((err: unknown, ctx: IExecuteFunctions) => {
      const { NodeOperationError } = jest.requireActual('n8n-workflow') as typeof import('n8n-workflow')
      throw new NodeOperationError(ctx.getNode(), String(err instanceof Error ? (err as Error).message : err))
    })

    const creds = jest.requireMock('../../../src/nodes/Discord/v2/helpers/v2-credentials') as Record<string, jest.Mock>
    creds.releaseV2DiscordClientByInstance.mockResolvedValue(undefined)
  })

  test('happy path: returns executors result', async () => {
    const ctx = makeCtx()
    const [[result]] = await executeDiscordOperation(ctx, makeConfig(), makeExecutor(successResult))
    expect(result.json).toMatchObject({ success: true, guildId: 'g1' })
  })

  test('validator returning false pushes error item instead', async () => {
    const ctx = makeCtx()
    const config = makeConfig({ validator: () => false })
    const [[result]] = await executeDiscordOperation(ctx, config, makeExecutor(successResult))
    expect((result.json as Record<string, unknown>).success).toBe(false)
    expect((result.json as Record<string, unknown>).error).toContain('Invalid parameters')
  })

  test('processes multiple items', async () => {
    const ctx = makeCtx({}, [{ json: {} }, { json: {} }, { json: {} }])
    const [[r1, r2, r3]] = await executeDiscordOperation(ctx, makeConfig(), makeExecutor(successResult))
    expect(r1).toBeDefined()
    expect(r2).toBeDefined()
    expect(r3).toBeDefined()
  })

  test('executor throwing propagates through handleDiscordError', async () => {
    const ctx = makeCtx()
    const failExecutor = async (): Promise<TestResult> => {
      throw new Error('API failure')
    }
    await expect(executeDiscordOperation(ctx, makeConfig(), failExecutor)).rejects.toThrow('API failure')
  })

  test('cleanup is called even when executor throws', async () => {
    const cleanup = jest.fn().mockResolvedValue(undefined)
    const creds = jest.requireMock('../../../src/nodes/Discord/v2/helpers/v2-credentials') as Record<string, jest.Mock>
    creds.releaseV2DiscordClientByInstance.mockImplementation(cleanup)

    const ctx = makeCtx()
    const failExecutor = async (): Promise<TestResult> => {
      throw new Error('failure')
    }
    await expect(executeDiscordOperation(ctx, makeConfig(), failExecutor)).rejects.toThrow()
    expect(cleanup).toHaveBeenCalled()
  })

  test('throws when client is null', async () => {
    const helpers = jest.requireMock('../../../src/nodes/Discord/v2/helpers') as Record<string, jest.Mock>
    helpers.createV2DiscordClient.mockResolvedValue(null)
    const ctx = makeCtx()
    await expect(executeDiscordOperation(ctx, makeConfig(), makeExecutor(successResult))).rejects.toThrow(
      /Discord client is required/,
    )
  })
})

// ---------------------------------------------------------------------------
// validateMemberOperationParams
// ---------------------------------------------------------------------------

describe('validateMemberOperationParams', () => {
  test('returns true when both guildId and userId present', () => {
    expect(validateMemberOperationParams({ guildId: 'g1', userId: 'u1' })).toBe(true)
  })

  test('returns false when guildId missing', () => {
    expect(validateMemberOperationParams({ userId: 'u1' })).toBe(false)
  })

  test('returns false when userId missing', () => {
    expect(validateMemberOperationParams({ guildId: 'g1' })).toBe(false)
  })

  test('returns false when both missing', () => {
    expect(validateMemberOperationParams({})).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createDiscordOperationResponse
// ---------------------------------------------------------------------------

describe('createDiscordOperationResponse', () => {
  test('includes required fields', () => {
    const result = createDiscordOperationResponse({ guildId: 'g1', userId: 'u1' }, 'kick')
    expect(result.success).toBe(true)
    expect(result.guildId).toBe('g1')
    expect(result.userId).toBe('u1')
    expect(result.action).toBe('kick')
    expect(result.timestamp).toBeTruthy()
  })

  test('spreads additional data', () => {
    const result = createDiscordOperationResponse(
      { guildId: 'g1', userId: 'u1' },
      'ban',
      { reason: 'spam', deleteMessageDays: 7 },
    )
    expect((result as unknown as Record<string, unknown>).reason).toBe('spam')
    expect((result as unknown as Record<string, unknown>).deleteMessageDays).toBe(7)
  })
})
