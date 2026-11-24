import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import type { ComponentProps } from 'react'
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'
import DispatchJobModal from './DispatchJobModal'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

type Job = NonNullable<ComponentProps<typeof DispatchJobModal>['job']>

const job = (overrides: Partial<Job> = {}): Job => ({
  name: 'sync_clientes',
  displayName: 'Sync clientes',
  module: 'sync',
  description: 'Pulls customers from the ERP',
  dispatchable: true,
  ...overrides,
})

const schema = {
  sync_clientes: [
    { name: 'clienteId', type: 'string', required: true, description: 'Customer id' },
    { name: 'note', type: 'string', required: false },
  ],
  bulk_ids: [{ name: 'ids', type: 'array', required: true }],
}

function setup(
  props: Partial<ComponentProps<typeof DispatchJobModal>> = {},
  dispatchJob = vi.fn().mockResolvedValue({ jobId: 'job-42' })
) {
  const adapter = { dispatchJob } as unknown as QueueApiAdapter
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  const ui = (p: Partial<ComponentProps<typeof DispatchJobModal>>) => (
    <QueueApiProvider adapter={adapter}>
      <DispatchJobModal job={job()} onClose={onClose} onSuccess={onSuccess} {...p} />
    </QueueApiProvider>
  )
  const utils = render(ui(props))
  return {
    ...utils,
    dispatchJob,
    onClose,
    onSuccess,
    user: userEvent.setup(),
    rerenderWith: (p: Partial<ComponentProps<typeof DispatchJobModal>>) => utils.rerender(ui(p)),
  }
}

const execute = () => screen.getByTestId('dispatch-execute')
const input = (name: string) => screen.getByPlaceholderText(`${name}...`)

