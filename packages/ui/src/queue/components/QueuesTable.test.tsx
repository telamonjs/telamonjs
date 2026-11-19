/**
 * QueuesTable characterization tests — WAVE 4
 *
 * Pins CURRENT behavior before any future refactor of QueuesTable.
 * QueuesTable receives a `queues: QueueStats[]` prop plus optional callbacks
 * (onAction, onRefresh). It groups queues by module into expandable accordion
 * sections. Destructive actions (drain/clean) go through AlertDialog confirm.
 * It also renders DispatchJobModal and JobsListModal (both need QueueApiProvider).
 *
 * Sources of truth (read, not altered):
 *   src/queue/components/QueuesTable.tsx
 *   src/queue/types.ts (QueueStats)
 */

import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'

// PRD 068 item 6: QueueTabbedDashboard readOnly hides every mutating action
const readOnly = vi.hoisted(() => ({ value: false }))
vi.mock('./read-only-context', () => ({ useQueueReadOnly: () => readOnly.value }))
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
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

// DispatchJobModal and JobsListModal both use QueueApiProvider, so wrap in it.
// They also use hooks that call the adapter, so provide a mock adapter.
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'

// ============================================================================
// MOCK ADAPTER
// ============================================================================

function makeMockAdapter(): QueueApiAdapter {
  const noop = vi.fn().mockResolvedValue({ success: true, message: 'OK' })
  return {
    getStats: vi.fn().mockResolvedValue({ totalWaiting: 0, totalActive: 0, totalCompleted: 0, totalFailed: 0, totalDelayed: 0, queues: [] }),
    getRedisMetrics: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getHistory: vi.fn().mockResolvedValue({ jobs: [] }),
    getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    clearHistory: vi.fn().mockResolvedValue({ totalRemoved: 0 }),
    performAction: noop,
    retryJob: noop,
    removeJob: noop,
    promoteJob: noop,
    bulkOperation: vi.fn().mockResolvedValue({ success: true, processed: 0, failed: 0 }),
    getDispatchableJobs: vi.fn().mockResolvedValue([]),
    dispatchJob: vi.fn().mockResolvedValue({ jobId: 'x', queueName: 'y' }),
  }
}

// ============================================================================
// FIXTURES
// ============================================================================

import type { QueueHealth, QueueStats } from '../types'

const gatewayQueue1: QueueStats = {
  name: 'gateway_process-data',
  displayName: 'Process Data',
  module: 'gateway',
  description: 'Process incoming data',
  dispatchable: false,
  waiting: 3,
  active: 1,
  completed: 200,
  failed: 2,
  delayed: 0,
  paused: false,
}

const gatewayQueue2: QueueStats = {
  name: 'gateway_send-emails',
  displayName: 'Send Emails',
  module: 'gateway',
  description: 'Send email notifications',
  dispatchable: true,
  waiting: 0,
  active: 0,
  completed: 50,
  failed: 0,
  delayed: 5,
  paused: false,
}

const importQueue: QueueStats = {
  name: 'imports_sync-records',
  displayName: 'Sync Records',
  module: 'imports',
  description: 'Sync records from external source',
  dispatchable: false,
  waiting: 0,
  active: 0,
  completed: 10,
  failed: 0,
  delayed: 0,
  paused: true,
}

const allQueues = [gatewayQueue1, gatewayQueue2, importQueue]

// ============================================================================
// RENDER HELPER
// ============================================================================

function renderQueuesTable(
  queues: QueueStats[],
  onAction = vi.fn().mockResolvedValue(undefined),
  onRefresh = vi.fn(),
  { health, adapter = makeMockAdapter() }: { health?: Map<string, QueueHealth>; adapter?: QueueApiAdapter } = {}
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const { unmount, rerender } = render(
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <QueuesTable queues={queues} health={health} onAction={onAction} onRefresh={onRefresh} />
      </QueueApiProvider>
    </QueryClientProvider>
  )
  return { unmount, rerender, adapter, queryClient }
}

import QueuesTable from './QueuesTable'

// ============================================================================
// TESTS
// ============================================================================

