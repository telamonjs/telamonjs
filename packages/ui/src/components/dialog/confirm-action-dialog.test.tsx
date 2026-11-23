/**
 * ConfirmActionDialog against the REAL primitives (AlertDialog, Input,
 * Textarea, Select, Label): the open/close and focus behavior is Radix's.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

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
  })

  describe('Interactions', () => {
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
  })
})
