/**
 * useQueueEventsTimeline unit tests
 *
 * WHAT CHANGED: does 3 parallel fetches (active/completed/failed), merges by
 * id giving priority active > completed/failed, and sorts the merged list
 * by timestamp descending.
 *
 * Source of truth (read, not altered):
 *   src/queue/hooks/use-queue-events-timeline.ts
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  timelinePollInterval,
  useQueueEventsTimeline,
} from './use-queue-events-timeline'
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'

vi.mock('../../hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

function makeMockAdapter(overrides: Partial<QueueApiAdapter> = {}): QueueApiAdapter {
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
    ...overrides,
  }
}

function wrapper(adapter: QueueApiAdapter) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(QueueApiProvider, { adapter }, children)
    )
  }
}

function job(overrides: Partial<{
  id: string
  name: string
  queueName: string
  timestamp: number
  processedOn?: number
  finishedOn?: number
}> = {}) {
  return {
    id: 'j1',
    name: 'someJob',
    queueName: 'gateway_q',
    data: {},
    progress: 0,
    attemptsMade: 1,
    attemptsMax: 3,
    timestamp: Date.now(),
    status: 'completed',
    ...overrides,
  }
}

describe('useQueueEventsTimeline', () => {
  describe('State Management', () => {
    it('does 3 parallel fetches: one each for active/completed/failed', async () => {
      const getJobsAll = vi.fn().mockResolvedValue({ jobs: [], total: 0 })
      const adapter = makeMockAdapter({ getJobsAll })
      const { result } = renderHook(() => useQueueEventsTimeline(), {
        wrapper: wrapper(adapter),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getJobsAll).toHaveBeenCalledTimes(3)
      const statuses = getJobsAll.mock.calls.map(([params]: [URLSearchParams]) => params.get('status'))
      expect(statuses.sort()).toEqual(['active', 'completed', 'failed'])
    })

    it('merges by id, giving priority to active over completed/failed for the same id', async () => {
      // Same job id appears in BOTH the active and completed batches — the
      // active version must win (e.g. a job that transitioned mid-request).
      const sharedId = 'dup-1'
      const getJobsAll = vi.fn().mockImplementation((params: URLSearchParams) => {
        const status = params.get('status')
        if (status === 'active') {
          return Promise.resolve({ jobs: [job({ id: sharedId, name: 'activeVersion', timestamp: 1000 })], total: 1 })
        }
        if (status === 'completed') {
          return Promise.resolve({ jobs: [job({ id: sharedId, name: 'completedVersion', timestamp: 1000 })], total: 1 })
        }
        return Promise.resolve({ jobs: [], total: 0 })
      })
      const adapter = makeMockAdapter({ getJobsAll })
      const { result } = renderHook(() => useQueueEventsTimeline(), {
        wrapper: wrapper(adapter),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const jobs = result.current.data!.jobs
      expect(jobs).toHaveLength(1)
      expect(jobs[0].status).toBe('active')
      expect(jobs[0].name).toBe('activeVersion')
    })

    it('merges by id, giving priority to completed over failed for the same id', async () => {
      const sharedId = 'dup-2'
      const getJobsAll = vi.fn().mockImplementation((params: URLSearchParams) => {
        const status = params.get('status')
        if (status === 'active') return Promise.resolve({ jobs: [], total: 0 })
        if (status === 'completed') {
          return Promise.resolve({ jobs: [job({ id: sharedId, name: 'completedVersion', timestamp: 500 })], total: 1 })
        }
        return Promise.resolve({ jobs: [job({ id: sharedId, name: 'failedVersion', timestamp: 500 })], total: 1 })
      })
      const adapter = makeMockAdapter({ getJobsAll })
      const { result } = renderHook(() => useQueueEventsTimeline(), {
        wrapper: wrapper(adapter),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const jobs = result.current.data!.jobs
      expect(jobs).toHaveLength(1)
      expect(jobs[0].status).toBe('completed')
    })

    it('sorts the merged list by timestamp descending', async () => {
      const getJobsAll = vi.fn().mockImplementation((params: URLSearchParams) => {
        const status = params.get('status')
        if (status === 'active') {
          return Promise.resolve({ jobs: [job({ id: 'a', timestamp: 100 })], total: 1 })
        }
        if (status === 'completed') {
          return Promise.resolve({ jobs: [job({ id: 'b', timestamp: 300 })], total: 1 })
        }
        return Promise.resolve({ jobs: [job({ id: 'c', timestamp: 200 })], total: 1 })
      })
      const adapter = makeMockAdapter({ getJobsAll })
      const { result } = renderHook(() => useQueueEventsTimeline(), {
        wrapper: wrapper(adapter),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const ids = result.current.data!.jobs.map(j => j.id)
      expect(ids).toEqual(['b', 'c', 'a'])
    })
  })
})

describe('timelinePollInterval', () => {
  const base = { isVisible: true, active: true, sseConnected: false }

  it('polls every 2s by default while SSE is down', () => {
    expect(timelinePollInterval(base)).toBe(2_000)
  })

  it('uses a custom interval while SSE is down', () => {
    expect(timelinePollInterval({ ...base, pollInterval: 5_000 })).toBe(5_000)
  })

  it('falls back to a 30s safety net while SSE is connected', () => {
    expect(
      timelinePollInterval({ ...base, sseConnected: true, pollInterval: 5_000 })
    ).toBe(30_000)
  })

  it('does not poll when the Real-time tab is not active', () => {
    expect(timelinePollInterval({ ...base, active: false })).toBe(false)
  })

  it('does not poll when the page is hidden', () => {
    expect(timelinePollInterval({ ...base, isVisible: false })).toBe(false)
  })
})
