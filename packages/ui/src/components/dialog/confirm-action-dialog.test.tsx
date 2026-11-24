/**
 * ConfirmActionDialog against the REAL primitives (AlertDialog, Input,
 * Textarea, Select, Label): the open/close and focus behavior is Radix's.
 */

import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { msg } from '../../i18n/msg'
import { ConfirmActionDialog } from './confirm-action-dialog'
import type { ConfirmActionDialogProps } from './confirm-action-dialog'

expect.extend(axeMatchers)

vi.unmock('../../ui/alert-dialog')
vi.unmock('../../ui/button')
vi.unmock('../../ui/input')
vi.unmock('../../ui/textarea')
vi.unmock('../../ui/label')
vi.unmock('../../ui/select')
vi.unmock('@radix-ui/react-slot')
vi.unmock('@radix-ui/react-label')

type Props = Partial<ConfirmActionDialogProps>

function Controlled(props: Props) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <span data-testid='state'>{open ? 'open' : 'closed'}</span>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={vi.fn()}
        {...props}
      />
    </>
  )
}

function setup(props: Props = {}) {
  const user = userEvent.setup()
  const utils = render(<Controlled {...props} />)
  return { user, ...utils }
}

const deferred = () => {
  let resolve!: (v?: unknown) => void
  let reject!: (e: unknown) => void
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('ConfirmActionDialog', () => {
  describe('Rendering', () => {
    it('renders title, description and the button texts', () => {
      setup({
        title: 'Archive item?',
        description: 'It leaves the list.',
        confirmText: 'Archive',
        cancelText: 'Keep',
      })
      expect(screen.getByRole('alertdialog')).toHaveTextContent('Archive item?')
      expect(screen.getByText('It leaves the list.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument()
    })

    it('falls back to the localized title and buttons', () => {
      setup()
      expect(screen.getByRole('alertdialog')).toHaveTextContent('Confirmar ação')
      expect(screen.getByTestId('modal-confirm')).toHaveTextContent('Confirmar')
      expect(screen.getByTestId('modal-cancel')).toHaveTextContent('Cancelar')
    })

    it('renders text, textarea and select inputs with their labels', () => {
      setup({
        inputs: [
          { name: 'ticket', label: 'Ticket', type: 'text', defaultValue: 'T-1' },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'kind', label: 'Kind', type: 'select', options: ['A', 'B'] },
        ],
      })
      expect(screen.getByLabelText('Ticket')).toHaveValue('T-1')
      expect(screen.getByRole('textbox', { name: /Reason/ })).toBeRequired()
      expect(screen.getByRole('combobox', { name: 'Kind' })).toBeInTheDocument()
    })

    it('renders ReactNode title and description', () => {
      setup({
        title: (
          <span>
            Delete <strong>Alpha</strong>?
          </span>
        ),
        description: (
          <>
            From <strong>today</strong> on.
          </>
        ),
      })
      expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete Alpha?')
      expect(screen.getByText('today').tagName).toBe('STRONG')
    })

    it('resolves a msg() title and description', () => {
      setup({
        title: msg('telamonjs.common.save'),
        description: msg('telamonjs.common.cancel'),
      })
      const dialog = screen.getByRole('alertdialog')
      expect(dialog).toHaveTextContent('Salvar')
      expect(dialog).toHaveAccessibleDescription('Cancelar')
    })

    it('renders the body between the description and the buttons', () => {
      setup({
        description: 'Desc',
        body: <p data-testid='body'>Extra content</p>,
      })
      const body = screen.getByTestId('body')
      const description = screen.getByText('Desc')
      const confirm = screen.getByTestId('modal-confirm')
      expect(description.compareDocumentPosition(body)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
      expect(body.compareDocumentPosition(confirm)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    })

    it('renders a date input', () => {
      setup({
        inputs: [
          { name: 'due', label: 'Due date', type: 'date', defaultValue: '2026-01-31' },
        ],
      })
      const field = screen.getByLabelText('Due date')
      expect(field).toHaveAttribute('type', 'date')
      expect(field).toHaveValue('2026-01-31')
    })
  })

  describe('Interactions', () => {
    it('confirmDisabled disables only the confirm button', () => {
      setup({ confirmDisabled: true })
      expect(screen.getByTestId('modal-confirm')).toBeDisabled()
      expect(screen.getByTestId('modal-cancel')).toBeEnabled()
    })

    it('a date input value reaches onConfirm', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'due', label: 'Due date', type: 'date' }],
      })
      fireEvent.change(screen.getByLabelText('Due date'), {
        target: { value: '2026-03-15' },
      })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ due: '2026-03-15' })
    })

    it('controlled pending: confirming does not close, even when onConfirm resolves', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      const { user } = setup({ pending: false, onConfirm })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({})
      await waitFor(() => expect(screen.getByTestId('modal-confirm')).toBeEnabled())
      expect(screen.getByTestId('state')).toHaveTextContent('open')
    })

    it('confirms with the input values and closes when onConfirm resolves', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      const { user } = setup({
        onConfirm,
        inputs: [
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'kind', label: 'Kind', type: 'select', options: ['A', 'B'] },
        ],
      })
      await user.type(screen.getByRole('textbox', { name: /Reason/ }), 'duplicate')
      await user.click(screen.getByRole('combobox', { name: 'Kind' }))
      await user.click(await screen.findByRole('option', { name: 'B' }))
      await user.click(screen.getByTestId('modal-confirm'))

      expect(onConfirm).toHaveBeenCalledWith({ reason: 'duplicate', kind: 'B' })
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
    })

    it('cancel closes without confirming', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({ onConfirm })
      await user.click(screen.getByTestId('modal-cancel'))
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('uncontrolled: the children trigger opens it', async () => {
      const user = userEvent.setup()
      render(
        <ConfirmActionDialog title='Sure?' onConfirm={vi.fn()}>
          <button type='button'>Open</button>
        </ConfirmActionDialog>
      )
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Open' }))
      expect(await screen.findByRole('alertdialog')).toHaveTextContent('Sure?')
    })
  })

  describe('State Management', () => {
    it('controlled pending: locks both buttons, shows pendingText and blocks dismissal', async () => {
      const { user } = setup({ pending: true, confirmText: 'Send', pendingText: 'Sending...' })
      const confirm = screen.getByTestId('modal-confirm')
      expect(confirm).toBeDisabled()
      expect(confirm).toHaveAttribute('aria-busy', 'true')
      expect(confirm).toHaveTextContent('Sending...')
      expect(screen.getByTestId('modal-cancel')).toBeDisabled()
      await user.keyboard('{Escape}')
      expect(screen.getByTestId('state')).toHaveTextContent('open')
    })

    it('controlled pending: the caller closes it when its mutation settles', async () => {
      const user = userEvent.setup()
      const job = deferred()
      function Caller() {
        const [open, setOpen] = useState(true)
        const [pending, setPending] = useState(false)
        const mutate = () => {
          setPending(true)
          void job.promise.then(() => {
            setPending(false)
            setOpen(false)
          })
        }
        return (
          <>
            <span data-testid='state'>{open ? 'open' : 'closed'}</span>
            <ConfirmActionDialog
              open={open}
              onOpenChange={setOpen}
              pending={pending}
              pendingText='Sending...'
              onConfirm={mutate}
            />
          </>
        )
      }
      render(<Caller />)
      await user.click(screen.getByTestId('modal-confirm'))
      expect(screen.getByTestId('modal-confirm')).toHaveTextContent('Sending...')
      expect(screen.getByTestId('state')).toHaveTextContent('open')

      job.resolve()
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
    })

    it('pendingText also labels the built-in pending state', async () => {
      const job = deferred()
      const { user } = setup({ pendingText: 'Saving...', onConfirm: () => job.promise })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(screen.getByTestId('modal-confirm')).toHaveTextContent('Saving...')
      job.resolve()
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
    })

    it('validate blocks the confirm, shows its message and re-validates as the user types', async () => {
      const onConfirm = vi.fn()
      const validate = vi.fn((value: string) =>
        value === 'DELETE' ? undefined : 'Type DELETE to confirm'
      )
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'word', label: 'Confirmation', type: 'text', validate }],
      })
      // no message before the first confirm attempt
      expect(screen.queryByText('Type DELETE to confirm')).not.toBeInTheDocument()

      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).not.toHaveBeenCalled()
      const field = screen.getByRole('textbox', { name: 'Confirmation' })
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAccessibleDescription('Type DELETE to confirm')

      await user.type(field, 'DELETE')
      expect(field).not.toHaveAttribute('aria-invalid')
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ word: 'DELETE' })
    })

    it('validate receives every value (cross-field rules) and may return a msg()', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [
          { name: 'from', label: 'From', type: 'date', defaultValue: '2026-05-10' },
          {
            name: 'to',
            label: 'To',
            type: 'date',
            required: true,
            validate: (to, values) =>
              values.from && to < values.from ? msg('telamonjs.common.cancel') : undefined,
          },
        ],
      })
      fireEvent.change(screen.getByLabelText(/To/), { target: { value: '2026-05-01' } })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/To/)).toHaveAccessibleDescription('Cancelar')

      fireEvent.change(screen.getByLabelText(/To/), { target: { value: '2026-05-20' } })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ from: '2026-05-10', to: '2026-05-20' })
    })

    it('stays open with disabled buttons while onConfirm is pending', async () => {
      const pending = deferred()
      const { user } = setup({ onConfirm: () => pending.promise })
      await user.click(screen.getByTestId('modal-confirm'))

      expect(screen.getByTestId('modal-confirm')).toBeDisabled()
      expect(screen.getByTestId('modal-confirm')).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByTestId('modal-cancel')).toBeDisabled()
      await user.keyboard('{Escape}')
      expect(screen.getByTestId('state')).toHaveTextContent('open')

      pending.resolve()
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
    })

    it('stays open and shows the error when onConfirm rejects; retry works', async () => {
      const onConfirm = vi
        .fn()
        .mockRejectedValueOnce(new Error('Server said no'))
        .mockResolvedValueOnce(undefined)
      const { user } = setup({ onConfirm })
      await user.click(screen.getByTestId('modal-confirm'))

      expect(await screen.findByRole('alert')).toHaveTextContent('Server said no')
      expect(screen.getByTestId('state')).toHaveTextContent('open')
      expect(screen.getByTestId('modal-confirm')).toBeEnabled()

      await user.click(screen.getByTestId('modal-confirm'))
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'))
    })

    it('resolving false keeps it open without a message', async () => {
      const { user } = setup({ onConfirm: () => Promise.resolve(false) })
      await user.click(screen.getByTestId('modal-confirm'))
      await waitFor(() => expect(screen.getByTestId('modal-confirm')).toBeEnabled())
      expect(screen.getByTestId('state')).toHaveTextContent('open')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('blocks the confirm while a required input is empty (whitespace counts as empty)', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'reason', label: 'Reason', type: 'text', required: true }],
      })
      await user.type(screen.getByRole('textbox', { name: /Reason/ }), '   ')
      await user.click(screen.getByTestId('modal-confirm'))

      expect(onConfirm).not.toHaveBeenCalled()
      const field = screen.getByRole('textbox', { name: /Reason/ })
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAccessibleDescription('Campo obrigatório')

      await user.type(field, 'ok')
      expect(field).not.toHaveAttribute('aria-invalid')
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ reason: '   ok' })
    })

    it('required wins over validate on an empty field', async () => {
      const validate = vi.fn(() => 'custom')
      const { user } = setup({
        inputs: [{ name: 'r', label: 'Reason', type: 'text', required: true, validate }],
      })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(screen.getByRole('textbox', { name: /Reason/ })).toHaveAccessibleDescription(
        'Campo obrigatório'
      )
    })

    it('validate also runs on an optional empty field', async () => {
      const onConfirm = vi.fn()
      const validate = vi.fn(() => undefined)
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'note', label: 'Note', type: 'text', validate }],
      })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(validate).toHaveBeenCalledWith('', { note: '' })
      expect(onConfirm).toHaveBeenCalled()
    })

    it('controlled pending: a rejected onConfirm still shows the error and stays open', async () => {
      const { user } = setup({
        pending: false,
        onConfirm: () => Promise.reject(new Error('Server said no')),
      })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(await screen.findByRole('alert')).toHaveTextContent('Server said no')
      expect(screen.getByTestId('state')).toHaveTextContent('open')
    })

    it('a keyed React element title is rendered, not mistaken for a msg()', () => {
      setup({ title: <span key='only'>Keyed title</span> })
      expect(screen.getByRole('alertdialog')).toHaveTextContent('Keyed title')
    })

    it('a rejection without a message shows the localized fallback', async () => {
      const { user } = setup({ onConfirm: () => Promise.reject('nope') })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(await screen.findByRole('alert')).toHaveTextContent('Erro desconhecido')
    })

    it('reopening resets values and errors', async () => {
      const user = userEvent.setup()
      function Toggle() {
        const [open, setOpen] = useState(true)
        return (
          <>
            <button type='button' onClick={() => setOpen(true)}>
              Reopen
            </button>
            <ConfirmActionDialog
              open={open}
              onOpenChange={setOpen}
              onConfirm={vi.fn()}
              inputs={[{ name: 'n', label: 'Note', type: 'text', defaultValue: 'x' }]}
            />
          </>
        )
      }
      render(<Toggle />)
      await user.type(screen.getByLabelText('Note'), 'yz')
      await user.click(screen.getByTestId('modal-cancel'))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      await user.click(screen.getByRole('button', { name: 'Reopen' }))
      expect(await screen.findByLabelText('Note')).toHaveValue('x')
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations with inputs and an error shown', async () => {
      const { user, baseElement } = setup({
        title: 'Reject?',
        description: 'Tell the requester why.',
        onConfirm: () => Promise.reject(new Error('Failed')),
        inputs: [
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'kind', label: 'Kind', type: 'select', options: ['A'] },
        ],
      })
      await user.type(screen.getByRole('textbox', { name: /Reason/ }), 'x')
      await user.click(screen.getByTestId('modal-confirm'))
      await screen.findByRole('alert')
      expect(await axe(baseElement)).toHaveNoViolations()
    })

    it('has no axe violations with a body, a date input and a validate error', async () => {
      const { user, baseElement } = setup({
        title: <span>Write off invoice?</span>,
        description: 'The balance is cleared.',
        body: <p>Balance: 10.00</p>,
        pending: false,
        inputs: [
          {
            name: 'when',
            label: 'Effective date',
            type: 'date',
            validate: v => (v ? undefined : 'Pick a date'),
          },
        ],
      })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(screen.getByLabelText('Effective date')).toHaveAccessibleDescription(
        'Pick a date'
      )
      expect(await axe(baseElement)).toHaveNoViolations()
    })
  })

  describe('Field options and length/date rules', () => {
    it('minLength: the missing count shows live (muted), blocks the confirm and counts the trimmed value', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 5 }],
      })
      const field = screen.getByRole('textbox', { name: /Reason/ })
      // visible before any attempt: the user sees why before clicking
      expect(field).toHaveAccessibleDescription('Faltam 5 caracteres')
      expect(field).not.toHaveAttribute('aria-invalid')

      await user.type(field, '  abc  ')
      expect(field).toHaveAccessibleDescription('Faltam 2 caracteres')
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).not.toHaveBeenCalled()
      expect(field).toHaveAttribute('aria-invalid', 'true')

      await user.type(field, 'de')
      expect(screen.queryByText(/Falta/)).not.toBeInTheDocument()
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ reason: '  abc  de' })
    })

    it('minLength on an optional field only applies once it is filled; one character uses the singular', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'note', label: 'Note', type: 'text', minLength: 3 }],
      })
      const field = screen.getByRole('textbox', { name: 'Note' })
      expect(screen.queryByText(/Falta/)).not.toBeInTheDocument()
      await user.type(field, 'ab')
      expect(field).toHaveAccessibleDescription('Falta 1 caractere')
      await user.clear(field)
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ note: '' })
    })

    it('maxLength: the excess shows live and blocks the confirm', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'code', label: 'Code', type: 'text', maxLength: 3 }],
      })
      const field = screen.getByRole('textbox', { name: 'Code' })
      await user.type(field, 'abcde')
      expect(field).toHaveAccessibleDescription('2 caracteres a mais')
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('date min/max: set on the native input and validated as local dates', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [{ name: 'paid', label: 'Paid on', type: 'date', min: '2026-01-01', max: '2026-06-30' }],
      })
      const field = screen.getByLabelText('Paid on')
      expect(field).toHaveAttribute('min', '2026-01-01')
      expect(field).toHaveAttribute('max', '2026-06-30')

      fireEvent.change(field, { target: { value: '2026-07-01' } })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).not.toHaveBeenCalled()
      expect(field).toHaveAccessibleDescription('A data deve ser até 30/06/26')

      fireEvent.change(field, { target: { value: '2025-12-31' } })
      expect(field).toHaveAccessibleDescription('A data deve ser a partir de 01/01/26')

      fireEvent.change(field, { target: { value: '2026-03-15' } })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ paid: '2026-03-15' })
    })

    it('select options as { value, label }: the label shows, the value reaches onConfirm', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        inputs: [
          {
            name: 'kind',
            label: 'Kind',
            type: 'select',
            placeholder: 'Pick a kind',
            options: [{ value: 'P', label: 'Paid' }, 'Other'],
          },
        ],
      })
      expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveTextContent('Pick a kind')
      await user.click(screen.getByRole('combobox', { name: 'Kind' }))
      await user.click(await screen.findByRole('option', { name: 'Paid' }))
      await user.click(screen.getByTestId('modal-confirm'))
      expect(onConfirm).toHaveBeenCalledWith({ kind: 'P' })
    })

    it('passes placeholder, rows, help text, suggestions, inputMode and autoComplete to the native fields', () => {
      setup({
        inputs: [
          {
            name: 'reason',
            label: 'Reason',
            type: 'textarea',
            rows: 2,
            placeholder: 'Why?',
            description: msg('telamonjs.common.save'),
          },
          {
            name: 'method',
            label: 'Method',
            type: 'text',
            suggestions: ['PIX', 'Boleto'],
            inputMode: 'decimal',
            autoComplete: 'off',
          },
        ],
      })
      const reason = screen.getByRole('textbox', { name: 'Reason' })
      expect(reason).toHaveAttribute('rows', '2')
      expect(reason).toHaveAttribute('placeholder', 'Why?')
      expect(reason).toHaveAccessibleDescription('Salvar')

      const method = screen.getByRole('combobox', { name: 'Method' })
      expect(method).toHaveAttribute('inputmode', 'decimal')
      expect(method).toHaveAttribute('autocomplete', 'off')
      const list = document.getElementById(method.getAttribute('list') ?? '')
      expect(list?.tagName).toBe('DATALIST')
      expect([...(list?.querySelectorAll('option') ?? [])].map(o => o.value)).toEqual(['PIX', 'Boleto'])
    })

    it('disableUntilValid: confirm off while invalid; messages live, muted until the field is edited', async () => {
      const onConfirm = vi.fn()
      const { user } = setup({
        onConfirm,
        disableUntilValid: true,
        inputs: [
          {
            name: 'word',
            label: 'Type ANONYMIZE',
            type: 'text',
            required: true,
            validate: v => (v.trim().toUpperCase() === 'ANONYMIZE' ? undefined : 'Type the word exactly'),
          },
        ],
      })
      const confirm = screen.getByTestId('modal-confirm')
      const field = screen.getByRole('textbox', { name: /Type ANONYMIZE/ })
      expect(confirm).toBeDisabled()
      // the reason is visible from the start, as a hint
      expect(field).toHaveAccessibleDescription('Campo obrigatório')
      expect(screen.getByText('Campo obrigatório')).toHaveAttribute('data-state', 'hint')
      expect(field).not.toHaveAttribute('aria-invalid')

      await user.type(field, 'anon')
      expect(screen.getByText('Type the word exactly')).toHaveAttribute('data-state', 'error')
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(confirm).toBeDisabled()

      await user.type(field, 'ymize')
      expect(confirm).toBeEnabled()
      await user.click(confirm)
      expect(onConfirm).toHaveBeenCalledWith({ word: 'anonymize' })
    })

    it('has no axe violations with help text, a live count and a select with labels', async () => {
      const { user, baseElement } = setup({
        disableUntilValid: true,
        inputs: [
          { name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 5, description: 'Kept in the audit trail' },
          { name: 'kind', label: 'Kind', type: 'select', options: [{ value: 'a', label: 'Alpha' }] },
        ],
      })
      await user.type(screen.getByRole('textbox', { name: /Reason/ }), 'ab')
      expect(await axe(baseElement)).toHaveNoViolations()
    })
  })
})
