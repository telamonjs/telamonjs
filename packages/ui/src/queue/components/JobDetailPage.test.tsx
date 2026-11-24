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

import { render, screen, waitFor } from '@testing-library/react'
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
import type { DashboardStats, JobConfig, QueueStats } from '../types'
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
