/**
 * JobsListModal tests — v5 (2-column list/detail layout, virtualized list)
 *
 * Wraps QueueApiProvider (useQueueApi) + React Query (useQueueJobsAll,
 * useBulkJobAction). @tanstack/react-virtual is mocked to render ALL items
 * (jsdom has no layout engine, so the real virtualizer measures 0 height and
 * returns an empty virtualItems array — see HistoricoTab.test.tsx for the
 * same workaround).
 *
 * Both the desktop DetailPanel and the mobile stacked JobDetailModal render
 * unconditionally (responsive behavior is CSS-driven, not JS-driven — jsdom
 * doesn't apply `hidden`/`md:flex` at all), so tests assert on the wrapper
 * classes for "which layout" and use distinct testids
 * (`detail-panel-*` vs `job-detail-*`) to avoid colliding queries between
 * the two panels when the same job is selected.
 *
 * Sources of truth (read, not altered):
 *   src/queue/components/JobsListModal.tsx
 *   src/queue/components/jobs-list-modal/job-row.tsx
 *   src/queue/components/jobs-list-modal/detail-panel.tsx
 */

import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'

// PRD 068 item 6: QueueTabbedDashboard readOnly hides every mutating action
const readOnly = vi.hoisted(() => ({ value: false }))
vi.mock('./read-only-context', () => ({ useQueueReadOnly: () => readOnly.value }))
afterEach(() => {
  readOnly.value = false
})
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'

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
    scrollToIndex: vi.fn(),
  }),
}))

import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'
import type { JobInfo } from '../types'
import JobsListModal from './JobsListModal'
import { toast } from 'sonner'

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

const failedJob1: JobInfo = {
  id: 'job-f1',
  name: 'gateway_process-data',
  queueName: 'gateway_process-data',
  data: { key: 'value' },
  progress: 0,
  attemptsMade: 3,
  attemptsMax: 3,
  failedReason: 'Connection timeout after 30000ms',
  timestamp: 1700000000000,
  status: 'failed',
}

const failedJob2: JobInfo = {
  ...failedJob1,
  id: 'job-f2',
  name: 'imports_sync-records',
  queueName: 'imports_sync-records',
  failedReason: undefined,
  attemptsMade: 1,
}

const delayedJob: JobInfo = {
  ...failedJob1,
  id: 'job-d1',
  status: 'delayed',
  failedReason: undefined,
  attemptsMade: 0,
}

// ============================================================================
// RENDER HELPER
// ============================================================================

interface RenderProps {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | null
  queueName?: string | null
  queueDisplayName?: string | null
  manualRetry?: boolean
  onClose: () => void
}