beforeEach(() => {
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

describe('DispatchJobModal', () => {
  describe('Rendering', () => {
    it('renders nothing without a job', () => {
      const { container } = setup({ job: null })
      expect(container).toBeEmptyDOMElement()
    })

    it('shows the job label, module, description and queue name', () => {
      setup()
      expect(screen.getByRole('heading', { name: 'Executar Job' })).toBeInTheDocument()
      expect(screen.getByText('Sync clientes')).toBeInTheDocument()
      expect(screen.getByText('SYNC')).toBeInTheDocument()
      expect(screen.getByText('Pulls customers from the ERP')).toBeInTheDocument()
      expect(screen.getByText('Queue: sync_clientes')).toBeInTheDocument()
    })

    it('tells a job without input fields needs no data', () => {
      setup({ knownSchemaFields: {} })
      expect(screen.getByText(/não requer dados de entrada/)).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('renders one input per schema field, marking the required ones', () => {
      setup({ knownSchemaFields: schema })
      expect(input('clienteId')).toBeInTheDocument()
      expect(input('note')).toBeInTheDocument()
      expect(screen.getByText('Customer id')).toBeInTheDocument()
      expect(screen.getAllByText('*')).toHaveLength(1)
    })

    it('a non-dispatchable job explains why and offers no execute button', () => {
      setup({ job: job({ dispatchable: false }), knownSchemaFields: schema })
      expect(screen.getByText(/executado automaticamente pelo sistema/)).toBeInTheDocument()
      expect(screen.queryByTestId('dispatch-execute')).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('falls back to the built-in schema when knownSchemaFields is not given', () => {
      setup({ job: job({ name: 'roteamento_processar-pontos-rota' }) })
      expect(input('rotaId')).toBeInTheDocument()
      expect(screen.getByText('ID da rota a processar')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('dispatches a job without fields, then reports success and closes', async () => {
      const { user, dispatchJob, onClose, onSuccess } = setup({ knownSchemaFields: {} })

      await user.click(execute())

      await waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(dispatchJob).toHaveBeenCalledWith({ queueName: 'sync_clientes', data: {} })
      expect(toast.success).toHaveBeenCalledWith('Job Sync clientes adicionado à fila', {
        description: 'ID: job-42',
      })
      expect(onSuccess).toHaveBeenCalled()
    })

    it('blocks the dispatch while a required field is empty', async () => {
      const { user, dispatchJob, onClose } = setup({ knownSchemaFields: schema })

      await user.type(input('note'), 'only the optional one')
      await user.click(execute())

      expect(toast.error).toHaveBeenCalledWith('Campos obrigatórios: clienteId')
      expect(dispatchJob).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('sends the form fields as the job data', async () => {
      const { user, dispatchJob } = setup({ knownSchemaFields: schema })

      await user.type(input('clienteId'), 'c-1')
      await user.click(execute())

      await waitFor(() =>
        expect(dispatchJob).toHaveBeenCalledWith({
          queueName: 'sync_clientes',
          data: { clienteId: 'c-1' },
        })
      )
    })

    // Regression: the array placeholder asks for JSON, but the raw string was
    // sent, so the job received '["a","b"]' instead of an array.
    it('parses an array field into an array', async () => {
      const { user, dispatchJob } = setup({
        job: job({ name: 'bulk_ids' }),
        knownSchemaFields: schema,
      })

      await user.click(screen.getByPlaceholderText('["id1", "id2"]'))
      await user.paste('["a", "b"]')
      await user.click(execute())

      await waitFor(() =>
        expect(dispatchJob).toHaveBeenCalledWith({
          queueName: 'bulk_ids',
          data: { ids: ['a', 'b'] },
        })
      )
    })

    it('rejects an array field that is not a JSON array', async () => {
      const { user, dispatchJob } = setup({
        job: job({ name: 'bulk_ids' }),
        knownSchemaFields: schema,
      })

      await user.type(screen.getByPlaceholderText('["id1", "id2"]'), 'a, b')
      await user.click(execute())

      expect(toast.error).toHaveBeenCalledWith('JSON inválido')
      expect(dispatchJob).not.toHaveBeenCalled()
    })

    it('JSON mode sends the parsed object and skips the form validation', async () => {
      const { user, dispatchJob } = setup({ knownSchemaFields: schema })

      await user.click(screen.getByTestId('dispatch-toggle-json-mode'))
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.click(textarea)
      await user.paste('{"clienteId": 7, "force": true}')
      await user.click(execute())

      await waitFor(() =>
        expect(dispatchJob).toHaveBeenCalledWith({
          queueName: 'sync_clientes',
          data: { clienteId: 7, force: true },
        })
      )
    })

    it('JSON mode flags invalid JSON as you type and refuses to dispatch', async () => {
      const { user, dispatchJob } = setup({ knownSchemaFields: schema })

      await user.click(screen.getByTestId('dispatch-toggle-json-mode'))
      await user.type(screen.getByRole('textbox'), '{{', { initialSelectionStart: 1 })

      expect(screen.getByText('JSON inválido')).toBeInTheDocument()
      await user.click(execute())
      expect(toast.error).toHaveBeenCalledWith('JSON inválido')
      expect(dispatchJob).not.toHaveBeenCalled()

      // Back to form mode
      await user.click(screen.getByTestId('dispatch-toggle-json-mode'))
      expect(input('clienteId')).toBeInTheDocument()
    })

    it('keeps the modal open and reports the API error', async () => {
      const { user, onClose, onSuccess } = setup(
        { knownSchemaFields: {} },
        vi.fn().mockRejectedValue(new Error('queue paused'))
      )

      await user.click(execute())

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Erro ao disparar job', {
          description: 'queue paused',
        })
      )
      expect(onClose).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
      expect(execute()).toBeEnabled()
    })

    it('reports a non-Error rejection as an unknown error', async () => {
      const { user } = setup({ knownSchemaFields: {} }, vi.fn().mockRejectedValue('boom'))

      await user.click(execute())

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Erro ao disparar job', {
          description: 'Erro desconhecido',
        })
      )
    })

    it('disables the execute button while the dispatch is in flight', async () => {
      let resolve: (v: { jobId: string }) => void = () => {}
      const { user } = setup(
        { knownSchemaFields: {} },
        vi.fn(() => new Promise<{ jobId: string }>(r => (resolve = r)))
      )

      await user.click(execute())
      expect(execute()).toBeDisabled()

      resolve({ jobId: '1' })
      await waitFor(() => expect(toast.success).toHaveBeenCalled())
    })

    it('closes from the X button, Cancel and the backdrop', async () => {
      const { user, onClose, container } = setup()

      await user.click(screen.getByRole('button', { name: 'Fechar' }))
      await user.click(screen.getByTestId('dispatch-cancel'))
      await user.click(container.querySelector('.fixed.inset-0') as HTMLElement)

      expect(onClose).toHaveBeenCalledTimes(3)
    })
  })

  describe('State Management', () => {
    it('resets the form and JSON mode when the job changes', async () => {
      const other = { other_job: [{ name: 'clienteId', type: 'string', required: true }] }
      const { user, rerenderWith } = setup({ knownSchemaFields: { ...schema, ...other } })

      await user.type(input('clienteId'), 'c-1')
      rerenderWith({ job: job({ name: 'other_job' }), knownSchemaFields: { ...schema, ...other } })
      expect(input('clienteId')).toHaveValue('')

      await user.click(screen.getByTestId('dispatch-toggle-json-mode'))
      rerenderWith({ job: job(), knownSchemaFields: { ...schema, ...other } })
      expect(input('clienteId')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations with input fields', async () => {
      const { container } = setup({ knownSchemaFields: schema })
      const results = await axe(container, {
        // jsdom has no layout/colors; region is a page-level landmark rule
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      })
      expect(results).toHaveNoViolations()
    })

    it('labels each input with its field name', () => {
      setup({ knownSchemaFields: schema })
      expect(screen.getByLabelText(/clienteId/)).toBe(input('clienteId'))
    })
  })
})
