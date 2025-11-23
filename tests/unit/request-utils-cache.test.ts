describe('request-utils parse cache', () => {
  const modPath = '../../src/nodes/Discord/shared/utils/request-normalization'

  it('caches parsed canonical body and avoids repeated JSON.parse', async () => {
    // Load a fresh instance of the module to ensure clean cache
    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { parseCanonicalBody } = require(modPath)

    const bodyObj = { hello: 'world', nested: { num: 1 } }
    const req = { headers: {}, rawBody: JSON.stringify(bodyObj) }

    const parseSpy = jest.spyOn(JSON, 'parse')

    const first = parseCanonicalBody(req)
    const second = parseCanonicalBody(req)

    expect(first.bodyString).toBe(JSON.stringify(bodyObj))
    expect(first.parsed).toEqual(bodyObj)
    expect(second.parsed).toEqual(bodyObj)
    // Since the same canonical string is parsed twice, JSON.parse should have been called only once
    expect(parseSpy).toHaveBeenCalledTimes(1)

    parseSpy.mockRestore()
  })
})
