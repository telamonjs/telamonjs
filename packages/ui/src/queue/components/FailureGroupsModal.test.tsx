/**
 * FailureGroupsModal — failures grouped by cause; retry/discard a whole group
 * via the bulk endpoint; manualRetry=false shows a notice and only discard.
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
import React from 'react'
import { toast } from 'sonner'
import FailureGroupsModal from './FailureGroupsModal'
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter, QueueConfigApiAdapter } from '../api/types'
import type { FailureGroupsResponse } from '../types'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

type Adapter = QueueApiAdapter & Partial<Pick<QueueConfigApiAdapter, 'getFailureGroups'>>

function makeAdapter(overrides: Partial<Adapter> = {}): Adapter {
  return {
    getStats: vi.fn(),
    getRedisMetrics: vi.fn(),
    getJobs: vi.fn(),
    getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getHistory: vi.fn(),
    getHistoryAll: vi.fn(),
    clearHistory: vi.fn(),
    performAction: vi.fn(),
    retryJob: vi.fn(),
    removeJob: vi.fn(),
    promoteJob: vi.fn(),
    bulkOperation: vi.fn().mockResolvedValue({ success: true, processed: 2, failed: 0 }),
    getDispatchableJobs: vi.fn(),
    dispatchJob: vi.fn(),
    ...overrides,
  }
}

const response: FailureGroupsResponse = {
  queueName: 'gateway_process-data',
  manualRetry: true,
  total: 3,
  scanned: 3,
  groups: [
    {
      reason: 'Server has closed the connection',
      sample: 'Server has closed the connection\n    at foo',
      count: 2,
      firstAt: 1_700_000_000_000,
      lastAt: 1_700_000_100_000,
      jobIds: ['1', '2'],
    },
    { reason: 'timeout', sample: 'timeout', count: 1, firstAt: 1_700_000_000_000, lastAt: 1_700_000_000_000, jobIds: ['3'] },
  ],
}

function renderModal(adapter: Adapter, queueName: string | null = 'gateway_process-data', onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <QueueApiProvider adapter={adapter}>
        <FailureGroupsModal queueName={queueName} onClose={onClose} />
      </QueueApiProvider>
    </QueryClientProvider>
  )
  return { onClose }
}

describe('FailureGroupsModal', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('Rendering', () => {
    it('renders nothing while queueName is null', () => {
      const getFailureGroups = vi.fn()
      renderModal(makeAdapter({ getFailureGroups }), null)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(getFailureGroups).not.toHaveBeenCalled()
    })

    it('lists groups with count, reason and summary', async () => {
      renderModal(makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) }))
      expect(await screen.findByText('Server has closed the connection')).toBeInTheDocument()
      expect(screen.getByText('2×')).toBeInTheDocument()
      expect(screen.getByText('3 falhas em 2 causas')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toHaveAccessibleName(/Falhas por causa/)
      // full message only when the sample differs from the normalized reason
      expect(screen.getAllByText('mensagem completa')).toHaveLength(1)
    })

    it('flags a sampled grouping when scanned < total', async () => {
      renderModal(makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue({ ...response, total: 10000, scanned: 500 }) }))
      expect(await screen.findByText(/agrupadas as 500 mais recentes/)).toBeInTheDocument()
      // ICU plural + locale grouping (was "falha(s)" and "10000")
      expect(screen.getByText(/10\.000 falhas em 2 causas/)).toBeInTheDocument()
    })

    it('shows an error state with a way to the jobs list when grouping fails (e.g. 404)', async () => {
      renderModal(makeAdapter({ getFailureGroups: vi.fn().mockRejectedValue(new Error('404')) }))
      expect(await screen.findByTestId('failure-groups-error-view-jobs')).toBeInTheDocument()
      expect(screen.queryByText(/Carregando falhas/)).not.toBeInTheDocument()
    })

    it('shows the empty state', async () => {
      renderModal(makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue({ ...response, total: 0, scanned: 0, groups: [] }) }))
      expect(await screen.findByText('Nenhuma falha registrada.')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('retries a whole group via bulk with its jobIds', async () => {
      const user = userEvent.setup()
      const adapter = makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) })
      renderModal(adapter)
      await user.click(await screen.findByTitle('Reprocessar 2 jobs'))
      // asks first, with the count and the cause
      expect(adapter.bulkOperation).not.toHaveBeenCalled()
      expect(screen.getByText(/recoloca na fila 2 jobs com a falha "Server has closed the connection"/)).toBeInTheDocument()
      await user.click(screen.getByTestId('alert-dialog-action'))
      await waitFor(() =>
        expect(adapter.bulkOperation).toHaveBeenCalledWith({
          queueName: 'gateway_process-data',
          jobIds: ['1', '2'],
          operation: 'retry',
        })
      )
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 jobs reprocessados'))
    })

    it('discards a whole group via bulk remove', async () => {
      const user = userEvent.setup()
      const adapter = makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) })
      renderModal(adapter)
      await user.click(await screen.findByTitle('Descartar 1 job'))
      expect(adapter.bulkOperation).not.toHaveBeenCalled()
      await user.click(screen.getByTestId('alert-dialog-action'))
      await waitFor(() =>
        expect(adapter.bulkOperation).toHaveBeenCalledWith({
          queueName: 'gateway_process-data',
          jobIds: ['3'],
          operation: 'remove',
        })
      )
    })

    it('shows an error toast when the bulk call fails', async () => {
      const user = userEvent.setup()
      const adapter = makeAdapter({
        getFailureGroups: vi.fn().mockResolvedValue(response),
        bulkOperation: vi.fn().mockRejectedValue(new Error('boom')),
      })
      renderModal(adapter)
      await user.click(await screen.findByTitle('Descartar 1 job'))
      await user.click(screen.getByTestId('alert-dialog-action'))
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha ao executar a ação'))
    })

    it('closes via the close button', async () => {
      const user = userEvent.setup()
      const { onClose } = renderModal(makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) }))
      await user.click(screen.getByRole('button', { name: 'Fechar' }))
      expect(onClose).toHaveBeenCalled()
    })

    it('closes with Escape', async () => {
      const user = userEvent.setup()
      const { onClose } = renderModal(makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) }))
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })

    it('cancelling the confirmation runs nothing', async () => {
      const user = userEvent.setup()
      const adapter = makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) })
      renderModal(adapter)
      await user.click(await screen.findByTitle('Descartar 1 job'))
      await user.click(screen.getByTestId('alert-dialog-cancel'))
      expect(adapter.bulkOperation).not.toHaveBeenCalled()
    })

    it('opens the failed jobs list of the queue', async () => {
      const user = userEvent.setup()
      const adapter = makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) })
      renderModal(adapter)
      await user.click(screen.getByTestId('failure-groups-view-jobs'))
      await waitFor(() => expect(adapter.getJobsAll).toHaveBeenCalled())
      const params = vi.mocked(adapter.getJobsAll).mock.calls[0][0]
      expect(params.get('status')).toBe('failed')
      expect(params.get('queue')).toBe('gateway_process-data')
    })
  })

  describe('Edge Cases', () => {
    it('manualRetry=false: shows the notice and only offers discard', async () => {
      renderModal(makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue({ ...response, manualRetry: false }) }))
      expect(await screen.findByText(/reprocessa sozinho/)).toBeInTheDocument()
      expect(screen.queryByTitle(/^Reprocessar/)).not.toBeInTheDocument()
      expect(screen.getAllByTitle(/^Descartar/)).toHaveLength(2)
    })
  })
})

describe('FailureGroupsModal readOnly (PRD 068)', () => {
  it('hides retry and discard of the groups', async () => {
    readOnly.value = true
    renderModal(makeAdapter({ getFailureGroups: vi.fn().mockResolvedValue(response) }))
    expect((await screen.findAllByText(/Server has closed the connection/)).length).toBeGreaterThan(0)
    expect(screen.queryByTitle('Reprocessar 2 jobs')).not.toBeInTheDocument()
    expect(screen.queryByTitle(/Descartar/)).not.toBeInTheDocument()
  })
})
