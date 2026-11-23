/**
 * QueueTabbedDashboard — focused test for `enableSSE` prop forwarding
 *
 * WHAT CHANGED: `enableSSE` used to be inert; it is now forwarded from
 * QueueTabbedDashboard -> TempoRealTab -> useQueueSSE (see
 * TempoRealTab.test.tsx for the useQueueSSE assertion). This file only
 * covers the QueueTabbedDashboard -> TempoRealTab hop — full behavioral
 * coverage of the dashboard (tab switching, URL sync, auto-provider) is out
 * of scope per the task (queue/ has ~0% historical coverage and raising
 * everything is explicitly not the goal here).
 *
 * TempoRealTab (and the other 3 lazy tabs) are mocked to trivial stubs so
 * this test doesn't need to also stand up QueueApiProvider internals for
 * each tab — the goal is only to observe the prop that reaches TempoRealTab.
 * We provide our own QueueApiProvider so the dashboard's auto-provider path
 * (which needs next-auth's getSession) is never exercised, and we don't set
 * `syncTabWithUrl`, so next/navigation hooks are never exercised either.
 *
 * Source of truth (read, not altered):
 *   src/queue/components/QueueTabbedDashboard.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

vi.mock('./tabs/TempoRealTab', async () => {
  const { useQueueReadOnly } = await import('./read-only-context')
  return {
    default: function TempoRealTabStub({ enableSSE, moduleIcons, active, pollInterval }: { enableSSE?: boolean; moduleIcons?: Record<string, string>; active?: boolean; pollInterval?: number }) {
      const readOnly = useQueueReadOnly()
      return React.createElement(
        'div',
        {
          'data-testid': 'tempo-real-tab',
          'data-enablesse': String(enableSSE),
          'data-moduleicons': JSON.stringify(moduleIcons ?? null),
          'data-readonly': String(readOnly),
          'data-active': String(active),
          'data-pollinterval': String(pollInterval),
        },
        'TempoRealTab stub'
      )
    },
  }
})
vi.mock('./tabs/ConfiguracaoTab', () => ({
  default: () => React.createElement('div', { 'data-testid': 'configuracao-tab' }),
}))
vi.mock('./tabs/RedisTab', () => ({
  default: () => React.createElement('div', { 'data-testid': 'redis-tab' }),
}))
vi.mock('./tabs/HistoricoTab', () => ({
  default: () => React.createElement('div', { 'data-testid': 'historico-tab' }),
}))

import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'
import QueueTabbedDashboard from './QueueTabbedDashboard'

function makeMockAdapter(): QueueApiAdapter {
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
  }
}

function renderDashboard(props: Partial<React.ComponentProps<typeof QueueTabbedDashboard>> = {}) {
  return render(
    <QueueApiProvider adapter={makeMockAdapter()}>
      <QueueTabbedDashboard {...props} />
    </QueueApiProvider>
  )
}

describe('QueueTabbedDashboard', () => {
  describe('Rendering', () => {
    // "Tempo Real" is the default active tab — its (mocked, lazy) content
    // mounts immediately; findBy* because the tab content is React.lazy.
    it('forwards enableSSE=true (default) to TempoRealTab', async () => {
      renderDashboard()
      const tab = await screen.findByTestId('tempo-real-tab')
      expect(tab.dataset.enablesse).toBe('true')
    })

    it('forwards enableSSE=false to TempoRealTab when explicitly disabled', async () => {
      renderDashboard({ enableSSE: false })
      const tab = await screen.findByTestId('tempo-real-tab')
      expect(tab.dataset.enablesse).toBe('false')
    })

    it('forwards moduleIcons to TempoRealTab', async () => {
      renderDashboard({ moduleIcons: { gateway: 'G' } })
      const tab = await screen.findByTestId('tempo-real-tab')
      expect(JSON.parse(tab.dataset.moduleicons ?? 'null')).toEqual({ gateway: 'G' })
    })
  })

  // Issue #7: visited tabs stay mounted, so the timeline must stop polling
  describe('Real-time polling', () => {
    it('forwards pollInterval to TempoRealTab', async () => {
      renderDashboard({ pollInterval: 5_000 })
      const tab = await screen.findByTestId('tempo-real-tab')
      expect(tab.dataset.pollinterval).toBe('5000')
    })

    it('marks TempoRealTab inactive once another tab is selected', async () => {
      renderDashboard()
      const tab = await screen.findByTestId('tempo-real-tab')
      expect(tab.dataset.active).toBe('true')

      await userEvent.click(screen.getByTestId('content-tab-redis'))

      await waitFor(() =>
        expect(screen.getByTestId('tempo-real-tab').dataset.active).toBe('false')
      )
    })
  })

  // PRD 068 item 6
  describe('readOnly', () => {
    it('is off by default (actions stay)', async () => {
      renderDashboard()
      const tab = await screen.findByTestId('tempo-real-tab')
      expect(tab.dataset.readonly).toBe('false')
    })

    it('readOnly reaches the tabs through the queue read-only context', async () => {
      renderDashboard({ readOnly: true })
      const tab = await screen.findByTestId('tempo-real-tab')
      expect(tab.dataset.readonly).toBe('true')
    })
  })
})
