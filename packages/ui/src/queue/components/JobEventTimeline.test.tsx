import { describe, it, expect, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'
import JobEventTimeline from './JobEventTimeline'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const T0 = 1_700_000_000_000

interface ApiJob {
  id: string
  name: string
  queueName: string
  timestamp?: number
  processedOn?: number
  finishedOn?: number
  attemptsMade?: number
  failedReason?: string
  returnvalue?: unknown
}

const completed: ApiJob = {
  id: 'job-1',
  name: 'sync-clientes',
  queueName: 'sync_clientes',
  timestamp: T0,
  processedOn: T0,
  finishedOn: T0 + 1500,
  attemptsMade: 1,
  returnvalue: { imported: 12 },
}
const failed: ApiJob = {
  id: 'job-2',
  name: 'send-sms',
  queueName: 'sms_send',
  timestamp: T0 + 1000,
  processedOn: T0 + 1000,
  finishedOn: T0 + 1250,
  attemptsMade: 3,
  failedReason: 'Gateway timeout',
}
const active: ApiJob = {
  id: 'job-3',
  name: 'import-csv',
  queueName: 'imports_csv',
  timestamp: T0 + 2000,
  processedOn: T0 + 2000,
}

function setup(
  byStatus: Partial<Record<'active' | 'completed' | 'failed', ApiJob[]>> | Error,
  props: { maxItems?: number } = {}
) {
  const getJobsAll = vi.fn((params: URLSearchParams) => {
    if (byStatus instanceof Error) return Promise.reject(byStatus)
    const status = params.get('status') as 'active' | 'completed' | 'failed'
    return Promise.resolve({ jobs: byStatus[status] ?? [], total: 0 })
  })
  const adapter = {
    getJobsAll,
    getStats: vi.fn().mockResolvedValue({ queues: [] }),
  } as unknown as QueueApiAdapter
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <JobEventTimeline {...props} />
      </QueueApiProvider>
    </QueryClientProvider>
  )
  return { ...utils, getJobsAll, user: userEvent.setup() }
}

const dialogHeading = () => screen.getAllByRole('heading', { level: 2 })[0]

