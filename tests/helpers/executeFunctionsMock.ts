import type { IExecuteFunctions, INode, IWebhookFunctions } from 'n8n-workflow'

// Minimal implementation of IExecuteFunctions used by many unit tests.
// Tests can import createMockExecuteFunctions() and override fields as needed.
export const createMockExecuteFunctions = (overrides: Partial<IExecuteFunctions> = {}): IExecuteFunctions => {
  const baseNode: INode = {
    id: 'test-node',
    name: 'Test Node',
    type: 'test',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  }

  const base: IExecuteFunctions = {
    getNode: () => baseNode,
    getNodeParameter: ((name: string) => undefined) as IExecuteFunctions['getNodeParameter'],
    getCredentials: (async (type: string) => undefined) as IExecuteFunctions['getCredentials'],
    // Provide a minimal helpers object. Cast via unknown to satisfy the compiler while
    // keeping the surface small and explicit for tests.
    helpers: { request: jest.fn() } as unknown as IExecuteFunctions['helpers'],
    getWorkflowStaticData: (() => ({}) as Record<string, unknown>) as IExecuteFunctions['getWorkflowStaticData'],
    // Minimal implementations for other commonly used members to keep the object fully typed
    getCredentialsExpression: (name?: string) => undefined as unknown as any,
    getBinaryData: ((name?: string) => undefined) as any,
    // ...other IExecuteFunctions members can be added lazily by tests via overrides
  } as unknown as IExecuteFunctions

  return Object.assign({}, base, overrides) as IExecuteFunctions
}

export default createMockExecuteFunctions

// Create a lightweight IWebhookFunctions mock factory for webhook-specific tests
export const createMockWebhookFunctions = (
  overrides: Partial<IWebhookFunctions> = {},
): Partial<IWebhookFunctions> & { getRequestObject: jest.Mock } => {
  const baseExecute = createMockExecuteFunctions()
  const mock: Partial<IWebhookFunctions> & { getRequestObject: jest.Mock } = Object.assign({}, baseExecute, {
    getRequestObject: jest.fn(() => ({ headers: {}, body: {} })),
  })
  return Object.assign(mock, overrides)
}
