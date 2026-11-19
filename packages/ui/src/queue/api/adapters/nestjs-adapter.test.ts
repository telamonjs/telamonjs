/**
 * createNestJSAdapter unit tests
 *
 * Pure adapter functions — cheap to test in isolation with a mocked
 * `global.fetch`. Focus of these tests (see task WHAT CHANGED):
 *
 *   - clearHistory: single status -> `status` sent in the POST body;
 *     2+ statuses or none -> `status` omitted (backend clears both).
 *   - performAction: `retry-all` goes through the normal actionMap
 *     (no special-case workaround).
 *   - startDate/endDate (and any other params) are forwarded as-is via the
 *     URLSearchParams query string for getHistoryAll/getJobsAll — the
 *     adapter does not special-case them.
 *
 * Source of truth (read, not altered):
 *   src/queue/api/adapters/nestjs-adapter.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createNestJSAdapter } from './nestjs-adapter'

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

describe('createNestJSAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('clearHistory', () => {
    it('sends "status" in the payload when called with exactly 1 status', async () => {
      const fetchMock = mockFetchOnce({
        success: true,
        removed: 3,
        byQueue: { q1: 3 },
      })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await adapter.clearHistory('completed')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [, options] = fetchMock.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).toEqual({
        queueName: '*',
        action: 'clean',
        status: 'completed',
      })
    })

    it('omits "status" from the payload when called with 2 statuses', async () => {
      const fetchMock = mockFetchOnce({
        success: true,
        removed: 5,
        byQueue: {},
      })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await adapter.clearHistory('completed,failed')

      const [, options] = fetchMock.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).toEqual({ queueName: '*', action: 'clean' })
      expect(body.status).toBeUndefined()
    })

    it('omits "status" from the payload when called with 3+ statuses', async () => {
      const fetchMock = mockFetchOnce({
        success: true,
        removed: 5,
        byQueue: {},
      })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await adapter.clearHistory('completed, failed, delayed')

      const [, options] = fetchMock.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).toEqual({ queueName: '*', action: 'clean' })
    })

    it('omits "status" from the payload when called with an empty string ("none")', async () => {
      // ''.split(',') -> [''] (length 1), but the single "status" is an empty
      // string, which is falsy — so `singleStatus && {...}` still omits it.
      const fetchMock = mockFetchOnce({
        success: true,
        removed: 0,
        byQueue: {},
      })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await adapter.clearHistory('')

      const [, options] = fetchMock.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).toEqual({ queueName: '*', action: 'clean' })
    })

    it('returns success/errors/totalRemoved/byQueue taken directly from the HTTP response', async () => {
      const fetchMock = mockFetchOnce({
        success: false,
        removed: 1,
        byQueue: { q1: 1 },
        errors: ['q2: timeout'],
      })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      const result = await adapter.clearHistory('completed')

      expect(result).toEqual({
        success: false,
        totalRemoved: 1,
        byQueue: { q1: 1 },
        errors: ['q2: timeout'],
      })
    })

    it('defaults success to true and totalRemoved/byQueue to empty when response omits them', async () => {
      const fetchMock = mockFetchOnce({})
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      const result = await adapter.clearHistory('completed,failed')

      expect(result).toEqual({ success: true, totalRemoved: 0, byQueue: {} })
    })
  })

  describe('performAction', () => {
    it('maps "retry-all" through the normal actionMap (no special-case workaround)', async () => {
      const fetchMock = mockFetchOnce({ success: true })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await adapter.performAction({
        type: 'retry-all',
        queueName: 'gateway_process_data',
      })

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.test/v1/queue/actions')
      const body = JSON.parse(options.body)
      expect(body).toEqual({
        queueName: 'gateway_process_data',
        action: 'retry-all',
      })
    })

    it('maps "drain" to the "drain" backend action (never obliterate)', async () => {
      const fetchMock = mockFetchOnce({ success: true })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await adapter.performAction({
        type: 'drain',
        queueName: 'gateway_process_data',
      })

      const [, options] = fetchMock.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).toEqual({
        queueName: 'gateway_process_data',
        action: 'drain',
      })
    })

    it('passes "status" through for "clean" actions when provided', async () => {
      const fetchMock = mockFetchOnce({ success: true })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await adapter.performAction({
        type: 'clean',
        queueName: 'gateway_process_data',
        status: 'failed',
      })

      const [, options] = fetchMock.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).toEqual({
        queueName: 'gateway_process_data',
        action: 'clean',
        status: 'failed',
      })
    })
  })

  describe('startDate/endDate passthrough', () => {
    it('forwards startDate/endDate query params as-is for getHistoryAll', async () => {
      const fetchMock = mockFetchOnce({ jobs: [], total: 0 })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      const params = new URLSearchParams({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-07T00:00:00.000Z',
      })
      await adapter.getHistoryAll(params)

      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('startDate=2026-01-01T00%3A00%3A00.000Z')
      expect(url).toContain('endDate=2026-01-07T00%3A00%3A00.000Z')
    })

    it('forwards arbitrary query params as-is for getJobsAll', async () => {
      const fetchMock = mockFetchOnce({ jobs: [], total: 0 })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      const params = new URLSearchParams({ status: 'active', limit: '50' })
      await adapter.getJobsAll(params)

      const [url] = fetchMock.mock.calls[0]
      expect(url).toBe(
        'https://api.test/v1/queue/jobs/all?status=active&limit=50'
      )
    })
  })

  describe('Edge Cases', () => {
    it('throws with response status/statusText/body text when the request fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('boom'),
      })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })

      await expect(adapter.getStats()).rejects.toThrow(
        /500.*Internal Server Error.*boom/
      )
    })

    it('adds Authorization header when getAuthToken resolves a token', async () => {
      const fetchMock = mockFetchOnce({ totalWaiting: 0 })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({
        baseUrl: 'https://api.test',
        getAuthToken: async () => 'my-token',
      })

      await adapter.getStats()

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers.Authorization).toBe('Bearer my-token')
    })

    it('does not add Authorization header when getAuthToken resolves null', async () => {
      const fetchMock = mockFetchOnce({ totalWaiting: 0 })
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({
        baseUrl: 'https://api.test',
        getAuthToken: async () => null,
      })

      await adapter.getStats()

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers.Authorization).toBeUndefined()
    })
  })

  describe('health', () => {
    it('is opt-in: without `health: true` the adapter exposes neither method', () => {
      const adapter = createNestJSAdapter({ baseUrl: 'https://api.test' })
      expect(adapter.getHealth).toBeUndefined()
      expect(adapter.getFailureGroups).toBeUndefined()
    })

    it('getHealth GETs /v1/queue/health on the origin', async () => {
      const body = { generatedAt: 1, queues: [] }
      const fetchMock = mockFetchOnce(body)
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({
        baseUrl: 'https://api.test',
        health: true,
      })

      await expect(adapter.getHealth?.()).resolves.toEqual(body)
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.test/v1/queue/health'
      )
    })

    it('getFailureGroups GETs /v1/queue/failures with an encoded queueName', async () => {
      const body = {
        queueName: 'a b',
        manualRetry: true,
        total: 0,
        scanned: 0,
        groups: [],
      }
      const fetchMock = mockFetchOnce(body)
      vi.stubGlobal('fetch', fetchMock)
      const adapter = createNestJSAdapter({
        baseUrl: 'https://api.test',
        health: true,
      })

      await expect(adapter.getFailureGroups?.('a b')).resolves.toEqual(body)
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.test/v1/queue/failures?queueName=a+b'
      )
    })
  })
})

describe('createNestJSAdapter - token cache', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  const okRes = (status = 200) => ({
    ok: status < 400,
    status,
    statusText: '',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })

  it('calls getAuthToken once for N requests within the TTL, again after it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okRes()))
    const getAuthToken = vi.fn().mockResolvedValue('tok')
    const adapter = createNestJSAdapter({ baseUrl: 'http://x', getAuthToken })

    await Promise.all([
      adapter.getStats(),
      adapter.getStats(),
      adapter.getStats(),
    ])
    await adapter.getStats()
    expect(getAuthToken).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(61_000)
    await adapter.getStats()
    expect(getAuthToken).toHaveBeenCalledTimes(2)
  })

  it('on 401 refreshes the token and retries exactly once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okRes(401))
      .mockResolvedValueOnce(okRes(200))
    vi.stubGlobal('fetch', fetchMock)
    const getAuthToken = vi
      .fn()
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('fresh')
    const adapter = createNestJSAdapter({ baseUrl: 'http://x', getAuthToken })

    await adapter.getStats()
    expect(getAuthToken).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer fresh'
    )
  })

  it('does not retry a second time when the retry is also 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okRes(401))
    vi.stubGlobal('fetch', fetchMock)
    const adapter = createNestJSAdapter({
      baseUrl: 'http://x',
      getAuthToken: vi.fn().mockResolvedValue('t'),
    })
    await expect(adapter.getStats()).rejects.toThrow(/401/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache a null token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okRes()))
    const getAuthToken = vi.fn().mockResolvedValue(null)
    const adapter = createNestJSAdapter({ baseUrl: 'http://x', getAuthToken })
    await adapter.getStats()
    await adapter.getStats()
    expect(getAuthToken).toHaveBeenCalledTimes(2)
  })
})
