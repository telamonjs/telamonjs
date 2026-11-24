/**
 * ConfiguracaoTab tests — focused on the changed behavior (task WHAT CHANGED):
 *
 * "There's a guard for a nonexistent job that must run BEFORE the toggling
 * state is set, so the Switch never gets stuck in a permanently-disabled/
 * loading state when toggling a job that doesn't exist."
 *
 * Verified by reading src/queue/components/tabs/ConfiguracaoTab.tsx
 * (handleToggleJob, lines ~125-154): `currentJob = jobs.find(...)` and the
 * `if (!currentJob) return` early-exit run BEFORE `setTogglingJobs(...)`.
 *
 * NOTE on scope: `jobName` passed to the click handler and the `jobs` array
 * used to look it up both come from the SAME render's closure (the row is
 * rendered by iterating the very same `jobs`-derived list). There is no
 * legitimate RTL/black-box interaction that can desync them within a single
 * synchronous click handler (no `await` happens before the guard check) —
 * forcing that desync would require reaching into component internals
 * rather than exercising real behavior. So this suite verifies the
 * observable guarantee the guard exists to protect (a toggled job's Switch
 * always leaves the loading state, never gets stuck) via the normal
 * success/failure paths, plus baseline rendering/interaction coverage since
 * this is a new test file. Full exhaustive coverage of ConfiguracaoTab is
 * out of scope (queue/ has ~0% historical coverage; not the goal here).
 *
 * Source of truth (read, not altered):
 *   src/queue/components/tabs/ConfiguracaoTab.tsx
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
import React from 'react'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { toast } from 'sonner'
import { QueueApiProvider } from '../../api/provider'
import type { QueueConfigApiAdapter } from '../../api/types'
import type { JobConfig } from '../../types'
import ConfiguracaoTab from './ConfiguracaoTab'
import { Zap } from 'lucide-react'
import { QueueLabelsContext, type QueueLabels } from '../labels-context'
import type { QueueModuleIcon } from '../module-icon'

// ============================================================================
// MOCK ADAPTER
// ============================================================================

function makeMockAdapter(overrides: Partial<QueueConfigApiAdapter> = {}): QueueConfigApiAdapter {
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
    toggleJobConfig: vi.fn().mockResolvedValue({}),
    toggleModuleJobConfigs: vi.fn().mockResolvedValue({ updated: 0 }),
    getJobConfigHistory: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

// ============================================================================
// FIXTURES
// ============================================================================

const gatewayJob: JobConfig = {
  jobName: 'gateway_process_data',
  module: 'gateway',
  description: 'Process incoming data',
  enabled: true,
  orphan: false,
  timezone: 'America/Sao_Paulo',
  priority: 5,
}

const importsJob: JobConfig = {
  jobName: 'imports_sync_records',
  module: 'imports',
  description: 'Sync records',
  enabled: false,
  orphan: false,
  timezone: 'America/Sao_Paulo',
  priority: 3,
}

// ============================================================================
// RENDER HELPER
// ============================================================================

function renderTab(adapterOverrides: Partial<QueueConfigApiAdapter> = {}) {
  const adapter = makeMockAdapter(adapterOverrides)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <ConfiguracaoTab />
      </QueueApiProvider>
    </QueryClientProvider>
  )
  return { ...utils, adapter, queryClient }
}

// ============================================================================
// TESTS
// ============================================================================

describe('ConfiguracaoTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('shows a loading spinner while jobs are being fetched', () => {
      renderTab({ getJobConfigs: () => new Promise(() => {}) })
      // Loading state renders only the spinner container — no job/module text yet
      expect(screen.queryByPlaceholderText('Buscar job, módulo...')).not.toBeInTheDocument()
    })

    it('renders module groups after data loads', async () => {
      renderTab({ getJobConfigs: vi.fn().mockResolvedValue([gatewayJob, importsJob]) })
      await waitFor(() => {
        expect(screen.getByText('gateway')).toBeInTheDocument()
        expect(screen.getByText('imports')).toBeInTheDocument()
      })
    })

    it('shows total/enabled/disabled stats counts', async () => {
      renderTab({ getJobConfigs: vi.fn().mockResolvedValue([gatewayJob, importsJob]) })
      await waitFor(() => {
        expect(screen.getByText('2 jobs')).toBeInTheDocument()
        expect(screen.getByText('1 ativo')).toBeInTheDocument()
        expect(screen.getByText('1 inativo')).toBeInTheDocument()
      })
    })

    it('shows "Nenhum job encontrado" when the job list is empty', async () => {
      renderTab({ getJobConfigs: vi.fn().mockResolvedValue([]) })
      await screen.findByText('Nenhum job encontrado')
    })
  })

  describe('Interactions', () => {
    it('expands a module to reveal its jobs on header click', async () => {
      const user = userEvent.setup()
      renderTab({ getJobConfigs: vi.fn().mockResolvedValue([gatewayJob]) })
      await waitFor(() => screen.getByText('gateway'))
      // Job row (formatQueueName-formatted name) is hidden until expanded
      expect(screen.queryByText('Process Data')).not.toBeInTheDocument()
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('Process Data')).toBeInTheDocument()
    })

    it('filters jobs by search query across name/module/description', async () => {
      const user = userEvent.setup()
      renderTab({ getJobConfigs: vi.fn().mockResolvedValue([gatewayJob, importsJob]) })
      await waitFor(() => screen.getByText('gateway'))
      const search = screen.getByPlaceholderText('Buscar job, módulo...')
      await user.type(search, 'imports')
      await waitFor(() => {
        expect(screen.queryByText('gateway')).not.toBeInTheDocument()
        expect(screen.getByText('imports')).toBeInTheDocument()
      })
    })

    it('toggling an existing job calls toggleJobConfig with the flipped enabled value', async () => {
      const user = userEvent.setup()
      const toggleJobConfig = vi.fn().mockResolvedValue({})
      renderTab({
        getJobConfigs: vi.fn().mockResolvedValue([gatewayJob]),
        toggleJobConfig,
      })
      await waitFor(() => screen.getByText('gateway'))
      await user.click(screen.getByText('gateway'))
      const switchEl = screen.getByTestId('switch')
      await user.click(switchEl)
      expect(toggleJobConfig).toHaveBeenCalledWith('gateway_process_data', false)
    })
  })

  describe('State Management', () => {
    it('Switch is disabled only while its own toggle mutation is in flight, then re-enabled', async () => {
      const user = userEvent.setup()
      let resolveToggle: (value: unknown) => void = () => {}
      const pending = new Promise(resolve => {
        resolveToggle = resolve
      })
      const toggleJobConfig = vi.fn().mockReturnValue(pending)
      renderTab({
        getJobConfigs: vi.fn().mockResolvedValue([gatewayJob]),
        toggleJobConfig,
      })
      await waitFor(() => screen.getByText('gateway'))
      await user.click(screen.getByText('gateway'))
      const switchEl = screen.getByTestId('switch')
      await user.click(switchEl)
      expect(switchEl).toBeDisabled()

      resolveToggle({})
      // The guard (currentJob found) already let togglingJobs be set on
      // click; the `finally` block clears it once the mutation settles —
      // this is the observable guarantee the "guard runs before setting
      // toggling state" ordering exists to protect: the Switch never stays
      // stuck disabled.
      await waitFor(() => expect(switchEl).not.toBeDisabled())
    })

    it('Switch is re-enabled even when the toggle mutation rejects', async () => {
      const user = userEvent.setup()
      const toggleJobConfig = vi.fn().mockRejectedValue(new Error('network error'))
      renderTab({
        getJobConfigs: vi.fn().mockResolvedValue([gatewayJob]),
        toggleJobConfig,
      })
      await waitFor(() => screen.getByText('gateway'))
      await user.click(screen.getByText('gateway'))
      const switchEl = screen.getByTestId('switch')
      await user.click(switchEl)
      await waitFor(() => expect(switchEl).not.toBeDisabled())
    })
  })

  describe('Edge Cases', () => {
    it('shows the translated "órfão" badge for orphaned jobs', async () => {
      renderTab({
        getJobConfigs: vi.fn().mockResolvedValue([{ ...gatewayJob, orphan: true }]),
      })
      const user = userEvent.setup()
      await waitFor(() => screen.getByText('gateway'))
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('órfão')).toBeInTheDocument()
    })

    it('shows "Manual" instead of a cron pattern when cronPattern is absent', async () => {
      const user = userEvent.setup()
      renderTab({ getJobConfigs: vi.fn().mockResolvedValue([gatewayJob]) })
      await waitFor(() => screen.getByText('gateway'))
      await user.click(screen.getByText('gateway'))
      expect(screen.getByText('Manual')).toBeInTheDocument()
    })
  })

  // No Accessibility block: this suite is scoped to the guard-ordering
  // behavior + baseline coverage (see file header). Broad axe coverage for
  // ConfiguracaoTab is left to a future pass — not required by this task.
})

describe('ConfiguracaoTab readOnly (PRD 068)', () => {
  it('shows the job state but cannot toggle it, nor the module, nor open its config', async () => {
    readOnly.value = true
    const user = userEvent.setup()
    const toggleJobConfig = vi.fn().mockResolvedValue({})
    renderTab({ getJobConfigs: vi.fn().mockResolvedValue([gatewayJob]), toggleJobConfig })
    await waitFor(() => screen.getByText('gateway'))
    expect(screen.queryByTitle('Desativar todos')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Ativar todos')).not.toBeInTheDocument()
    await user.click(screen.getByText('gateway'))
    const switchEl = screen.getByTestId('switch')
    expect(switchEl).toBeDisabled()
    await user.click(switchEl)
    expect(toggleJobConfig).not.toHaveBeenCalled()
  })
})

// Issue #7 part 2: module/job labels, icon components, group order
describe('ConfiguracaoTab labels (issue #7)', () => {
  const coreJob: JobConfig = { ...importsJob, jobName: 'core_ping', module: 'core' }

  function renderWithLabels(labels: QueueLabels, moduleIcons?: Record<string, QueueModuleIcon>) {
    const adapter = makeMockAdapter({
      getJobConfigs: vi.fn().mockResolvedValue([gatewayJob, coreJob, importsJob]),
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    return render(
      <QueryClientProvider client={queryClient}>
        <QueueApiProvider adapter={adapter}>
          <QueueLabelsContext.Provider value={labels}>
            <ConfiguracaoTab moduleIcons={moduleIcons} />
          </QueueLabelsContext.Provider>
        </QueueApiProvider>
      </QueryClientProvider>
    )
  }

  const groupOrder = () =>
    screen.getAllByTestId(/^module-toggle-/).map(b => b.dataset.testid?.replace('module-toggle-', ''))

  it('renders moduleLabels as group titles and in the module bulk-action names', async () => {
    renderWithLabels({ moduleLabels: { gateway: 'Gateway de comunicação' } })
    expect(await screen.findByText('Gateway de comunicação')).not.toHaveClass('capitalize')
    expect(screen.getByText('core')).toHaveClass('capitalize')
    expect(
      screen.getByLabelText('Desativar todos os jobs de Gateway de comunicação')
    ).toBeInTheDocument()
  })

  it('orders groups like the Real-time tab: moduleLabels order, then alphabetically', async () => {
    renderWithLabels({ moduleLabels: { imports: 'Imports' } })
    await screen.findByText('Imports')
    expect(groupOrder()).toEqual(['imports', 'core', 'gateway'])
  })

  it('uses jobLabel for job rows, keeping the description below', async () => {
    const user = userEvent.setup()
    renderWithLabels({ jobLabel: name => (name === 'gateway_process_data' ? 'Processar dados' : undefined) })
    await user.click(await screen.findByText('gateway'))
    expect(screen.getByText('Processar dados')).toBeInTheDocument()
    expect(screen.getByText('Process incoming data')).toBeInTheDocument()
  })

  it('shows the job name below when the title already is the description', async () => {
    const user = userEvent.setup()
    renderWithLabels({ displayNames: { gateway_process_data: 'Process incoming data' } })
    await user.click(await screen.findByText('gateway'))
    expect(screen.getByText('Process incoming data')).toBeInTheDocument()
    expect(screen.getByText('gateway_process_data')).toBeInTheDocument()
  })

  it('the enable/disable toast names the job by its label, not the raw id', async () => {
    const user = userEvent.setup()
    renderWithLabels({ jobLabel: name => (name === 'gateway_process_data' ? 'Processar dados' : undefined) })
    await user.click(await screen.findByText('gateway'))
    await user.click(screen.getByTestId('switch'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Job desativado', { description: 'Processar dados' })
    )
  })

  it('accepts an icon component as a module icon', async () => {
    renderWithLabels({}, { gateway: Zap })
    await screen.findByText('gateway')
    expect(screen.getByTestId('module-toggle-gateway').querySelector('svg')).not.toBeNull()
  })
})