describe('JobEventTimeline', () => {
  describe('Rendering', () => {
    it('shows the loading state until the first response', async () => {
      setup({ completed: [completed] })
      expect(screen.getByText('Carregando jobs...')).toBeInTheDocument()
      expect(screen.getByText('Conectando...')).toBeInTheDocument()

      expect(await screen.findByText('sync-clientes')).toBeInTheDocument()
      expect(screen.queryByText('Carregando jobs...')).not.toBeInTheDocument()
    })

    it('asks the API for active, completed and failed jobs', async () => {
      const { getJobsAll } = setup({})
      await screen.findByText('Nenhum job em processamento')

      const statuses = getJobsAll.mock.calls.map(([p]) => p.get('status')).sort()
      expect(statuses).toEqual(['active', 'completed', 'failed'])
    })

    it('shows the empty state when nothing is running', async () => {
      setup({})
      expect(await screen.findByText('Nenhum job em processamento')).toBeInTheDocument()
    })

    it('lists jobs newest first with their queue and a count', async () => {
      setup({ active: [active], completed: [completed], failed: [failed] })

      const names = await screen.findAllByRole('heading', { level: 4 })
      expect(names.map(n => n.textContent)).toEqual(['import-csv', 'send-sms', 'sync-clientes'])
      expect(screen.getByText('imports_csv')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows in-progress for active jobs and the duration for finished ones', async () => {
      setup({ active: [active], completed: [completed], failed: [failed] })

      expect(await screen.findByText('Em andamento...')).toBeInTheDocument()
      // Intl unit formatting may put a (narrow) space before the unit
      const compact = (text: string) => (content: string) => content.replace(/\s/g, '') === text
      expect(screen.getByText(compact('1,5s'))).toBeInTheDocument()
      expect(screen.getByText(compact('250ms'))).toBeInTheDocument()
    })

    it('caps the list at maxItems', async () => {
      setup({ completed: [completed], failed: [failed], active: [active] }, { maxItems: 2 })

      const names = await screen.findAllByRole('heading', { level: 4 })
      expect(names).toHaveLength(2)
    })

    it('shows the disconnected state and the error when the API fails', async () => {
      setup(new Error('down'))

      expect(await screen.findByText(/Erro ao conectar com servidor/)).toBeInTheDocument()
      expect(screen.getByText('Desconectado')).toBeInTheDocument()
      expect(screen.queryByText('Nenhum job em processamento')).not.toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('opens the details of a completed job and closes them again', async () => {
      const { user } = setup({ completed: [completed] })

      await user.click(await screen.findByText('sync-clientes'))

      expect(dialogHeading()).toHaveTextContent('Concluído')
      expect(screen.getByText('job-1')).toBeInTheDocument()
      expect(screen.getByText('1.500ms')).toBeInTheDocument()
      expect(screen.getByText('1 eventos')).toBeInTheDocument()
      const result = screen.getByText('Resultado').closest('div.space-y-2') as HTMLElement
      expect(within(result).getByText(/"imported": 12/)).toBeInTheDocument()

      await user.click(screen.getByTestId('job-timeline-modal-close'))
      expect(screen.queryByText('job-1')).not.toBeInTheDocument()
    })

    it('shows the failure reason of a failed job', async () => {
      const { user } = setup({ failed: [failed] })

      await user.click(await screen.findByText('send-sms'))

      expect(dialogHeading()).toHaveTextContent('Falhou')
      expect(screen.getAllByText('Gateway timeout').length).toBeGreaterThan(0)
    })

    it('an active job has no end time or duration yet', async () => {
      const { user } = setup({ active: [active] })

      await user.click(await screen.findByText('import-csv'))

      expect(dialogHeading()).toHaveTextContent('Em andamento')
      // end date, end time and duration all fall back to the dash
      expect(screen.getAllByText('—')).toHaveLength(3)
    })

    it('closes the details from the X button and the backdrop', async () => {
      const { user, container } = setup({ completed: [completed] })

      await user.click(await screen.findByText('sync-clientes'))
      // The header X (the footer button carries the same name)
      await user.click(screen.getAllByRole('button', { name: 'Fechar' })[0])
      expect(screen.queryByText('job-1')).not.toBeInTheDocument()

      await user.click(screen.getByText('sync-clientes'))
      const backdrop = container.querySelector('.bg-black\\/50') as HTMLElement
      await user.click(backdrop)
      expect(screen.queryByText('job-1')).not.toBeInTheDocument()
    })

    it('copies the job id', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      const { user } = setup({ completed: [completed] })
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

      await user.click(await screen.findByText('sync-clientes'))
      await user.click(screen.getByRole('button', { name: 'Copiar ID' }))

      expect(writeText).toHaveBeenCalledWith('job-1')
    })

    it('the row action buttons do not open the details', async () => {
      const { user } = setup({ failed: [failed] })
      await screen.findByText('send-sms')

      await user.click(screen.getByRole('button', { name: 'Reprocessar job' }))
      await user.click(screen.getByRole('button', { name: 'Remover job' }))

      expect(screen.queryByText('job-2')).not.toBeInTheDocument()
    })

    it('expands to full screen and collapses back', async () => {
      const { user } = setup({})
      await screen.findByText('Nenhum job em processamento')

      await user.click(screen.getByRole('button', { name: 'Expandir timeline' }))
      expect(screen.getByRole('button', { name: 'Recolher timeline' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Fechar timeline expandida' }))
      expect(screen.getByRole('button', { name: 'Expandir timeline' })).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Fechar timeline expandida' })
      ).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('keeps the active entry when a job shows up as active and completed', async () => {
      setup({ active: [{ ...completed, finishedOn: undefined }], completed: [completed] })

      const names = await screen.findAllByRole('heading', { level: 4 })
      expect(names).toHaveLength(1)
      expect(screen.getByText('Em andamento...')).toBeInTheDocument()
    })

    it('renders an empty result object when the job returned nothing', async () => {
      const { user } = setup({ completed: [{ ...completed, returnvalue: undefined }] })

      await user.click(await screen.findByText('sync-clientes'))

      const result = screen.getByText('Resultado').closest('div.space-y-2') as HTMLElement
      expect(within(result).getByText('{}')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    const rules = { 'color-contrast': { enabled: false }, region: { enabled: false } }

    it('has no axe violations in the list', async () => {
      const { container } = setup({ active: [active], completed: [completed], failed: [failed] })
      await screen.findByText('sync-clientes')

      expect(await axe(container, { rules })).toHaveNoViolations()
    })

    it('has no axe violations with the details open', async () => {
      const { container, user } = setup({ failed: [failed] })
      await user.click(await screen.findByText('send-sms'))

      await waitFor(() => expect(screen.getByText('job-2')).toBeInTheDocument())
      expect(await axe(container, { rules })).toHaveNoViolations()
    })
  })
})
