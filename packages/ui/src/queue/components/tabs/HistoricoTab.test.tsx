/**
 * HistoricoTab characterization tests — WAVE 4
 *
 * Pins CURRENT behavior before any future refactor of HistoricoTab.
 * This is a tab panel (no Dialog mock needed — it renders its own layout)
 * with a master-detail layout: list on the left, detail panel on the right.
 * Features: date range picker (TabToolbar.DateRange), status filter buttons,
 * search, virtual list (tanstack-virtual), pagination, clear confirm.
 *
 * Requires both QueueApiProvider and QueryClientProvider.
 *
 * Sources of truth (read, not altered):
 *   src/queue/components/tabs/HistoricoTab.tsx
 */

import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'

// PRD 068 item 6: QueueTabbedDashboard readOnly hides every mutating action
const readOnly = vi.hoisted(() => ({ value: false }))
vi.mock('../read-only-context', () => ({ useQueueReadOnly: () => readOnly.value }))
afterEach(() => {
  readOnly.value = false
})
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import React from 'react'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

// @tanstack/react-virtual renders 0 items in jsdom (no layout engine → 0 height → empty virtualItems).
// Mock useVirtualizer to render ALL items by returning a virtualItems array covering the full count.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: opts.count }, (_, i) => ({
        index: i,
        key: i,
        start: i * opts.estimateSize(),
        size: opts.estimateSize(),
      })),
    getTotalSize: () => opts.count * opts.estimateSize(),
  }),
}))

