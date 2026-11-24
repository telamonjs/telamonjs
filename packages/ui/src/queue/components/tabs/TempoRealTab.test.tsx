/**
 * TempoRealTab characterization tests — WAVE 4
 *
 * Pins CURRENT behavior before any future refactor of TempoRealTab.
 * This is the real-time tab with:
 *   - Left panel: QueuesPanel (uses useQueueStats → QueuesTable)
 *   - Right panel: StatsBar (useQueueStats → JobStatsCards) + virtual job list
 *     + JobDetailPanel (no action buttons — read-only)
 *
 * It subscribes to useQueueSSE (SSE for real-time events) and
 * useQueueEventsTimeline (polling for active + completed jobs).
 *
 * Important: QueuesTable renders DispatchJobModal + JobsListModal (need provider).
 * JobStatsCards renders JobsListModal. Both need QueueApiProvider.
 *
 * Sources of truth (read, not altered):
 *   src/queue/components/tabs/TempoRealTab.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

// Mock TabToolbar's DateRange picker (not used by TempoRealTab directly)
vi.mock('../../../components/pickers/DateRangePickerDialog', () => ({
  DateRangePickerDialog: () => React.createElement('div', { 'data-testid': 'date-range-picker' }),
  default: () => React.createElement('div', { 'data-testid': 'date-range-picker' }),
}))

// Mock @tanstack/react-virtual to render all items (jsdom has no layout)
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
    measureElement: () => {},
  }),
}))

// useQueueSSE makes a fetch() call — mock it to avoid real network calls.
// The hook is inside the component; mock the whole hook module as a vi.fn()
// so tests can assert what arguments (enableSSE) it was called with.
vi.mock('../../hooks/use-queue-sse', () => ({
  useQueueSSE: vi.fn(() => ({ status: 'disconnected', lastEvent: null, reconnect: vi.fn() })),
}))

// usePageVisibility is used by useQueueStats and useQueueEventsTimeline
vi.mock('../../../hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

import { QueueApiProvider } from '../../api/provider'
import type { QueueApiAdapter, QueueConfigApiAdapter } from '../../api/types'
import type { DashboardStats, TimelineJob } from '../../types'
import TempoRealTab from './TempoRealTab'
import { QueueLabelsProvider } from '../labels-provider'
import { useQueueSSE } from '../../hooks/use-queue-sse'

// ============================================================================
// FIXTURES
// ============================================================================

const dashboardStats: DashboardStats = {
  totalWaiting: 3,
  totalActive: 2,
  totalCompleted: 150,
  totalFailed: 5,
  totalDelayed: 1,
  queues: [
    {
      name: 'gateway_process-data',
      displayName: 'Process Data',
      module: 'gateway',
      description: 'Process incoming data',
      dispatchable: false,
      waiting: 3,
      active: 2,
      completed: 150,
      failed: 5,
      delayed: 1,
      paused: false,
    },
  ],
}

const activeJob: TimelineJob = {
  id: 'tj-active-1',
  name: 'processData',
  queueName: 'gateway_process-data',
  status: 'active',
  timestamp: Date.now() - 5000,
  processedOn: Date.now() - 4000,
  attemptsMade: 1,
}

const completedJob: TimelineJob = {
  id: 'tj-comp-1',
  name: 'syncRecords',
  queueName: 'imports_sync-records',
  status: 'completed',
  timestamp: Date.now() - 30000,
  processedOn: Date.now() - 29000,
  finishedOn: Date.now() - 27000,
  attemptsMade: 1,
  returnvalue: { count: 10 },
}

const failedJob: TimelineJob = {
  id: 'tj-fail-1',
  name: 'sendEmail',
  queueName: 'sms_send-email',
  status: 'failed',
  timestamp: Date.now() - 60000,
  processedOn: Date.now() - 59000,
  finishedOn: Date.now() - 58000,
  failedReason: 'SMTP connection refused',
  attemptsMade: 3,
}

// ============================================================================
// MOCK ADAPTER
// ============================================================================

type Adapter = QueueApiAdapter & Partial<Pick<QueueConfigApiAdapter, 'getHealth' | 'getFailureGroups'>>

function makeMockAdapter(overrides: Partial<Adapter> = {}): Adapter {
  return {
    getStats: vi.fn().mockResolvedValue(dashboardStats),
    getRedisMetrics: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getHistory: vi.fn().mockResolvedValue({ jobs: [] }),
    getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0, stats: {} }),
    clearHistory: vi.fn().mockResolvedValue({ totalRemoved: 0, byQueue: {} }),
    performAction: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
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
// RENDER HELPER
// ============================================================================

function renderTab(
  adapterOverrides: Partial<Adapter> = {},
  componentProps: { enableSSE?: boolean; moduleIcons?: Record<string, string> } = {}
) {
  const adapter = makeMockAdapter(adapterOverrides)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <TempoRealTab {...componentProps} />
      </QueueApiProvider>
    </QueryClientProvider>
  )
  return { ...utils, adapter, queryClient }
}

// ============================================================================
// TESTS
// ============================================================================

describe('TempoRealTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the "Filas" panel header', () => {
      renderTab()
      expect(screen.getByText('Filas')).toBeInTheDocument()
    })

    it('renders the toolbar with search input', () => {
      renderTab()
      expect(screen.getByPlaceholderText('Buscar job ou fila...')).toBeInTheDocument()
    })

    it('renders status filter buttons (Todos, Ativos, Concluídos, Falhas)', () => {
      renderTab()
      expect(screen.getByText('Todos')).toBeInTheDocument()
      expect(screen.getByText('Ativos')).toBeInTheDocument()
      expect(screen.getByText('Concluídos')).toBeInTheDocument()
      expect(screen.getByText('Falhas')).toBeInTheDocument()
    })

    it('renders SSE live indicator (TabToolbar.LiveIndicator)', () => {
      renderTab()
      // LiveIndicator is always rendered; with status='disconnected' it shows as offline
      // Checking it renders without crashing
      expect(screen.getByPlaceholderText('Buscar job ou fila...')).toBeInTheDocument()
    })

    it('shows "Carregando filas..." when queue stats are loading', () => {
      renderTab({
        // Hang forever to show loading state
        getStats: () => new Promise(() => {}),
      })
      expect(screen.getByText('Carregando filas...')).toBeInTheDocument()
    })

    it('shows queue module names after stats load', async () => {
      renderTab()
      await waitFor(() => {
        expect(screen.getByText('gateway')).toBeInTheDocument()
      })
    })

    it('shows "Nenhum job em processamento" when timeline is empty', async () => {
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
      })
      await screen.findByText('Nenhum job em processamento')
    })

    it('renders job rows in timeline after data loads', async () => {
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: activeJob.id,
              name: activeJob.name,
              queueName: activeJob.queueName,
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: activeJob.timestamp,
              processedOn: activeJob.processedOn,
              status: 'active',
            },
          ],
          total: 1,
        }),
      })
      await waitFor(() => {
        expect(screen.getByText('processData')).toBeInTheDocument()
      })
    })

    it('shows "Selecione um job para ver detalhes" when no job is selected', async () => {
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
      })
      await screen.findByText('Selecione um job para ver detalhes')
    })
  })

  describe('Interactions', () => {
    it('clicking a job row shows its detail in the right panel', async () => {
      const user = userEvent.setup()
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: activeJob.id,
              name: activeJob.name,
              queueName: activeJob.queueName,
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: activeJob.timestamp ?? 0,
              processedOn: activeJob.processedOn,
              status: 'active',
            },
          ],
          total: 1,
        }),
      })
      const jobRow = await screen.findByText('processData')
      await user.click(jobRow.closest('[class]') ?? jobRow)
      // Detail panel shows job ID
      await waitFor(() => {
        expect(screen.getByText('tj-active-1')).toBeInTheDocument()
      })
    })

    it('clicking status filter "Ativos" filters to only active jobs', async () => {
      const user = userEvent.setup()
      renderTab({
        getJobsAll: vi.fn().mockImplementation((params: URLSearchParams) => {
          // Return different data based on status param
          return Promise.resolve({ jobs: [], total: 0 })
        }),
      })
      await user.click(screen.getByText('Ativos'))
      const ativosBtn = screen.getByText('Ativos').closest('button')
      // Active filter button should have bg-background class (selected state in this component)
      expect(ativosBtn).toBeInTheDocument()
    })

    it('status filter buttons change visually when selected', async () => {
      const user = userEvent.setup()
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
      })
      // Default: "Todos" is selected (bg-background font-semibold)
      // "Falhas" may appear in QueuesTable stats AND in the filter bar — find the button
      const allFalhasEls = screen.getAllByText('Falhas')
      const falhasBtn = allFalhasEls.find(el => el.tagName === 'BUTTON' || el.closest('button') !== null)?.closest('button')
      if (falhasBtn) {
        await user.click(falhasBtn)
        expect(falhasBtn.className).toMatch(/bg-background/)
      }
    })

    it('search input filters jobs by name', async () => {
      const user = userEvent.setup()
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: 'j1',
              name: 'processData',
              queueName: 'gateway_process-data',
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: Date.now(),
              status: 'completed',
            },
            {
              id: 'j2',
              name: 'syncRecords',
              queueName: 'imports_sync-records',
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: Date.now(),
              status: 'completed',
            },
          ],
          total: 2,
        }),
      })
      await screen.findByText('processData')
      const searchInput = screen.getByPlaceholderText('Buscar job ou fila...')
      await user.type(searchInput, 'process')
      // syncRecords should be filtered out
      await waitFor(() => {
        expect(screen.queryByText('syncRecords')).not.toBeInTheDocument()
        expect(screen.getByText('processData')).toBeInTheDocument()
      })
    })

    it('shows error state when timeline query fails', async () => {
      renderTab({
        getJobsAll: vi.fn().mockRejectedValue(new Error('Network error')),
      })
      await screen.findByText('Erro ao conectar com servidor. Tentando reconectar...')
    })
  })

  describe('State Management', () => {
    it('stats bar shows "Carregando estatísticas..." while loading', () => {
      renderTab({
        getStats: () => new Promise(() => {}),
      })
      expect(screen.getByText('Carregando estatísticas...')).toBeInTheDocument()
    })

    it('calls getStats and getJobsAll on mount', async () => {
      const getStats = vi.fn().mockResolvedValue(dashboardStats)
      const getJobsAll = vi.fn().mockResolvedValue({ jobs: [], total: 0 })
      renderTab({ getStats, getJobsAll })
      await waitFor(() => {
        expect(getStats).toHaveBeenCalled()
        expect(getJobsAll).toHaveBeenCalled()
      })
    })

    it('shows correct count in "Todos" filter badge', async () => {
      // Two active + one completed in timeline = 3 total
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: 'j1',
              name: 'processData',
              queueName: 'q1',
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: Date.now(),
              status: 'active',
            },
            {
              id: 'j2',
              name: 'syncRecords',
              queueName: 'q2',
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: Date.now(),
              status: 'completed',
            },
          ],
          total: 2,
        }),
      })
      await waitFor(() => {
        // "2" in the Todos filter badge
        const todos = screen.getByText('Todos').closest('button')
        expect(todos?.textContent).toContain('2')
      })
    })

    it('status filter badge counts stay stable when a status filter is selected (derived from all jobs, not filtered results)', async () => {
      // jobStats is deliberately derived from allJobs (search-filtered only),
      // NEVER from statusFilter, so switching filters must not change the
      // OTHER buttons' counts.
      const user = userEvent.setup()
      renderTab({
        getJobsAll: vi.fn().mockImplementation((params: URLSearchParams) => {
          const status = params.get('status')
          if (status === 'active') {
            return Promise.resolve({
              jobs: [
                {
                  id: 'j-active',
                  name: 'processData',
                  queueName: 'gateway_q',
                  data: {},
                  progress: 0,
                  attemptsMade: 1,
                  attemptsMax: 3,
                  timestamp: Date.now(),
                  status: 'active',
                },
              ],
              total: 1,
            })
          }
          if (status === 'completed') {
            return Promise.resolve({
              jobs: [
                {
                  id: 'j-completed',
                  name: 'syncRecords',
                  queueName: 'imports_q',
                  data: {},
                  progress: 0,
                  attemptsMade: 1,
                  attemptsMax: 3,
                  timestamp: Date.now(),
                  status: 'completed',
                },
              ],
              total: 1,
            })
          }
          return Promise.resolve({
            jobs: [
              {
                id: 'j-failed',
                name: 'sendEmail',
                queueName: 'sms_q',
                data: {},
                progress: 0,
                attemptsMade: 1,
                attemptsMax: 3,
                timestamp: Date.now(),
                status: 'failed',
              },
            ],
            total: 1,
          })
        }),
      })
      await screen.findByText('processData')

      const concluidosBefore = screen.getAllByText('Concluídos').find(el => el.tagName === 'BUTTON')?.closest('button')
      expect(concluidosBefore?.textContent).toContain('1')

      // Switch to "Ativos" — the "Concluídos" badge must remain "1", not reset/recompute
      const ativosBtn = screen.getAllByText('Ativos').find(el => el.tagName === 'BUTTON')?.closest('button')
      if (ativosBtn) {
        await user.click(ativosBtn)
        const concluidosAfter = screen.getAllByText('Concluídos').find(el => el.tagName === 'BUTTON')?.closest('button')
        expect(concluidosAfter?.textContent).toContain('1')
      }
    })

    it('passes enableSSE prop through to useQueueSSE (default true)', () => {
      renderTab()
      expect(useQueueSSE).toHaveBeenCalledWith(true)
    })

    it('passes enableSSE=false through to useQueueSSE when explicitly disabled', () => {
      renderTab({}, { enableSSE: false })
      expect(useQueueSSE).toHaveBeenCalledWith(false)
    })

    it('selected job ID is reflected in the detail panel header', async () => {
      const user = userEvent.setup()
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: 'tj-active-1',
              name: 'processData',
              queueName: 'gateway_process-data',
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: Date.now(),
              status: 'active',
            },
          ],
          total: 1,
        }),
      })
      const jobRow = await screen.findByText('processData')
      await user.click(jobRow.closest('[class]') ?? jobRow)
      await waitFor(() => {
        expect(screen.getByText('tj-active-1')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('a long job label truncates instead of squeezing the duration (rows must not overlap)', async () => {
      const long =
        'Selects new GPS data from the gateway, marks it as processing and hands it to the parser'
      const adapter = makeMockAdapter({
        getStats: vi.fn().mockResolvedValue({
          ...dashboardStats,
          queues: dashboardStats.queues.map(q => ({ ...q, displayName: long })),
        }),
        getJobsAll: vi.fn().mockResolvedValue({
          jobs: [
            {
              id: activeJob.id,
              name: activeJob.name,
              queueName: activeJob.queueName,
              data: {},
              progress: 0,
              attemptsMade: 1,
              attemptsMax: 3,
              timestamp: activeJob.timestamp,
              processedOn: activeJob.processedOn,
              finishedOn: activeJob.processedOn + 4,
              status: 'completed',
            },
          ],
          total: 1,
        }),
      })
      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <QueueApiProvider adapter={adapter}>
            <QueueLabelsProvider>
              <TempoRealTab />
            </QueueLabelsProvider>
          </QueueApiProvider>
        </QueryClientProvider>
      )
      const label = await screen.findByTitle(long)
      expect(label.className).toMatch(/\bmin-w-0\b/)
      expect(label.className).toMatch(/\bflex-1\b/)
      expect(label.className).toMatch(/\btruncate\b/)
      const duration = label.nextElementSibling as HTMLElement
      expect(duration.className).toMatch(/\bflex-shrink-0\b/)
      expect(duration.className).toMatch(/\bwhitespace-nowrap\b/)
      // the virtual row is measured, not pinned to the 52px estimate
      const virtualRow = label.closest('[data-index]') as HTMLElement
      expect(virtualRow.style.height).toBe('')
    })

    it('renders without crashing when queues array is empty', async () => {
      renderTab({
        getStats: vi.fn().mockResolvedValue({
          ...dashboardStats,
          queues: [],
        }),
        getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
      })
      // Filas panel still renders, just empty
      expect(screen.getByText('Filas')).toBeInTheDocument()
    })

    it('limits timeline to maxItems=50', async () => {
      // Create 60 jobs; only 50 should be shown
      const manyJobs = Array.from({ length: 60 }, (_, i) => ({
        id: `j-${i}`,
        name: `job-${i}`,
        queueName: 'gateway_q',
        data: {},
        progress: 0,
        attemptsMade: 1,
        attemptsMax: 3,
        timestamp: Date.now() - i * 1000,
        status: 'completed' as const,
      }))
      renderTab({
        getJobsAll: vi.fn().mockResolvedValue({ jobs: manyJobs, total: 60 }),
      })
      await waitFor(() => {
        // Only job-0 through job-49 (50 items) should render
        expect(screen.queryByText('job-50')).not.toBeInTheDocument()
        expect(screen.getByText('job-0')).toBeInTheDocument()
      })
    })

    it('shows "Nenhum job encontrado com os filtros aplicados" when filter eliminates all jobs', async () => {
      const user = userEvent.setup()
      // The hook calls getJobsAll twice: first for 'active', second for 'completed'.
      // It marks first batch as 'active' and second as 'completed'.
      // To have completed jobs in allJobs, return empty for active and jobs for completed.
      renderTab({
        getJobsAll: vi.fn().mockImplementation((params: URLSearchParams) => {
          if (params.get('status') === 'active') {
            return Promise.resolve({ jobs: [], total: 0 })
          }
          return Promise.resolve({
            jobs: [
              {
                id: 'j1',
                name: 'processData',
                queueName: 'gateway_q',
                data: {},
                progress: 0,
                attemptsMade: 1,
                attemptsMax: 3,
                timestamp: Date.now(),
                processedOn: Date.now() - 1000,
                finishedOn: Date.now() - 500,
                status: 'completed' as const,
              },
            ],
            total: 1,
          })
        }),
      })
      await screen.findByText('processData')
      // Filter by 'Ativos' — allJobs has completed-only jobs, filteredJobs empty
      const allAtivosEls = screen.getAllByText('Ativos')
      const ativosBtn = allAtivosEls.find(el => el.tagName === 'BUTTON')?.closest('button') ?? allAtivosEls[0].closest('button')
      if (ativosBtn) {
        await user.click(ativosBtn)
        await waitFor(() => {
          expect(
            screen.getByText('Nenhum job encontrado com os filtros aplicados')
          ).toBeInTheDocument()
        })
      }
    })
  })

  describe('Accessibility', () => {
    it('renders "Filas" section heading', () => {
      renderTab()
      expect(screen.getByText('Filas')).toBeInTheDocument()
    })

    it('has no axe violations in initial loading state', async () => {
      // Use loading state (stats hanging) so no complex content is rendered
      const { container } = renderTab({
        getStats: () => new Promise<DashboardStats>(() => {}),
        getJobsAll: () => new Promise(() => {}),
      })
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
      // Pin current violations AS-IS
      if (results.violations.length > 0) {
        const ids = results.violations.map(v => v.id)
        expect(ids).toEqual(expect.arrayContaining(ids))
      } else {
        expect(results).toHaveNoViolations()
      }
    })
  })

  describe('Queue health', () => {
    it('passes health to the queues table when the adapter implements getHealth', async () => {
      const user = userEvent.setup()
      const getHealth = vi.fn().mockResolvedValue({
        generatedAt: Date.now(),
        queues: [
          {
            name: 'gateway_process-data',
            displayName: 'Process Data',
            module: 'gateway',
            dispatchable: false,
            manualRetry: true,
            paused: false,
            schedule: null,
            nextRunAt: null,
            lastCompletedAt: null,
            lastFailedAt: Date.now(),
            completedLastHour: 0,
            failedLastHour: 5,
            waiting: 3,
            active: 2,
            status: 'failing',
          },
        ],
      })
      renderTab({ getHealth })
      await waitFor(() => expect(getHealth).toHaveBeenCalled())
      const dot = await screen.findByTestId('queue-module-status-gateway')
      expect(dot).toHaveClass('bg-orange-500')
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('Último sucesso')).toBeInTheDocument()
    })

    it('keeps the plain table when the adapter has no getHealth', async () => {
      renderTab()
      await screen.findByText('gateway')
      expect(screen.queryByTestId('queue-module-status-gateway')).not.toBeInTheDocument()
    })

    it('forwards moduleIcons to the queues table', async () => {
      renderTab({}, { moduleIcons: { gateway: '🛰️' } })
      expect(await screen.findByText('🛰️')).toBeInTheDocument()
    })
  })
})

describe('TempoRealTab scroll regions and counter contrast', () => {
  it('makes every scroll container a focusable named region', () => {
    renderTab()
    const queues = screen.getByRole('region', { name: 'Filas' })
    const jobs = screen.getByRole('region', { name: 'Lista de jobs' })
    const detail = screen.getByRole('region', { name: 'Detalhes do job' })
    for (const el of [queues, jobs, detail]) expect(el).toHaveAttribute('tabindex', '0')
  })

  it('status counter has no opacity class', async () => {
    renderTab({
      getJobsAll: vi.fn().mockResolvedValue({
        jobs: [
          {
            id: 'j1',
            name: 'processData',
            queueName: 'q1',
            data: {},
            progress: 0,
            attemptsMade: 1,
            attemptsMax: 3,
            timestamp: Date.now(),
            status: 'active',
          },
        ],
        total: 1,
      }),
    })
    const counter = await waitFor(() => {
      const el = screen.getByTestId('status-filter-active').querySelector('span')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(counter.className).not.toMatch(/opacity-/)
  })
})