describe('QueuesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders module group headers', () => {
      renderQueuesTable(allQueues)
      expect(screen.getByText('gateway')).toBeInTheDocument()
      expect(screen.getByText('imports')).toBeInTheDocument()
    })

    it('shows queue count per module', () => {
      renderQueuesTable(allQueues)
      // "· 2" and "· 1" appear next to module names
      expect(screen.getAllByText(/·\s*\d+/).length).toBeGreaterThan(0)
    })

    it('renders no module header buttons when queues array is empty', () => {
      renderQueuesTable([])
      // AlertDialog mock always renders cancel/action buttons, so only check for module headers
      expect(screen.queryByText('gateway')).not.toBeInTheDocument()
      expect(screen.queryByText('imports')).not.toBeInTheDocument()
    })

    it('queues are hidden by default (accordion collapsed)', () => {
      renderQueuesTable(allQueues)
      // Table headers are only visible when a section is expanded
      expect(screen.queryByText('Fila')).not.toBeInTheDocument()
    })

    it('shows dispatchable indicator (zap) on module with dispatchable queues', () => {
      // Only gateway module with one dispatchable queue
      renderQueuesTable([gatewayQueue2])
      // The zap count badge "1" appears — use getAllByText to handle duplicates
      const ones = screen.getAllByText('1')
      expect(ones.length).toBeGreaterThan(0)
    })

    it('shows failed count badge next to module name when there are failures', () => {
      // Only queue with failed jobs in its own render
      renderQueuesTable([gatewayQueue1])
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('shows active count when module has active jobs', () => {
      renderQueuesTable([gatewayQueue1])
      // active=1 and dispatchable=0 so only one "1"
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('expands module section on header click', async () => {
      const user = userEvent.setup()
      renderQueuesTable(allQueues)
      await user.click(screen.getByText('gateway'))
      // Table header should now be visible
      expect(screen.getByText('Fila')).toBeInTheDocument()
    })

    it('collapses module section on second click', async () => {
      const user = userEvent.setup()
      renderQueuesTable(allQueues)
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('Fila')).toBeInTheDocument()
      await user.click(screen.getByText('gateway'))
      expect(screen.queryByText('Fila')).not.toBeInTheDocument()
    })

    it('shows queue rows with formatted names after expanding', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1])
      await user.click(screen.getByText('gateway'))
      // QueuesTable.formatQueueName: remove prefix up to first _, replace - with space, capitalize
      // 'gateway_process-data' → 'process-data' → 'process data' → 'Process Data'
      expect(screen.getByText('Process Data')).toBeInTheDocument()
    })

    it('shows "Pausada" badge for paused queues', async () => {
      const user = userEvent.setup()
      renderQueuesTable(allQueues)
      await user.click(screen.getByText('imports'))
      expect(screen.getByText('Pausada')).toBeInTheDocument()
    })

    it('calls onAction with pause action when pause button is clicked', async () => {
      const user = userEvent.setup()
      const onAction = vi.fn().mockResolvedValue(undefined)
      // Use single queue to avoid multiple "Pausar fila" titles
      renderQueuesTable([gatewayQueue1], onAction)
      await user.click(screen.getByText('gateway'))
      const pauseBtn = screen.getByTitle('Pausar fila')
      await user.click(pauseBtn)
      expect(onAction).toHaveBeenCalledWith({
        type: 'pause',
        queueName: 'gateway_process-data',
      })
    })

    it('shows AlertDialog for drain action (destructive, needs confirm)', async () => {
      const user = userEvent.setup()
      const queueWithWaiting: QueueStats = { ...gatewayQueue1, waiting: 5 }
      renderQueuesTable([queueWithWaiting])
      await user.click(screen.getByText('gateway'))
      const drainBtn = screen.getByTitle('Esvaziar fila (remover jobs em espera)')
      await user.click(drainBtn)
      // AlertDialog mock renders content always; check for confirm dialog title
      expect(screen.getByText('Esvaziar fila')).toBeInTheDocument()
    })

    it('calls onAction on AlertDialog confirm for drain', async () => {
      const user = userEvent.setup()
      const onAction = vi.fn().mockResolvedValue(undefined)
      const queueWithWaiting: QueueStats = { ...gatewayQueue1, waiting: 5 }
      renderQueuesTable([queueWithWaiting], onAction)
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByTitle('Esvaziar fila (remover jobs em espera)'))
      // AlertDialog confirm button
      await user.click(screen.getByTestId('alert-dialog-action'))
      expect(onAction).toHaveBeenCalledWith({
        type: 'drain',
        queueName: 'gateway_process-data',
      })
    })

    it('dismisses AlertDialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      const queueWithWaiting: QueueStats = { ...gatewayQueue1, waiting: 5 }
      renderQueuesTable([queueWithWaiting])
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByTitle('Esvaziar fila (remover jobs em espera)'))
      await user.click(screen.getByTestId('alert-dialog-cancel'))
      // Action should not have been called
      // The text "Esvaziar fila" in the AlertDialog should be gone
      // Note: AlertDialog mock renders always, but the dialog text should not appear
      // because confirmAction state is null after cancel
      expect(screen.queryByText('Esta ação é irreversível')).not.toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('shows retry-all button only when queue has failed jobs', async () => {
      const user = userEvent.setup()
      renderQueuesTable(allQueues)
      await user.click(screen.getByText('gateway'))
      // gatewayQueue1 has failed=2, so retry button appears
      expect(screen.getByTitle('Reprocessar jobs com falha')).toBeInTheDocument()
    })

    it('shows clean button only when queue has completed > 100', async () => {
      const user = userEvent.setup()
      renderQueuesTable(allQueues)
      await user.click(screen.getByText('gateway'))
      // gatewayQueue1.completed=200 > 100, so clean button appears
      expect(screen.getByTitle('Limpar jobs concluídos')).toBeInTheDocument()
    })

    it('hides drain when the queue only has delayed jobs (cron iterations)', async () => {
      const user = userEvent.setup()
      // gatewayQueue2: waiting=0, delayed=5 — draining would stall its cron
      renderQueuesTable([gatewayQueue2])
      await user.click(screen.getByText('gateway'))
      expect(screen.queryByTitle('Esvaziar fila (remover jobs em espera)')).not.toBeInTheDocument()
    })

    it('shows drain button when queue has waiting jobs', async () => {
      const user = userEvent.setup()
      // Use single queue to avoid multiple drain buttons
      renderQueuesTable([gatewayQueue1])
      await user.click(screen.getByText('gateway'))
      // gatewayQueue1 has waiting=3, so drain button appears
      expect(screen.getByTitle('Esvaziar fila (remover jobs em espera)')).toBeInTheDocument()
    })

    it('shows play/dispatch button for dispatchable queues', async () => {
      const user = userEvent.setup()
      renderQueuesTable(allQueues)
      await user.click(screen.getByText('gateway'))
      expect(screen.getByTitle('Executar job manualmente')).toBeInTheDocument()
    })

    it('multiple modules can be expanded independently', async () => {
      const user = userEvent.setup()
      renderQueuesTable(allQueues)
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByText('imports'))
      // Both should be expanded: check for multiple "Fila" th
      expect(screen.getAllByText('Fila')).toHaveLength(2)
    })

    it('loadingAction is scoped per-queue: other queues stay enabled while one action is in flight', async () => {
      // loadingAction state shape is `{ queue, action } | null` — the pause
      // button disabled check is `loadingAction?.queue === queue.name`, so an
      // in-flight action on gatewayQueue1 must NOT disable gatewayQueue2's
      // button even though both are in the same expanded "gateway" module.
      const user = userEvent.setup()
      let resolveAction: () => void = () => {}
      const pending = new Promise<void>(resolve => {
        resolveAction = resolve
      })
      const onAction = vi.fn().mockReturnValue(pending)
      renderQueuesTable([gatewayQueue1, gatewayQueue2], onAction)
      await user.click(screen.getByText('gateway'))
      const pauseButtons = screen.getAllByTitle('Pausar fila')
      expect(pauseButtons).toHaveLength(2)

      await user.click(pauseButtons[0])
      expect(onAction).toHaveBeenCalledWith({
        type: 'pause',
        queueName: 'gateway_process-data',
      })
      // Acting queue's button is disabled while its action is pending
      expect(pauseButtons[0]).toBeDisabled()
      // The OTHER queue's button must remain enabled
      expect(pauseButtons[1]).not.toBeDisabled()

      resolveAction()
      await waitFor(() => expect(pauseButtons[0]).not.toBeDisabled())
    })
  })

  describe('Edge Cases', () => {
    it('handles queues with no module (defaults to "other")', () => {
      const noModuleQueue: QueueStats = { ...gatewayQueue1, module: '' }
      renderQueuesTable([noModuleQueue])
      expect(screen.getByText('other')).toBeInTheDocument()
    })

    it('renders a single queue without crashing', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1])
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('Process Data')).toBeInTheDocument()
    })

    it('shows waiting count as clickable when waiting > 0', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1])
      await user.click(screen.getByText('gateway'))
      // waiting=3 is a clickable button
      const waitingBtn = screen.getAllByRole('button').find(b => b.textContent === '3')
      expect(waitingBtn).toBeDefined()
      expect(waitingBtn).not.toBeDisabled()
    })

    it('shows completed count non-clickable when completed is 0', async () => {
      const user = userEvent.setup()
      const emptyQueue: QueueStats = { ...gatewayQueue1, completed: 0, active: 0, waiting: 0, failed: 0, delayed: 0 }
      renderQueuesTable([emptyQueue])
      await user.click(screen.getByText('gateway'))
      // Find the button for completed=0
      const completedBtn = screen.getAllByRole('button').find(b => b.textContent === '0' && b.closest('td'))
      expect(completedBtn).toBeDefined()
      expect(completedBtn).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations when accordion is collapsed (module headers only)', async () => {
      // Collapsed state: only module header buttons with text content are visible.
      // Action icon-only buttons are hidden (accordion collapsed).
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const ad = makeMockAdapter()
      const { container } = render(
        <QueryClientProvider client={qc}>
          <QueueApiProvider adapter={ad}>
            <QueuesTable queues={[gatewayQueue1]} onAction={vi.fn().mockResolvedValue(undefined)} />
          </QueueApiProvider>
        </QueryClientProvider>
      )
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
      // No violations expected when collapsed — module headers have text content
      expect(results).toHaveNoViolations()
    })

    it('renders module header buttons with accessible text', async () => {
      renderQueuesTable(allQueues)
      const gatewayBtn = screen.getByText('gateway').closest('button')
      expect(gatewayBtn).not.toBeNull()
    })
  })

  describe('Bulk action confirmation (count-aware)', () => {
    it('retry-all goes through the confirm dialog with the failed count', async () => {
      const user = userEvent.setup()
      const onAction = vi.fn().mockResolvedValue(undefined)
      renderQueuesTable([gatewayQueue1], onAction)
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByTitle('Reprocessar jobs com falha'))
      expect(onAction).not.toHaveBeenCalled()
      expect(screen.getByText('Reprocessar falhas')).toBeInTheDocument()
      expect(
        screen.getByText('Isso recoloca na fila até 1.000 dos 2 jobs com falha de "Process Data".')
      ).toBeInTheDocument()
      await user.click(screen.getByTestId('alert-dialog-action'))
      expect(onAction).toHaveBeenCalledWith({ type: 'retry-all', queueName: 'gateway_process-data' })
    })

    it('drain confirmation states how many waiting jobs are removed', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1])
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByTitle('Esvaziar fila (remover jobs em espera)'))
      expect(screen.getByText(/Isso remove os 3 jobs em espera de "Process Data"/)).toBeInTheDocument()
    })

    it('clean-failed button confirms and sends clean with status failed', async () => {
      const user = userEvent.setup()
      const onAction = vi.fn().mockResolvedValue(undefined)
      renderQueuesTable([gatewayQueue1], onAction)
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByTitle('Limpar jobs com falha'))
      expect(screen.getByText('Limpar falhas')).toBeInTheDocument()
      await user.click(screen.getByTestId('alert-dialog-action'))
      expect(onAction).toHaveBeenCalledWith({
        type: 'clean',
        queueName: 'gateway_process-data',
        status: 'failed',
      })
    })

    it('hides the clean-failed button when the queue has no failures', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue2])
      await user.click(screen.getByText('gateway'))
      expect(screen.queryByTitle('Limpar jobs com falha')).not.toBeInTheDocument()
    })
  })

  describe('Health (optional)', () => {
    const NOW = Date.now()
    const okHealth: QueueHealth = {
      name: 'gateway_send-emails',
      displayName: 'Send Emails',
      module: 'gateway',
      dispatchable: true,
      manualRetry: true,
      paused: false,
      schedule: '*/5 * * * * *',
      nextRunAt: NOW + 60_000,
      lastCompletedAt: NOW - 4_000,
      lastFailedAt: null,
      completedLastHour: 720,
      failedLastHour: 0,
      waiting: 0,
      active: 0,
      status: 'ok',
    }
    const lateHealth: QueueHealth = {
      ...okHealth,
      name: 'gateway_process-data',
      displayName: 'Process Data',
      schedule: null,
      nextRunAt: null,
      lastCompletedAt: NOW - 2 * 3600_000,
      completedLastHour: 0,
      failedLastHour: 2,
      manualRetry: false,
      status: 'late',
    }
    const health = new Map([
      [okHealth.name, okHealth],
      [lateHealth.name, lateHealth],
    ])

    it('without health the table keeps the plain layout (no status dots or health columns)', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1])
      expect(screen.queryByTestId('queue-module-status-gateway')).not.toBeInTheDocument()
      await user.click(screen.getByText('gateway'))
      expect(screen.queryByText('Último sucesso')).not.toBeInTheDocument()
      expect(screen.queryByTestId('queue-status-gateway_process-data')).not.toBeInTheDocument()
      // retry-all stays available (manualRetry unknown)
      expect(screen.getByTitle('Reprocessar jobs com falha')).toBeInTheDocument()
    })

    it('module header shows the worst status of its queues', () => {
      renderQueuesTable([gatewayQueue1, gatewayQueue2], undefined, undefined, { health })
      const dot = screen.getByTestId('queue-module-status-gateway')
      expect(dot).toHaveClass('bg-red-500')
      expect(dot).toHaveAttribute('title', 'Atrasado')
    })

    it('renders last success, 1h throughput, status badge and next-run tooltip', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1, gatewayQueue2], undefined, undefined, { health })
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('Último sucesso')).toBeInTheDocument()
      expect(screen.getByText('1h')).toBeInTheDocument()
      expect(screen.getByText('Atrasado')).toBeInTheDocument()
      expect(screen.getByText('há 2h')).toBeInTheDocument()
      expect(screen.getByText('720')).toBeInTheDocument()
      // NOW is captured at collection time — seconds drift until the test runs
      expect(screen.getByText(/^há \d+s$/)).toHaveAttribute('title', expect.stringMatching(/^Próxima execução: .+ \(\*\/5 \* \* \* \* \*\)$/))
      expect(screen.getByText('há 2h')).toHaveAttribute(
        'title',
        'Sem agendamento (disparado por outro job ou manualmente)'
      )
      expect(screen.getByTestId('queue-status-gateway_send-emails')).toHaveClass('bg-green-500')
    })

    it('flags failures of the last hour on the failed count', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1], undefined, undefined, { health })
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('+2')).toBeInTheDocument()
      expect(screen.getByTitle('2 na última hora')).toBeInTheDocument()
    })

    it('hides retry-all when the queue has manualRetry=false (clean failed stays)', async () => {
      const user = userEvent.setup()
      renderQueuesTable([gatewayQueue1], undefined, undefined, { health })
      await user.click(screen.getByText('gateway'))
      expect(screen.queryByTitle('Reprocessar jobs com falha')).not.toBeInTheDocument()
      expect(screen.getByTitle('Limpar jobs com falha')).toBeInTheDocument()
    })

    it('clicking the failed count opens the failure groups when the adapter supports them', async () => {
      const user = userEvent.setup()
      const getFailureGroups = vi.fn().mockResolvedValue({
        queueName: 'gateway_process-data',
        manualRetry: true,
        total: 2,
        scanned: 2,
        groups: [],
      })
      const adapter = { ...makeMockAdapter(), getFailureGroups }
      renderQueuesTable([gatewayQueue1], undefined, undefined, { health, adapter })
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByLabelText('Ver falhas de gateway_process-data agrupadas por causa'))
      await waitFor(() => expect(getFailureGroups).toHaveBeenCalledWith('gateway_process-data'))
      expect(await screen.findByText('Falhas por causa')).toBeInTheDocument()
    })

    it('without getFailureGroups the failed count opens the plain failed list (as before)', async () => {
      const user = userEvent.setup()
      const adapter = makeMockAdapter()
      renderQueuesTable([gatewayQueue1], undefined, undefined, { adapter })
      await user.click(screen.getByText('gateway'))
      await user.click(screen.getByLabelText('Ver jobs com falha de gateway_process-data'))
      await waitFor(() => expect(adapter.getJobsAll).toHaveBeenCalled())
      expect(screen.queryByText('Falhas por causa')).not.toBeInTheDocument()
    })
  })
})

describe('QueuesTable readOnly (PRD 068)', () => {
  it('hides dispatch, pause, retry, clean and drain', async () => {
    readOnly.value = true
    const user = userEvent.setup()
    renderQueuesTable([{ ...gatewayQueue1, dispatchable: true, waiting: 5 }])
    await user.click(screen.getByText('gateway'))
    expect(screen.getByText('Process Data')).toBeInTheDocument()
    for (const title of [
      'Pausar fila',
      'Reprocessar jobs com falha',
      'Limpar jobs concluídos',
      'Limpar jobs com falha',
      'Executar job manualmente',
      'Esvaziar fila (remover jobs em espera)',
    ]) {
      expect(screen.queryByTitle(title)).not.toBeInTheDocument()
    }
  })
})
