import { describe, it, expect, vi } from 'vitest'

// Real primitives: the accessibility check runs against them
vi.unmock('../../ui/badge')
vi.unmock('../../ui/button')
vi.unmock('../../ui/switch')
vi.unmock('../../ui/card')
vi.unmock('../../ui/input')
vi.unmock('../../ui/label')
vi.unmock('../../ui/textarea')
vi.unmock('../../ui/table')
vi.unmock('@radix-ui/react-slot')
vi.unmock('@radix-ui/react-label')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import type { ComponentProps } from 'react'
import { msg } from '../../i18n/msg'
import { withAppMessages } from '../../test/intl'
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'
import type { DashboardStats, JobConfig, JobHistoryEntry, QueueStats } from '../types'
import JobDetailPage from './JobDetailPage'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const JOB = 'gateway_process-data'
const DESCRIPTION = 'Pulls readings from the gateway and stores them'

const config: JobConfig = {
  jobName: JOB,
  module: 'gateway',
  description: 'Editable config note',
  enabled: true,
  orphan: false,
  timezone: 'UTC',
  priority: 5,
}

function stats(queues: Array<Partial<QueueStats>>): DashboardStats {
  return {
    totalWaiting: 0,
    totalActive: 0,
    totalCompleted: 0,
    totalFailed: 0,
    totalDelayed: 0,
    queues: queues.map(q => ({
      name: JOB,
      displayName: 'Ingest',
      module: 'gateway',
      description: DESCRIPTION,
      dispatchable: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: false,
      ...q,
    })),
  }
}

function page(
  props: Partial<ComponentProps<typeof JobDetailPage>>,
  queues: Array<Partial<QueueStats>>,
  adapterExtra: Record<string, unknown> = {}
) {
  // ponytail: the labels provider only reads getStats; tests add what else they call
  const adapter = { getStats: vi.fn().mockResolvedValue(stats(queues)), ...adapterExtra } as unknown as QueueApiAdapter
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <JobDetailPage config={config} history={[]} {...props} />
      </QueueApiProvider>
    </QueryClientProvider>
  )
}

function renderPage(
  props: Partial<ComponentProps<typeof JobDetailPage>> = {},
  queues: Array<Partial<QueueStats>> = [{}]
) {
  return render(page(props, queues))
}

const title = () => screen.getByRole('heading', { level: 1 })

