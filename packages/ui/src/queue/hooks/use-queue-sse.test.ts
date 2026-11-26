/**
 * useQueueSSE unit tests — focused on the changed behavior:
 *
 *   - The 'stats' SSE event does NOT write to the query cache while
 *     `queryClient.isMutating({ mutationKey: ['queue-action'] }) > 0`
 *     (avoids a stale SSE frame flickering over an optimistic update).
 *   - Cleanup on unmount clears statsRefreshTimer / reconnect timer / the
 *     fetch AbortController.
 *
 * These are exercised against a real (mocked) `fetch` returning a hand-built
 * SSE `ReadableStream` body — this is the cheapest way to exercise the
 * actual parsing loop without reimplementing it. Full coverage of every SSE
 * event type (job:started/completed/failed/progress/retrying) and the
 * reconnect backoff is out of scope for this task (queue/ has ~0%
 * historical coverage; this file targets only the two behaviors above).
 *
 * Source of truth (read, not altered):
 *   src/queue/hooks/use-queue-sse.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import React from 'react'
import { useQueueSSE } from './use-queue-sse'
import { QueueApiProvider } from '../api/provider'
import type { QueueConfigApiAdapter } from '../api/types'

vi.mock('../../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
}))

function sseStreamFrom(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const text = lines.join('\n') + '\n'
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

function makeConfigAdapter(overrides: Partial<QueueConfigApiAdapter> = {}): QueueConfigApiAdapter {
  return {
    getStats: vi.fn().mockResolvedValue({ totalWaiting: 0, totalActive: 0, totalCompleted: 0, totalFailed: 0, totalDelayed: 0, queues: [] }),
    getRedisMetrics: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getHistory: vi.fn().mockResolvedValue({ jobs: [] }),
    getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    clearHistory: vi.fn().mockResolvedValue({ totalRemoved: 0 }),
    performAction: vi.fn().mockResolvedValue({ success: true }),
    retryJob: vi.fn().mockResolvedValue(undefined),
    removeJob: vi.fn().mockResolvedValue(undefined),
    promoteJob: vi.fn().mockResolvedValue(undefined),
    bulkOperation: vi.fn().mockResolvedValue({ success: true, processed: 0, failed: 0 }),
    getDispatchableJobs: vi.fn().mockResolvedValue([]),
    dispatchJob: vi.fn().mockResolvedValue({ jobId: 'x', queueName: 'y' }),
    getJobConfigs: vi.fn().mockResolvedValue([]),
    getJobConfig: vi.fn(),
    updateJobConfig: vi.fn(),
    toggleJobConfig: vi.fn(),
    toggleModuleJobConfigs: vi.fn(),
    getJobConfigHistory: vi.fn().mockResolvedValue([]),
    getSSEConfig: vi.fn().mockResolvedValue({ url: 'https://api.test/v1/queue/events', token: null }),
    ...overrides,
  }
}

function Harness({ enabled, mutating }: { enabled: boolean; mutating: boolean }) {
  // A parallel mutation under the SAME mutationKey the real useQueueAction
  // uses, left pending (never resolves) so isMutating(['queue-action']) > 0
  // for the duration of the test — mirrors the real skip-check condition.
  const mutation = useMutation({
    mutationKey: ['queue-action'],
    mutationFn: () => new Promise(() => {}),
  })
  const sse = useQueueSSE(enabled)
  return { mutation, sse, mutating }
}

function wrapper(queryClient: QueryClient, adapter: QueueConfigApiAdapter) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(QueueApiProvider, { adapter }, children)
    )
  }
}

describe('useQueueSSE', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('State Management', () => {
    it('does NOT write the stats event to the query cache while a queue-action mutation is in flight', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
      const statsPayload = { type: 'stats', timestamp: '2026-01-01T00:00:00Z', totalWaiting: 42 }
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: sseStreamFrom([
          'event: connected',
          '',
          'event: stats',
          `data: ${JSON.stringify(statsPayload)}`,
          '',
        ]),
      })
      vi.stubGlobal('fetch', fetchMock)

      const adapter = makeConfigAdapter()
      const { result } = renderHook(() => Harness({ enabled: true, mutating: true }), {
        wrapper: wrapper(queryClient, adapter),
      })

      // Start the never-resolving 'queue-action' mutation BEFORE the SSE
      // stats frame is processed, so isMutating(['queue-action']) > 0 the
      // whole time the stream is read.
      act(() => {
        result.current.mutation.mutate()
      })
      await waitFor(() => {
        expect(queryClient.isMutating({ mutationKey: ['queue-action'] })).toBe(1)
      })

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      // Give the stream-reading loop a tick to process the 'stats' frame.
      await waitFor(() => {
        expect(result.current.sse.status).toBe('disconnected') // stream closes after 1 chunk
      })

      expect(queryClient.getQueryData(['queue', 'stats'])).toBeUndefined()
    })

    it('writes the stats event to the query cache when no queue-action mutation is in flight', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const statsPayload = { type: 'stats', timestamp: '2026-01-01T00:00:00Z', totalWaiting: 7 }
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: sseStreamFrom([
          'event: connected',
          '',
          'event: stats',
          `data: ${JSON.stringify(statsPayload)}`,
          '',
        ]),
      })
      vi.stubGlobal('fetch', fetchMock)

      const adapter = makeConfigAdapter()
      const { result } = renderHook(() => useQueueSSE(true), {
        wrapper: wrapper(queryClient, adapter),
      })

      await waitFor(() => {
        expect(queryClient.getQueryData(['queue', 'stats'])).toEqual({ totalWaiting: 7 })
      })
      expect(result.current.status).toBeDefined()
    })

    it('starts with status "connecting" on the first render (before the fetch resolves), and unmounting before open aborts the connection', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      // fetch() never resolves (simulates an SSE connection still opening)
      // so the status can be asserted before any 'connected'/'error' event.
      const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            const err = new Error('aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const adapter = makeConfigAdapter()
      const { result, unmount } = renderHook(() => useQueueSSE(true), {
        wrapper: wrapper(queryClient, adapter),
      })

      // 'connecting' is derived on the very first render — not set from
      // inside connect()'s still-in-flight async body.
      expect(result.current.status).toBe('connecting')

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const signal: AbortSignal = fetchMock.mock.calls[0][1].signal
      expect(signal.aborted).toBe(false)

      unmount()

      expect(signal.aborted).toBe(true)
    })
  })

  describe('Interactions', () => {
    it('reconnects at once, without showing "disconnected", when the server ends the stream with a reconnect frame', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          body: sseStreamFrom([
            'event: connected',
            '',
            'event: reconnect',
            `data: ${JSON.stringify({ type: 'reconnect' })}`,
            '',
          ]),
        })
        // The reconnect: stays open until unmount aborts it
        .mockImplementation((_url: string, options: RequestInit) => {
          return new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => {
              const err = new Error('aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
        })
      vi.stubGlobal('fetch', fetchMock)

      const statuses: string[] = []
      const adapter = makeConfigAdapter()
      const { unmount } = renderHook(
        () => {
          const sse = useQueueSSE(true)
          statuses.push(sse.status)
          return sse
        },
        { wrapper: wrapper(queryClient, adapter) }
      )

      // waitFor gives up after 1s: well inside the 5s error backoff
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      expect(statuses).toContain('connected')
      expect(statuses).not.toContain('disconnected')
      unmount()
    })
  })

  describe('Edge Cases', () => {
    it('aborts the in-flight fetch on unmount', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      // fetch() itself never resolves (simulates an open SSE connection in
      // flight) so we can assert the abort signal fires on unmount.
      const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            const err = new Error('aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const adapter = makeConfigAdapter()
      const { unmount } = renderHook(() => useQueueSSE(true), {
        wrapper: wrapper(queryClient, adapter),
      })

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const signal: AbortSignal = fetchMock.mock.calls[0][1].signal
      expect(signal.aborted).toBe(false)

      unmount()

      expect(signal.aborted).toBe(true)
    })

    it('does nothing (no fetch) when the adapter does not support getSSEConfig', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const adapter = makeConfigAdapter({ getSSEConfig: undefined })
      renderHook(() => useQueueSSE(true), {
        wrapper: wrapper(queryClient, adapter),
      })

      // Give any microtasks a chance to run
      await Promise.resolve()
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