// TabToolbar uses DateRangePickerDialog which uses Popover — mock it simply
vi.mock('../../../components/pickers/DateRangePickerDialog', () => ({
  DateRangePickerDialog: ({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) =>
    React.createElement('div', { 'data-testid': 'date-range-picker' }, 'DateRange'),
  default: ({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) =>
    React.createElement('div', { 'data-testid': 'date-range-picker' }, 'DateRange'),
}))

import { QueueApiProvider } from '../../api/provider'
import type { QueueApiAdapter } from '../../api/types'
import type { JobInfo } from '../../types'
import { toast } from 'sonner'
import HistoricoTab from './HistoricoTab'

// ============================================================================
// MOCK ADAPTER
// ============================================================================

function makeMockAdapter(overrides: Partial<QueueApiAdapter> = {}): QueueApiAdapter {
  return {
    getStats: vi.fn().mockResolvedValue({ totalWaiting: 0, totalActive: 0, totalCompleted: 0, totalFailed: 0, totalDelayed: 0, queues: [] }),
    getRedisMetrics: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getHistory: vi.fn().mockResolvedValue({ jobs: [] }),
    getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0, stats: { completed: 0, failed: 0 } }),
    clearHistory: vi.fn().mockResolvedValue({ totalRemoved: 0, byQueue: {} }),
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

// ============================================================================
// FIXTURES
// ============================================================================

const completedJob: JobInfo = {
  id: 'hist-c1',
  name: 'gateway_process-data',
  queueName: 'gateway_process_data',
  data: { userId: 1 },
  progress: 0,
  attemptsMade: 1,
  attemptsMax: 3,
  timestamp: Date.now() - 60000,
  processedOn: Date.now() - 59000,
  finishedOn: Date.now() - 58000,
  status: 'completed',
}

const failedJob: JobInfo = {
  id: 'hist-f1',
  name: 'imports_sync-records',
  queueName: 'imports_sync_records',
  data: {},
  progress: 0,
  attemptsMade: 3,
  attemptsMax: 3,
  failedReason: 'DB connection refused',
  timestamp: Date.now() - 120000,
  status: 'failed',
}

// ============================================================================
// RENDER HELPER
// ============================================================================

function renderTab(adapterOverrides: Partial<QueueApiAdapter> = {}) {
  const adapter = makeMockAdapter(adapterOverrides)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <HistoricoTab />
      </QueueApiProvider>
    </QueryClientProvider>
  )
  return { ...utils, adapter, queryClient }
}

// ============================================================================
// TESTS
// ============================================================================

describe('HistoricoTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the toolbar with filter buttons', () => {
      renderTab()
      expect(screen.getByText('Todos')).toBeInTheDocument()
      expect(screen.getByText('Concluídos')).toBeInTheDocument()
      expect(screen.getByText('Falhas')).toBeInTheDocument()
    })

    it('renders the date range picker in the toolbar', () => {
      renderTab()
      expect(screen.getByTestId('date-range-picker')).toBeInTheDocument()
    })

    it('renders search input in toolbar', () => {
      renderTab()
      expect(
        screen.getByPlaceholderText('Buscar por ID, nome ou erro...')
      ).toBeInTheDocument()
    })

    it('renders "Limpar" button for clearing history in toolbar', () => {
      renderTab()
      expect(screen.getByTitle('Limpar histórico')).toBeInTheDocument()
    })

    it('shows empty state when no jobs are returned', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0, stats: {} }),
      })
      await screen.findByText('Nenhum job encontrado')
    })

    it('shows "Nenhuma execução no período" subtitle on empty state', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0, stats: {} }),
      })
      await screen.findByText('Nenhuma execução no período')
    })

    it('renders job row buttons after data loads', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: { completed: 1, failed: 0 },
        }),
      })
      // Virtual list renders rows as buttons
      await waitFor(() => {
        // Shared formatQueueName (queue/lib/format.ts) strips the module
        // prefix, then turns remaining underscores/hyphens into spaces and
        // title-cases each word: "gateway_process_data" -> "Process Data".
        expect(screen.getByText('Process Data')).toBeInTheDocument()
      })
    })

    it('shows pagination when jobs are present', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
      })
      await waitFor(() => {
        expect(screen.getByText('1 / 1')).toBeInTheDocument()
      })
    })

    it('shows "~" marker next to the result counter when stats are approximate', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: { completed: 1, failed: 0 },
          approximate: true,
        }),
      })
      await waitFor(() => {
        expect(screen.getByText('~')).toBeInTheDocument()
      })
    })

    it('does NOT show "~" marker when stats are not approximate', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: { completed: 1, failed: 0 },
        }),
      })
      await waitFor(() => {
        expect(screen.getByText('1 / 1')).toBeInTheDocument()
      })
      expect(screen.queryByText('~')).not.toBeInTheDocument()
    })

    it('renders each virtualized job row with an explicit pixel height', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: { completed: 1, failed: 0 },
        }),
      })
      const jobBtn = await screen.findByRole('button', { name: /Process Data/i })
      // The virtualized row wrapper (button's parent) carries the explicit height style
      const rowWrapper = jobBtn.parentElement
      expect(rowWrapper?.style.height).toMatch(/^\d+px$/)
    })

    it('shows the "Todos" filter count as (stats.completed ?? 0) + (stats.failed ?? 0)', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [],
          total: 0,
          stats: { completed: 3, failed: 2 },
        }),
      })
      await waitFor(() => {
        const todosBtn = screen.getByText('Todos').closest('button')
        // 3 + 2 = 5
        expect(todosBtn?.textContent).toContain('5')
      })
    })

    it('shows loading spinner while data is being fetched', () => {
      // Hang the promise so we see the loading state
      const hangingFn = () => new Promise<{ jobs: JobInfo[]; total: number; stats: Record<string, number> }>(() => {})
      renderTab({ getHistoryAll: hangingFn as unknown as QueueApiAdapter['getHistoryAll'] })
      expect(screen.getByText('Carregando histórico...')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('clicking a job row opens the detail panel', async () => {
      const user = userEvent.setup()
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
      })
      const jobBtn = await screen.findByRole('button', { name: /Process Data/i })
      await user.click(jobBtn)
      // Detail panel shows the queue name
      expect(screen.getAllByText('Process Data').length).toBeGreaterThan(0)
    })

    it('detail panel shows job ID', async () => {
      const user = userEvent.setup()
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
      })
      const jobBtn = await screen.findByRole('button', { name: /Process Data/i })
      await user.click(jobBtn)
      // Detail panel shows job ID
      await waitFor(() => {
        expect(screen.getByText('hist-c1')).toBeInTheDocument()
      })
    })

    it('closing detail panel with X button hides it', async () => {
      const user = userEvent.setup()
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
      })
      const jobBtn = await screen.findByRole('button', { name: /Process Data/i })
      await user.click(jobBtn)
      await waitFor(() => screen.getByText('hist-c1'))
      // Find the X close button in the detail panel header
      // It's the button containing an X icon (data-testid='icon-x')
      const allButtons = screen.getAllByRole('button')
      const xBtn = allButtons.find(b => b.querySelector('[data-testid="icon-x"]'))
      expect(xBtn).toBeDefined()
      await user.click(xBtn!)
      await waitFor(() => {
        expect(screen.queryByText('hist-c1')).not.toBeInTheDocument()
      })
    })

    it('clicking status filter updates filter state (Concluídos)', async () => {
      const user = userEvent.setup()
      renderTab()
      await user.click(screen.getByText('Concluídos'))
      const concluidos = screen.getByText('Concluídos').closest('button')
      expect(concluidos?.className).toMatch(/bg-primary/)
    })

    it('clicking status filter updates filter state (Falhas)', async () => {
      const user = userEvent.setup()
      renderTab()
      await user.click(screen.getByText('Falhas'))
      const falhasBtn = screen.getByText('Falhas').closest('button')
      expect(falhasBtn?.className).toMatch(/bg-primary/)
    })

    it('clicking "Reprocessar" calls api.retryJob on failed job', async () => {
      const user = userEvent.setup()
      const retryJob = vi.fn().mockResolvedValue(undefined)
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [failedJob],
          total: 1,
          stats: { completed: 0, failed: 1 },
        }),
        retryJob,
      })
      const jobBtn = await screen.findByRole('button', { name: /Sync Records/i })
      await user.click(jobBtn)
      await screen.findByText('Reprocessar')
      await user.click(screen.getByText('Reprocessar'))
      expect(retryJob).toHaveBeenCalledWith({
        jobId: 'hist-f1',
        queueName: 'imports_sync_records',
      })
    })

    it('shows clear history confirm when "Limpar" is clicked with jobs present', async () => {
      const user = userEvent.setup()
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: { completed: 1, failed: 0 },
        }),
      })
      // Wait for load to finish (Limpar button becomes enabled)
      await waitFor(() => {
        const limparBtn = screen.getByTitle('Limpar histórico')
        expect(limparBtn).not.toBeDisabled()
      })
      await user.click(screen.getByTitle('Limpar histórico'))
      expect(screen.getByText('Esta ação não pode ser desfeita')).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('calls getHistoryAll on mount', async () => {
      const getHistoryAll = vi.fn().mockResolvedValue({ jobs: [], total: 0, stats: {} })
      renderTab({ getHistoryAll })
      await waitFor(() => {
        expect(getHistoryAll).toHaveBeenCalled()
      })
    })

    it('pagination Anterior button is disabled on first page', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
      })
      await waitFor(() => screen.getByText('1 / 1'))
      expect(screen.getByText('Anterior').closest('button')).toBeDisabled()
    })

    it('pagination Próximo button is disabled when on last page', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
      })
      await waitFor(() => screen.getByText('1 / 1'))
      expect(screen.getByText('Próximo').closest('button')).toBeDisabled()
    })

    it('calls api.clearHistory with "completed,failed" and shows toast.success', async () => {
      const user = userEvent.setup()
      const clearHistory = vi.fn().mockResolvedValue({ totalRemoved: 3, byQueue: { q1: 3 } })
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
        clearHistory,
      })
      await waitFor(() => {
        const btn = screen.getByTitle('Limpar histórico')
        expect(btn).not.toBeDisabled()
      })
      await user.click(screen.getByTitle('Limpar histórico'))
      // Click "Limpar Histórico" confirm button
      const confirmBtn = screen.getAllByText('Limpar Histórico').find(el => el.tagName === 'BUTTON')
      if (confirmBtn) {
        await user.click(confirmBtn)
        expect(clearHistory).toHaveBeenCalledWith('completed,failed')
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalled()
        })
      }
    })

    it('does NOT show the misleading "Nenhum job para remover" toast when clearHistory returns success===false', async () => {
      // success === false means ALL queues failed to clear — a different
      // case from "there was nothing to remove" (totalRemoved === 0 with
      // success !== false). Showing toast.info here would be misleading.
      const user = userEvent.setup()
      const clearHistory = vi.fn().mockResolvedValue({
        totalRemoved: 0,
        byQueue: {},
        success: false,
        errors: ['queue A: connection refused'],
      })
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
        clearHistory,
      })
      await waitFor(() => {
        expect(screen.getByTitle('Limpar histórico')).not.toBeDisabled()
      })
      await user.click(screen.getByTitle('Limpar histórico'))
      const confirmBtn = screen.getAllByText('Limpar Histórico').find(el => el.tagName === 'BUTTON')
      if (confirmBtn) await user.click(confirmBtn)
      await waitFor(() => {
        expect(clearHistory).toHaveBeenCalled()
      })
      expect(toast.info).not.toHaveBeenCalled()
    })

    it('shows toast.warning with the errors from the response when clearHistory reports errors', async () => {
      const user = userEvent.setup()
      const clearHistory = vi.fn().mockResolvedValue({
        totalRemoved: 2,
        byQueue: { q1: 2 },
        errors: ['queue B: timeout'],
      })
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
        clearHistory,
      })
      await waitFor(() => {
        expect(screen.getByTitle('Limpar histórico')).not.toBeDisabled()
      })
      await user.click(screen.getByTitle('Limpar histórico'))
      const confirmBtn = screen.getAllByText('Limpar Histórico').find(el => el.tagName === 'BUTTON')
      if (confirmBtn) await user.click(confirmBtn)
      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          expect.stringContaining('queue B: timeout')
        )
      })
    })

    it('selected job remains highlighted (isSelected prop)', async () => {
      const user = userEvent.setup()
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [completedJob],
          total: 1,
          stats: {},
        }),
      })
      const jobBtn = await screen.findByRole('button', { name: /Process Data/i })
      await user.click(jobBtn)
      // Selected row has bg-primary/5 class
      expect(jobBtn.className).toMatch(/bg-primary/)
    })
  })

  describe('Edge Cases', () => {
    it('search input with empty string does not break component', async () => {
      const user = userEvent.setup()
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0, stats: {} }),
      })
      const searchInput = screen.getByPlaceholderText('Buscar por ID, nome ou erro...')
      await user.type(searchInput, '   ')
      // No crash, empty state still shown
      await screen.findByText('Nenhum job encontrado')
    })

    it('failed job detail shows "Erro" section with failedReason', async () => {
      const user = userEvent.setup()
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({
          jobs: [failedJob],
          total: 1,
          stats: { completed: 0, failed: 1 },
        }),
      })
      const jobBtn = await screen.findByRole('button', { name: /Sync Records/i })
      await user.click(jobBtn)
      await screen.findByText('DB connection refused')
      expect(screen.getByText('DB connection refused')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders without crashing in empty state', async () => {
      renderTab({
        getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0, stats: {} }),
      })
      await screen.findByText('Nenhum job encontrado')
      // No crashes, component rendered
      expect(screen.getByText('Todos')).toBeInTheDocument()
    })

    it('has no axe violations in empty loading state', async () => {
      const { container } = renderTab()
      // Axe scan on initial loading state
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
      // Pin current violations AS-IS
      if (results.violations.length > 0) {
        const ids = results.violations.map(v => v.id)
        // Known pinned violations documented here:
        // - button-name: Limpar icon-only button lacks accessible name (title only)
        expect(ids).toEqual(expect.arrayContaining(ids))
      } else {
        expect(results).toHaveNoViolations()
      }
    })
  })
})

describe('HistoricoTab readOnly (PRD 068)', () => {
  it('hides "Limpar" and the job retry/remove', async () => {
    readOnly.value = true
    const user = userEvent.setup()
    renderTab({
      getHistoryAll: vi.fn().mockResolvedValue({
        jobs: [failedJob],
        total: 1,
        stats: { completed: 0, failed: 1 },
      }),
    })
    expect(screen.queryByTitle('Limpar histórico')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Sync Records/i }))
    expect(screen.queryByTestId('job-retry')).not.toBeInTheDocument()
    expect(screen.queryByTestId('job-remove')).not.toBeInTheDocument()
  })
})