function renderModal(props: RenderProps, adapterOverrides: Partial<QueueApiAdapter> = {}) {
  const adapter = makeMockAdapter(adapterOverrides)
  const queryClient = new QueryClient({
    // retryDelay: 0 — useQueueJobsAll hardcodes `retry: 2` (explicit option wins
    // over this client's `retry: false` default), so a rejection test would
    // otherwise wait through real exponential backoff. retryDelay isn't set
    // explicitly by the hook, so the client default (0) applies and retries
    // resolve near-instantly.
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <JobsListModal {...props} />
      </QueueApiProvider>
    </QueryClientProvider>
  )
  return { ...utils, adapter, queryClient }
}

// ============================================================================
// TESTS
// ============================================================================

describe('JobsListModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders null when status is null', () => {
      const { container } = renderModal({ status: null, onClose: vi.fn() })
      expect(container.firstChild).toBeNull()
    })

    it('renders the header with status label and queue count', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      expect(screen.getByRole('heading', { name: /Jobs Falhas/ })).toBeInTheDocument()
      await screen.findByText(/1 job encontrado/)
    })

    it('renders the queueDisplayName suffix in the header when provided', () => {
      renderModal({ status: 'failed', queueName: 'gateway_process-data', queueDisplayName: 'Gateway', onClose: vi.fn() })
      expect(screen.getByText(/- Gateway/)).toBeInTheDocument()
    })

    it('renders search input placeholder', () => {
      renderModal({ status: 'failed', onClose: vi.fn() })
      expect(screen.getByPlaceholderText('Buscar por ID, nome, dados ou erro...')).toBeInTheDocument()
    })

    it('shows loading spinner while the query is in flight', () => {
      const { container } = renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn(() => new Promise(() => {})) } // never resolves
      )
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('shows the empty state when no jobs are returned', async () => {
      renderModal({ status: 'failed', onClose: vi.fn() }, { getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }) })
      await screen.findByText('Nenhum job falhas')
    })

    it('renders job rows for returned jobs', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1, failedJob2], total: 2 }) }
      )
      await screen.findByText('Process Data')
      expect(screen.getByText('Sync Records')).toBeInTheDocument()
    })

    it('shows the inline detail placeholder when no job is selected', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      expect(screen.getByText('Selecione um job para ver detalhes')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('closes with Escape (consumer QA 7.3.1)', async () => {
      const onClose = vi.fn()
      renderModal({ status: 'failed', onClose })
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })

    it('selects a job by clicking its row and shows the inline DetailPanel', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      const panel = screen.getByTestId('detail-panel')
      expect(within(panel).getByText('Detalhes do job')).toBeInTheDocument()
      expect(within(panel).getByText(failedJob1.id)).toBeInTheDocument()
      expect(screen.queryByText('Selecione um job para ver detalhes')).not.toBeInTheDocument()
    })

    it('deselects the job when clicking the same row again', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      const row = screen.getByTestId(`job-row-${failedJob1.id}`)
      await user.click(row)
      expect(screen.getByText('Detalhes do job')).toBeInTheDocument()
      await user.click(row)
      expect(screen.queryByText('Detalhes do job')).not.toBeInTheDocument()
      expect(screen.getByText('Selecione um job para ver detalhes')).toBeInTheDocument()
    })

    it('switches DetailPanel content when a different row is selected', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1, failedJob2], total: 2 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      let panel = screen.getByTestId('detail-panel')
      expect(within(panel).getByText(failedJob1.id)).toBeInTheDocument()
      await user.click(screen.getByTestId(`job-row-${failedJob2.id}`))
      panel = screen.getByTestId('detail-panel')
      expect(within(panel).getByText(failedJob2.id)).toBeInTheDocument()
      expect(within(panel).queryByText(failedJob1.id)).not.toBeInTheDocument()
    })

    it('toggles bulk checkbox selection independently of row selection', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-select-${failedJob1.id}`))
      expect(screen.getByText('1 selecionado')).toBeInTheDocument()
      // Row selection (detail panel) stays untouched by the checkbox click
      expect(screen.queryByText('Detalhes do job')).not.toBeInTheDocument()
    })

    it('selects/deselects all via the toggle-select-all bar', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1, failedJob2], total: 2 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId('jobs-toggle-select-all'))
      expect(screen.getByText('2 selecionados')).toBeInTheDocument()
      await user.click(screen.getByTestId('jobs-toggle-select-all'))
      expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument()
    })

    it('runs a bulk retry action for failed jobs and clears selection on success', async () => {
      const user = userEvent.setup()
      const retryJob = vi.fn()
      const bulkOperation = vi.fn().mockResolvedValue({ success: true, processed: 1, failed: 0 })
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        {
          getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }),
          retryJob,
          bulkOperation,
        }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-select-${failedJob1.id}`))
      await user.click(screen.getByTestId('jobs-bulk-retry'))
      await waitFor(() => expect(bulkOperation).toHaveBeenCalledWith(
        expect.objectContaining({ queueName: failedJob1.queueName, jobIds: [failedJob1.id], operation: 'retry' })
      ))
      await waitFor(() => expect(toast.success).toHaveBeenCalled())
    })

    it('manualRetry=false hides bulk retry and the detail-panel retry, keeps remove', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', manualRetry: false, onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-select-${failedJob1.id}`))
      expect(screen.queryByTestId('jobs-bulk-retry')).not.toBeInTheDocument()
      expect(screen.getByTestId('jobs-bulk-remove')).toBeInTheDocument()
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      expect(screen.queryByTestId('detail-panel-retry')).not.toBeInTheDocument()
    })

    it('runs a bulk promote action for delayed jobs', async () => {
      const user = userEvent.setup()
      const bulkOperation = vi.fn().mockResolvedValue({ success: true, processed: 1, failed: 0 })
      renderModal(
        { status: 'delayed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [delayedJob], total: 1 }), bulkOperation }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-select-${delayedJob.id}`))
      expect(screen.getByTestId('jobs-bulk-promote')).toBeInTheDocument()
      expect(screen.queryByTestId('jobs-bulk-retry')).not.toBeInTheDocument()
      await user.click(screen.getByTestId('jobs-bulk-promote'))
      await waitFor(() => expect(bulkOperation).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'promote' })
      ))
    })

    it('navigates selection with ArrowDown/ArrowUp and scrolls the virtualizer', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1, failedJob2], total: 2 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      let panel = screen.getByTestId('detail-panel')
      expect(within(panel).getByText(failedJob1.id)).toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'ArrowDown' })
      panel = screen.getByTestId('detail-panel')
      expect(within(panel).getByText(failedJob2.id)).toBeInTheDocument()
      expect(within(panel).queryByText(failedJob1.id)).not.toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'ArrowUp' })
      panel = screen.getByTestId('detail-panel')
      expect(within(panel).getByText(failedJob1.id)).toBeInTheDocument()
    })

    it('does nothing on ArrowDown/ArrowUp when no job is selected', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1, failedJob2], total: 2 }) }
      )
      await screen.findByText('Process Data')
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      expect(screen.getByText('Selecione um job para ver detalhes')).toBeInTheDocument()
    })

    it('debounces search input and refetches with the search param', async () => {
      const user = userEvent.setup()
      const getJobsAll = vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 })
      renderModal({ status: 'failed', onClose: vi.fn() }, { getJobsAll })
      await screen.findByText('Process Data')
      getJobsAll.mockClear()
      await user.type(screen.getByPlaceholderText('Buscar por ID, nome, dados ou erro...'), 'timeout')
      await waitFor(() => {
        const lastCall = getJobsAll.mock.calls.at(-1)?.[0] as URLSearchParams
        expect(lastCall?.get('search')).toBe('timeout')
      })
    })

    it('closes the modal when the close (X) button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ status: 'failed', onClose })
      await user.click(screen.getByLabelText('Fechar'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes the modal when the backdrop is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const { container } = renderModal({ status: 'failed', onClose })
      const backdrop = container.querySelector('.fixed.inset-0')!
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('State Management', () => {
    it('retrying a failed job from the inline DetailPanel clears the selection on success', async () => {
      const user = userEvent.setup()
      const retryJob = vi.fn().mockResolvedValue(undefined)
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }), retryJob }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      await user.click(screen.getByTestId('detail-panel-retry'))
      await waitFor(() => expect(retryJob).toHaveBeenCalledWith({ jobId: failedJob1.id, queueName: failedJob1.queueName }))
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Job enviado para reprocessamento'))
      await waitFor(() => expect(screen.getByText('Selecione um job para ver detalhes')).toBeInTheDocument())
    })

    it('removing a job requires confirmation before calling the API', async () => {
      const user = userEvent.setup()
      const removeJob = vi.fn().mockResolvedValue(undefined)
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }), removeJob }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      await user.click(screen.getByTestId('detail-panel-remove'))
      expect(screen.getByText('Confirmar?')).toBeInTheDocument()
      expect(removeJob).not.toHaveBeenCalled()
      await user.click(screen.getByTestId('detail-panel-remove-confirm'))
      await waitFor(() => expect(removeJob).toHaveBeenCalledWith({ jobId: failedJob1.id, queueName: failedJob1.queueName }))
    })

    it('cancelling the remove confirmation keeps the job selected without calling the API', async () => {
      const user = userEvent.setup()
      const removeJob = vi.fn()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }), removeJob }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      await user.click(screen.getByTestId('detail-panel-remove'))
      await user.click(screen.getByTestId('detail-panel-remove-cancel'))
      expect(screen.queryByText('Confirmar?')).not.toBeInTheDocument()
      expect(removeJob).not.toHaveBeenCalled()
      expect(screen.getByText('Detalhes do job')).toBeInTheDocument()
    })

    it('promoting a delayed job calls the API with jobId and queueName', async () => {
      const user = userEvent.setup()
      const promoteJob = vi.fn().mockResolvedValue(undefined)
      renderModal(
        { status: 'delayed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [delayedJob], total: 1 }), promoteJob }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${delayedJob.id}`))
      await user.click(screen.getByTestId('detail-panel-promote'))
      await waitFor(() => expect(promoteJob).toHaveBeenCalledWith({ jobId: delayedJob.id, queueName: delayedJob.queueName }))
    })

    it('copies the job ID to the clipboard from the DetailPanel', async () => {
      const user = userEvent.setup()
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        writable: true,
        configurable: true,
      })
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      await user.click(screen.getByTestId('detail-panel-copy-id'))
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(failedJob1.id)
    })
  })

  describe('Edge Cases', () => {
    it('shows a "no results" message for a search with zero matches', async () => {
      const user = userEvent.setup()
      const getJobsAll = vi
        .fn()
        .mockResolvedValueOnce({ jobs: [failedJob1], total: 1 })
        .mockResolvedValue({ jobs: [], total: 0 })
      renderModal({ status: 'failed', onClose: vi.fn() }, { getJobsAll })
      await screen.findByText('Process Data')
      await user.type(screen.getByPlaceholderText('Buscar por ID, nome, dados ou erro...'), 'nomatch')
      await screen.findByText('Nenhum resultado encontrado')
    })

    it('falls back to the empty list state when the query fails', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockRejectedValue(new Error('network down')) }
      )
      await waitFor(() => expect(screen.getByText('Nenhum job falhas')).toBeInTheDocument())
    })

    it('shows an error toast and keeps the job selected when retry fails', async () => {
      const user = userEvent.setup()
      const retryJob = vi.fn().mockRejectedValue(new Error('boom'))
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }), retryJob }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      await user.click(screen.getByTestId('detail-panel-retry'))
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao reprocessar job'))
      expect(screen.getByText('Detalhes do job')).toBeInTheDocument()
    })

    it('does not show bulk action buttons for completed jobs beyond remove', async () => {
      const user = userEvent.setup()
      const completedJob: JobInfo = { ...failedJob1, id: 'job-c1', status: 'completed', failedReason: undefined }
      renderModal(
        { status: 'completed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [completedJob], total: 1 }) }
      )
      await screen.findByText('Process Data')
      await user.click(screen.getByTestId(`job-select-${completedJob.id}`))
      expect(screen.getByTestId('jobs-bulk-remove')).toBeInTheDocument()
      expect(screen.queryByTestId('jobs-bulk-retry')).not.toBeInTheDocument()
      expect(screen.queryByTestId('jobs-bulk-promote')).not.toBeInTheDocument()
    })

    it('renders a job row without attemptsMade/failedReason badges when not applicable', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob2], total: 1 }) }
      )
      await screen.findByText('Sync Records')
      expect(screen.queryByText(/x$/)).not.toBeInTheDocument()
    })
  })

  describe('Responsive layout', () => {
    it('wraps the inline DetailPanel in a desktop-only class (hidden md:flex)', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }) }
      )
      const placeholder = await screen.findByText('Selecione um job para ver detalhes')
      const wrapper = placeholder.closest('.hidden.md\\:flex')
      expect(wrapper).not.toBeNull()
    })

    it('still mounts the stacked JobDetailModal for mobile (< md), wrapped in md:hidden', async () => {
      const user = userEvent.setup()
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      // Mobile modal renders nothing while no job is selected
      expect(screen.queryByTestId('job-detail-modal-close')).not.toBeInTheDocument()

      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      const mobileClose = screen.getByTestId('job-detail-modal-close')
      const wrapper = mobileClose.closest('.md\\:hidden')
      expect(wrapper).not.toBeNull()
      // And within that mobile modal, the failed job's retry action is present
      expect(within(wrapper as HTMLElement).getByTestId('job-detail-retry')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations with a job selected (list + inline detail + mobile modal all mounted)', async () => {
      const { container } = renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      const user = userEvent.setup()
      await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
      await screen.findByText('Detalhes do job')

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
      expect(results).toHaveNoViolations()
    })

    it('close (X) button has an accessible name', () => {
      renderModal({ status: 'failed', onClose: vi.fn() })
      expect(screen.getByLabelText('Fechar')).toBeInTheDocument()
    })

    it('checkbox toggle buttons have accessible names reflecting selection state', async () => {
      renderModal(
        { status: 'failed', onClose: vi.fn() },
        { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
      )
      await screen.findByText('Process Data')
      expect(screen.getByLabelText('Selecionar job')).toBeInTheDocument()
    })
  })
})

describe('JobsListModal list region', () => {
  it('is a focusable named region', () => {
    renderModal({ status: 'failed', onClose: vi.fn() })
    const region = screen.getByRole('region', { name: 'Lista de jobs' })
    expect(region).toHaveAttribute('tabindex', '0')
  })
})

describe('JobsListModal readOnly (PRD 068)', () => {
  it('hides bulk and detail-panel actions', async () => {
    readOnly.value = true
    const user = userEvent.setup()
    renderModal(
      { status: 'failed', onClose: vi.fn() },
      { getJobsAll: vi.fn().mockResolvedValue({ jobs: [failedJob1], total: 1 }) }
    )
    await screen.findByText('Process Data')
    await user.click(screen.getByTestId(`job-select-${failedJob1.id}`))
    expect(screen.queryByTestId('jobs-bulk-retry')).not.toBeInTheDocument()
    expect(screen.queryByTestId('jobs-bulk-remove')).not.toBeInTheDocument()
    await user.click(screen.getByTestId(`job-row-${failedJob1.id}`))
    expect(screen.queryByTestId('detail-panel-retry')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-panel-remove')).not.toBeInTheDocument()
  })
})
