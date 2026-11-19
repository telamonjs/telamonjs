/**
 * useQueueHealth / useFailureGroups — optional adapter methods:
 * with them → data (Map by queue name / grouped failures); without them the
 * query stays disabled (older backends keep working untouched).
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useFailureGroups, useQueueHealth } from './use-queue-health'
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter, QueueConfigApiAdapter } from '../api/types'
import type { QueueHealth } from '../types'

type Adapter = QueueApiAdapter & Partial<Pick<QueueConfigApiAdapter, 'getHealth' | 'getFailureGroups'>>

function makeAdapter(overrides: Partial<Adapter> = {}): Adapter {
  return {
    getStats: vi.fn(),
    getRedisMetrics: vi.fn(),
    getJobs: vi.fn(),
    getJobsAll: vi.fn(),
    getHistory: vi.fn(),
    getHistoryAll: vi.fn(),
    clearHistory: vi.fn(),
    performAction: vi.fn(),
    retryJob: vi.fn(),
    removeJob: vi.fn(),
    promoteJob: vi.fn(),
    bulkOperation: vi.fn(),
    getDispatchableJobs: vi.fn(),
    dispatchJob: vi.fn(),
    ...overrides,
  }
}

function setup(adapter: Adapter) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(QueueApiProvider, { adapter }, children)
    )
  return { wrapper, queryClient }
}

const health: QueueHealth = {
  name: 'gateway_a',
  displayName: 'A',
  module: 'gateway',
  dispatchable: false,
  manualRetry: true,
  paused: false,
  schedule: null,
  nextRunAt: null,
  lastCompletedAt: 1,
  lastFailedAt: null,
  completedLastHour: 3,
  failedLastHour: 0,
  waiting: 0,
  active: 0,
  status: 'ok',
}

describe('useQueueHealth', () => {
  it('returns a Map keyed by queue name', async () => {
    const adapter = makeAdapter({ getHealth: vi.fn().mockResolvedValue({ generatedAt: 1, queues: [health] }) })
    const { wrapper } = setup(adapter)
    const { result } = renderHook(() => useQueueHealth(), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.get('gateway_a')).toEqual(health)
  })

  it('is a no-op (disabled, no data) when the adapter has no getHealth', () => {
    const { wrapper } = setup(makeAdapter())
    const { result } = renderHook(() => useQueueHealth(), { wrapper })
    expect(result.current.data).toBeUndefined()
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useFailureGroups', () => {
  const response = { queueName: 'gateway_a', manualRetry: false, total: 2, scanned: 2, groups: [] }

  it('fetches the groups of the given queue', async () => {
    const getFailureGroups = vi.fn().mockResolvedValue(response)
    const { wrapper } = setup(makeAdapter({ getFailureGroups }))
    const { result } = renderHook(() => useFailureGroups('gateway_a'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(response))
    expect(getFailureGroups).toHaveBeenCalledWith('gateway_a')
  })

  it('stays disabled while queueName is null', () => {
    const getFailureGroups = vi.fn()
    const { wrapper } = setup(makeAdapter({ getFailureGroups }))
    renderHook(() => useFailureGroups(null), { wrapper })
    expect(getFailureGroups).not.toHaveBeenCalled()
  })

  it('stays disabled when the adapter has no getFailureGroups', () => {
    const { wrapper } = setup(makeAdapter())
    const { result } = renderHook(() => useFailureGroups('gateway_a'), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
