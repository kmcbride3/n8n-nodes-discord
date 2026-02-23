import DiscordClientManager, {
  DiscordClientOptions,
} from '../../../src/nodes/Discord/shared/client/discord-client-manager'

// Basic lifecycle test for the DiscordClientManager
describe('DiscordClientManager lifecycle', () => {
  test('getClient -> getTokenForClient -> releaseClient -> cleanup', async () => {
    const manager = DiscordClientManager.getInstance()

    // Create a fake token
    const token = 'test-token-123'

    // Spy on createClient/login by mocking manager.getClient's login flow via a real Client but stub login
    const realCreateClient = (
      manager as unknown as { createClient: (opts: DiscordClientOptions) => any }
    ).createClient.bind(manager)

    // Replace createClient to return a Client with a stubbed login that resolves immediately
    ;(manager as unknown as { createClient: (opts: DiscordClientOptions) => any }).createClient = (
      options: DiscordClientOptions,
    ) => {
      const client = realCreateClient(options)
      // stub login so it doesn't attempt network
      client.login = async (_token?: string) => Promise.resolve('logged-in')
      // stub destroy to resolve
      client.destroy = async () => {}
      return client
    }

    const client = await manager.getClient({ token })
    expect(client).toBeDefined()

    const mappedToken = manager.getTokenForClient(client)
    expect(mappedToken).toBe(token)

    // Release once
    manager.releaseClient(token)

    // After release, reference count should be >= 0 but client still exists
    // Force cleanup (maxIdleTime small? we'll call disconnectClient to ensure removal)
    await manager.disconnectClient(token)

    // After disconnect, getTokenForClient should still return token until GC, but pool should not have the entry
    const stateToken = manager.getTokenForClient(client)
    expect(stateToken).toBe(token)
  })
})