describe('JobDetailPage', () => {
  describe('Rendering', () => {
    it('titles the page with the contract displayName served by the stats endpoint', async () => {
      renderPage()
      await waitFor(() => expect(title()).toHaveTextContent('Ingest'))
      // The raw name stays visible for operators
      expect(screen.getByText(JOB)).toBeInTheDocument()
    })

    it('shows the contract description as secondary text', async () => {
      renderPage()
      expect(await screen.findByText(DESCRIPTION)).toBeInTheDocument()
    })

    it('shows the raw module key without moduleLabels', async () => {
      renderPage()
      await waitFor(() => expect(title()).toHaveTextContent('Ingest'))
      expect(screen.getByText('gateway')).toBeInTheDocument()
    })
  })

  describe('Labels', () => {
    it('jobLabel wins over the contract displayName; undefined falls back to it', async () => {
      const { unmount } = renderPage({ jobLabel: () => 'Gateway ingest' })
      expect(title()).toHaveTextContent('Gateway ingest')
      unmount()

      renderPage({ jobLabel: () => undefined })
      await waitFor(() => expect(title()).toHaveTextContent('Ingest'))
    })

    it('the enable/disable toast names the job by its label, not the raw id', async () => {
      const user = userEvent.setup()
      const toggleJobConfig = vi.fn().mockResolvedValue({ ...config, enabled: false })
      // The config API is detected by its four methods
      const configApi = { getJobConfigs: vi.fn(), getJobConfig: vi.fn(), updateJobConfig: vi.fn(), toggleJobConfig }
      render(page({ jobLabel: () => 'Gateway ingest' }, [{}], configApi))
      await user.click(screen.getByRole('switch'))
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Job desativado', {
          description: 'Gateway ingest foi desativado com sucesso.',
        })
      )
    })

    it('moduleLabels titles the module badge, msg() included', () => {
      render(page({ moduleLabels: { gateway: msg('mods.gw') } }, []), {
        wrapper: withAppMessages({ mods: { gw: 'Gateway devices' } }),
      })
      expect(screen.getByText('Gateway devices')).toBeInTheDocument()
      expect(screen.queryByText('gateway')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('falls back to the formatted job name when the job has no contract entry', () => {
      renderPage({}, [])
      expect(title()).toHaveTextContent('Process Data')
      expect(screen.queryByText(DESCRIPTION)).not.toBeInTheDocument()
    })

    it('does not repeat the description when it already is the title', async () => {
      renderPage({}, [{ displayName: DESCRIPTION }])
      await waitFor(() => expect(title()).toHaveTextContent(DESCRIPTION))
      expect(screen.getAllByText(DESCRIPTION)).toHaveLength(1)
    })
  })

  describe('Interactions', () => {
    function configApi(overrides: Record<string, unknown> = {}) {
      return {
        getJobConfigs: vi.fn(),
        getJobConfig: vi.fn(),
        updateJobConfig: vi.fn().mockResolvedValue(config),
        toggleJobConfig: vi.fn(),
        getJobConfigHistory: vi.fn(),
        ...overrides,
      }
    }

    it('saves the form, turning empty fields into null and numbers into numbers', async () => {
      const user = userEvent.setup()
      const api = configApi()
      const onRefresh = vi.fn()
      render(page({ onRefresh }, [{}], api))

      await user.type(screen.getByLabelText(/Expressão cron/), '*/5 * * * *')
      await user.type(screen.getByLabelText('Concorrência'), '3')
      await user.clear(screen.getByLabelText('Descrição'))
      await user.click(screen.getByTestId('job-detail-save'))

      await waitFor(() =>
        expect(api.updateJobConfig).toHaveBeenCalledWith(JOB, {
          cronPattern: '*/5 * * * *',
          priority: 5,
          concurrency: 3,
          timeout: null,
          description: null,
        })
      )
      expect(toast.success).toHaveBeenCalledWith('Configurações atualizadas', {
        description: 'As alterações foram salvas com sucesso.',
      })
      expect(onRefresh).toHaveBeenCalled()
    })

    it('reports a failed save and re-enables the button', async () => {
      const user = userEvent.setup()
      const api = configApi({ updateJobConfig: vi.fn().mockRejectedValue(new Error('invalid cron')) })
      const onRefresh = vi.fn()
      render(page({ onRefresh }, [{}], api))

      await user.click(screen.getByTestId('job-detail-save'))

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar', { description: 'invalid cron' })
      )
      expect(onRefresh).not.toHaveBeenCalled()
      expect(screen.getByTestId('job-detail-save')).toBeEnabled()
    })

    it('keeps the status when the toggle fails', async () => {
      const user = userEvent.setup()
      const api = configApi({ toggleJobConfig: vi.fn().mockRejectedValue({}) })
      render(page({}, [{}], api))

      await user.click(screen.getByRole('switch'))

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Erro ao alterar status', {
          description: 'Erro desconhecido',
        })
      )
      expect(screen.getByRole('switch')).toBeChecked()
      expect(screen.getByRole('switch')).toBeEnabled()
    })

    it('the back button calls onBack', async () => {
      const user = userEvent.setup()
      const onBack = vi.fn()
      renderPage({ onBack })

      await user.click(screen.getByRole('button', { name: 'Voltar' }))
      expect(onBack).toHaveBeenCalled()
    })
  })

  describe('Auto-fetch', () => {
    it('loads config and history by jobName when they are not passed', async () => {
      const api = {
        getJobConfigs: vi.fn(),
        getJobConfig: vi.fn().mockResolvedValue(config),
        updateJobConfig: vi.fn(),
        toggleJobConfig: vi.fn(),
        getJobConfigHistory: vi.fn().mockResolvedValue([]),
      }
      render(page({ jobName: JOB, config: undefined, history: undefined }, [{}], api))

      await waitFor(() => expect(title()).toHaveTextContent('Ingest'))
      expect(api.getJobConfig).toHaveBeenCalledWith(JOB)
      expect(api.getJobConfigHistory).toHaveBeenCalledWith(JOB)
    })

    it('shows not found when the job does not exist', async () => {
      const api = {
        getJobConfigs: vi.fn(),
        getJobConfig: vi.fn().mockRejectedValue(new Error('404')),
        updateJobConfig: vi.fn(),
        toggleJobConfig: vi.fn(),
        getJobConfigHistory: vi.fn().mockResolvedValue([]),
      }
      render(page({ jobName: 'ghost', config: undefined, history: undefined }, [], api))

      expect(await screen.findByText('Job não encontrado')).toBeInTheDocument()
      expect(screen.getByText('O job "ghost" não foi encontrado.')).toBeInTheDocument()
    })

    it('says no job was specified without config or jobName', () => {
      render(page({ config: undefined, history: undefined }, []))
      expect(screen.getByText('Nenhum job especificado.')).toBeInTheDocument()
    })
  })

  describe('History and metadata', () => {
    const entry = (e: Partial<JobHistoryEntry>): JobHistoryEntry => ({
      id: e.action ?? 'x',
      action: 'updated',
      changedBy: null,
      changedByUser: null,
      before: null,
      after: null,
      reason: null,
      createdAt: '2026-01-10T12:00:00Z',
      ...e,
    })

    it('shows the empty history message', () => {
      renderPage()
      expect(screen.getByText('Nenhuma alteração registrada ainda')).toBeInTheDocument()
    })

    it('renders each audit entry with action, author, diff and reason', () => {
      renderPage({
        history: [
          entry({
            action: 'disabled',
            changedByUser: { name: 'Ana', email: 'ana@example.com' },
            before: { enabled: true },
            after: { enabled: false },
            reason: 'maintenance',
          }),
          entry({ action: 'created', changedByUser: { name: null, email: 'ops@example.com' } }),
          entry({ action: 'custom-action' }),
        ],
      })

      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(3)

      const [disabled, created, custom] = rows.map(r => within(r))
      expect(disabled.getByText('Desativado')).toBeInTheDocument()
      expect(disabled.getByText('Ana')).toBeInTheDocument()
      expect(disabled.getByText('ana@example.com')).toBeInTheDocument()
      expect(disabled.getByText(/"enabled": true/)).toBeInTheDocument()
      expect(disabled.getByText(/"enabled": false/)).toBeInTheDocument()
      expect(disabled.getByText('maintenance')).toBeInTheDocument()

      expect(created.getByText('Criado')).toBeInTheDocument()
      expect(created.getByText('ops@example.com')).toBeInTheDocument()

      expect(custom.getByText('custom-action')).toBeInTheDocument()
      expect(custom.getByText('Sistema')).toBeInTheDocument()
      // before, after and reason all fall back to the dash
      expect(custom.getAllByText('—')).toHaveLength(3)
    })

    it('shows who updated the config last, falling back to the email', () => {
      renderPage({
        config: {
          ...config,
          updatedAt: new Date().toISOString(),
          updatedByUser: { name: null, email: 'ops@example.com' },
        },
      })
      expect(screen.getByText(/por ops@example\.com/)).toBeInTheDocument()
      expect(screen.getByText('UTC')).toBeInTheDocument()
    })

    it('shows the orphan badge for a config without a contract', () => {
      renderPage({ config: { ...config, orphan: true } })
      expect(screen.getByText('órfão')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations', async () => {
      const { container } = renderPage()
      await screen.findByText(DESCRIPTION)
      const results = await axe(container, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      })
      expect(results).toHaveNoViolations()
    })
  })
})
