/**
 * BrowserLogger transport: shipping browser logs to a backend
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserLogger, type BrowserLogEntry } from '../../../src/adapters/browser'
import { createBrowserLogger } from '../../../src/core/factory'
import { LogLevel } from '../../../src/core/types'

type FakeDocument = EventTarget & { visibilityState: 'visible' | 'hidden' }

describe('BrowserLogger transport', () => {
  let win: EventTarget
  let doc: FakeDocument
  let fetchMock: ReturnType<typeof vi.fn>
  let beacon: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    for (const m of ['log', 'error', 'warn', 'debug'] as const) {
      vi.spyOn(console, m).mockImplementation(() => {})
    }
    win = new EventTarget()
    doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as const })
    fetchMock = vi.fn().mockResolvedValue(new Response(null))
    beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('window', win)
    vi.stubGlobal('document', doc)
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  /** Logs sent through `fetch`, batch by batch. */
  const fetched = (): BrowserLogEntry[][] =>
    fetchMock.mock.calls.map(c => (JSON.parse((c[1] as RequestInit).body as string) as { logs: BrowserLogEntry[] }).logs)

  describe('Rendering', () => {
    it('sends nothing without a transport', () => {
      const logger = new BrowserLogger()
      logger.error('boom')
      vi.advanceTimersByTime(60_000)
      logger.flush()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('does nothing on the server (no window)', () => {
      vi.stubGlobal('window', undefined)
      const logger = new BrowserLogger({ transport: { endpoint: '/api/logs' } })
      logger.error('boom')
      logger.flush()
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    it('ships WARN and above by default, every flush interval, as JSON', () => {
      const logger = new BrowserLogger({ transport: { endpoint: '/api/logs' } })
      logger.info('fine')
      logger.warn('careful', { module: 'billing' })
      logger.error('boom')
      expect(fetchMock).not.toHaveBeenCalled()

      vi.advanceTimersByTime(5000)
      expect(fetchMock).toHaveBeenCalledWith('/api/logs', expect.objectContaining({ method: 'POST', keepalive: true }))
      const [batch] = fetched()
      expect(batch?.map(e => e.message)).toEqual(['careful', 'boom'])
      expect(batch?.[0]).toMatchObject({ level: LogLevel.WARN, levelName: 'WARN', context: { module: 'billing' } })
      expect(batch?.[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('honours the transport level and the logger level', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO, transport: { endpoint: '/x', level: LogLevel.INFO } })
      logger.debug('hidden by the logger level')
      logger.info('shipped')
      logger.flush()
      expect(fetched()[0]?.map(e => e.message)).toEqual(['shipped'])
    })

    it('ships as soon as batchSize entries are queued', () => {
      const logger = new BrowserLogger({ transport: { endpoint: '/x', batchSize: 2 } })
      logger.error('1')
      expect(fetchMock).not.toHaveBeenCalled()
      logger.error('2')
      expect(fetched()).toEqual([[expect.objectContaining({ message: '1' }), expect.objectContaining({ message: '2' })]])
    })

    it('children share the parent queue and add their context', () => {
      const logger = new BrowserLogger({ transport: { endpoint: '/x' } })
      logger.child({ module: 'a' }).error('from child')
      logger.error('from parent')
      logger.flush()
      expect(fetched()).toHaveLength(1)
      expect(fetched()[0]?.[0]?.context).toEqual({ module: 'a' })
    })

    it('hands batches to a custom send function', () => {
      const send = vi.fn()
      const logger = createBrowserLogger({ transport: { send } })
      logger.error('boom')
      ;(logger as BrowserLogger).flush()
      expect(send).toHaveBeenCalledWith([expect.objectContaining({ message: 'boom' })])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('uses sendBeacon when the page is hidden, fetch if the beacon is refused', () => {
      const logger = new BrowserLogger({ transport: { endpoint: '/x' } })
      logger.error('closing')
      doc.visibilityState = 'hidden'
      doc.dispatchEvent(new Event('visibilitychange'))
      expect(beacon).toHaveBeenCalledWith('/x', expect.any(Blob))
      expect(fetchMock).not.toHaveBeenCalled()

      beacon.mockReturnValue(false)
      logger.error('too big for a beacon')
      win.dispatchEvent(new Event('pagehide'))
      expect(fetched()[0]?.[0]?.message).toBe('too big for a beacon')
    })
  })

  describe('Edge Cases', () => {
    it('drops PII keys at any depth by default', () => {
      const logger = new BrowserLogger({ transport: { endpoint: '/x' } })
      logger
        .withUser({ id: 'u1', email: 'a@b.c', role: 'admin' })
        .error('boom', { ip: '1.2.3.4', userAgent: 'UA', request: { authorization: 'Bearer x', path: '/p' } })
      logger.flush()
      expect(fetched()[0]?.[0]?.context).toEqual({ userId: 'u1', userRole: 'admin', request: { path: '/p' } })
    })

    it('keeps them with includePii', () => {
      const logger = new BrowserLogger({ transport: { endpoint: '/x', includePii: true } })
      logger.error('boom', { userEmail: 'a@b.c' })
      logger.flush()
      expect(fetched()[0]?.[0]?.context).toEqual({ userEmail: 'a@b.c' })
    })

    it('serializes errors and never throws when delivery fails', async () => {
      fetchMock.mockRejectedValue(new Error('offline'))
      const send = vi.fn(() => {
        throw new Error('sync failure')
      })
      const viaFetch = new BrowserLogger({ transport: { endpoint: '/x' } })
      viaFetch.error('boom', { error: new Error('cause') })
      expect(() => viaFetch.flush()).not.toThrow()
      expect(fetched()[0]?.[0]?.context.error).toMatchObject({ message: 'cause', name: 'Error' })

      const viaSend = new BrowserLogger({ transport: { send } })
      viaSend.error('boom')
      expect(() => viaSend.flush()).not.toThrow()
      await vi.runOnlyPendingTimersAsync()
    })

    it('enabled:false still wins over a transport', () => {
      const logger = createBrowserLogger({ enabled: false, transport: { endpoint: '/x' } })
      logger.error('boom')
      expect(logger).not.toBeInstanceOf(BrowserLogger)
    })
  })
})
