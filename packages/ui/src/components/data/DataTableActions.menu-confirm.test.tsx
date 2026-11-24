/**
 * Overflow ("...") menu actions honour `confirmDialog`, like inline buttons.
 * Runs against the REAL Radix DropdownMenu + AlertDialog: the bug only shows
 * when the menu closes while the dialog opens.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Row } from '@tanstack/react-table'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { DataTableActions } from './DataTableActions'
import type { DataTableActionsConfig } from '../../types/actions'

expect.extend(axeMatchers)

vi.unmock('../../ui/button')
vi.unmock('../../ui/badge')
vi.unmock('../../ui/alert-dialog')
vi.unmock('@radix-ui/react-slot')
vi.unmock('../../ui/input')
vi.unmock('../../ui/textarea')
vi.unmock('../../ui/label')
vi.unmock('@radix-ui/react-label')

// dropdown-menu is swapped by a resolve.alias in vitest.config.ts; point the
// specifier back at the real module through an absolute path.
vi.mock('../../ui/dropdown-menu', async () => {
  return await vi.importActual<typeof import('../../ui/dropdown-menu')>(
    new URL('../../ui/dropdown-menu.tsx', import.meta.url).pathname
  )
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/items',
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

interface Item {
  id: string
  name: string
}

const item: Item = { id: '1', name: 'Alpha' }
const row = { original: item } as unknown as Row<Item> & {
  original: Item & { id: string }
}

function renderMenu(config: DataTableActionsConfig<Item>) {
  const user = userEvent.setup()
  const utils = render(<DataTableActions row={row} config={config} />)
  const openMenu = async () =>
    user.click(screen.getByRole('button', { name: 'Mais ações' }))
  return { ...utils, user, openMenu }
}

describe('DataTableActions overflow menu confirmation', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('Interactions', () => {
    it('opens the confirm dialog and runs only after confirming', async () => {
      const onClick = vi.fn()
      const { user, openMenu } = renderMenu({
        custom: [
          {
            id: 'archive',
            label: 'Archive',
            position: 'dropdown',
            onClick,
            confirmDialog: { title: 'Archive item?', confirmText: 'Yes' },
          },
        ],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Archive' }))

      const dialog = await screen.findByRole('alertdialog')
      expect(dialog).toHaveTextContent('Archive item?')
      expect(onClick).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Yes' }))

      await waitFor(() => expect(onClick).toHaveBeenCalledWith(item))
      await waitFor(() =>
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      )
    })

    it('does not run when the confirmation is cancelled', async () => {
      const onClick = vi.fn()
      const { user, openMenu } = renderMenu({
        custom: [
          {
            id: 'archive',
            label: 'Archive',
            position: 'dropdown',
            onClick,
            confirmDialog: true,
          },
        ],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Archive' }))
      await user.click(await screen.findByTestId('modal-cancel'))

      await waitFor(() =>
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      )
      expect(onClick).not.toHaveBeenCalled()
    })

    it('runs immediately when the action has no confirmDialog', async () => {
      const onClick = vi.fn()
      const { user, openMenu } = renderMenu({
        custom: [{ id: 'copy', label: 'Copy', position: 'dropdown', onClick }],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Copy' }))

      await waitFor(() => expect(onClick).toHaveBeenCalledWith(item))
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('confirms the standard delete when it lands in the menu', async () => {
      const handler = vi.fn()
      const { user, openMenu } = renderMenu({
        standard: { delete: { handler } },
        display: { mode: 'dropdown' },
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'delete' }))

      expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
      expect(handler).not.toHaveBeenCalled()

      await user.click(screen.getByTestId('modal-confirm'))
      await waitFor(() => expect(handler).toHaveBeenCalledWith('1'))
    })
  })

  describe('Confirm inputs', () => {
    it('renders confirmDialog.inputs and passes their values as the second argument', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true })
      const { user, openMenu } = renderMenu({
        custom: [
          {
            id: 'reject',
            label: 'Reject',
            position: 'dropdown',
            handler,
            confirmDialog: {
              title: 'Reject?',
              inputs: [
                { name: 'reason', label: 'Reason', type: 'textarea', required: true },
              ],
            },
          },
        ],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Reject' }))
      await user.click(await screen.findByTestId('modal-confirm'))
      // required and empty: nothing runs
      expect(handler).not.toHaveBeenCalled()

      await user.type(screen.getByRole('textbox', { name: /Reason/ }), 'spam')
      await user.click(screen.getByTestId('modal-confirm'))

      await waitFor(() =>
        expect(handler).toHaveBeenCalledWith(item, { inputs: { reason: 'spam' } })
      )
      await waitFor(() =>
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      )
    })

    it('confirmDialog.disableUntilValid and minLength reach the row confirmation', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true })
      const { user, openMenu } = renderMenu({
        custom: [
          {
            id: 'remove',
            label: 'Remove',
            position: 'dropdown',
            handler,
            confirmDialog: {
              disableUntilValid: true,
              inputs: [
                { name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 5 },
              ],
            },
          },
        ],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Remove' }))
      const confirm = await screen.findByTestId('modal-confirm')
      const field = screen.getByRole('textbox', { name: /Reason/ })
      expect(confirm).toBeDisabled()
      expect(field).toHaveAccessibleDescription('Faltam 5 caracteres')

      await user.type(field, 'duplicado')
      expect(confirm).toBeEnabled()
      await user.click(confirm)
      await waitFor(() =>
        expect(handler).toHaveBeenCalledWith(item, { inputs: { reason: 'duplicado' } })
      )
    })

    it('supports date inputs and per-input validate', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true })
      const { user, openMenu } = renderMenu({
        custom: [
          {
            id: 'write-off',
            label: 'Write off',
            position: 'dropdown',
            handler,
            confirmDialog: {
              inputs: [
                {
                  name: 'date',
                  label: 'Date',
                  type: 'date',
                  validate: value =>
                    value > '2026-12-31' ? 'Must be this year' : undefined,
                },
              ],
            },
          },
        ],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Write off' }))
      const field = await screen.findByLabelText('Date')
      expect(field).toHaveAttribute('type', 'date')

      fireEvent.change(field, { target: { value: '2027-01-02' } })
      await user.click(screen.getByTestId('modal-confirm'))
      expect(field).toHaveAccessibleDescription('Must be this year')
      expect(handler).not.toHaveBeenCalled()

      fireEvent.change(field, { target: { value: '2026-06-01' } })
      await user.click(screen.getByTestId('modal-confirm'))
      await waitFor(() =>
        expect(handler).toHaveBeenCalledWith(item, { inputs: { date: '2026-06-01' } })
      )
    })

    it('a failing action keeps the dialog open (inputs kept) for a retry', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('boom'))
      const { user, openMenu } = renderMenu({
        custom: [
          {
            id: 'reject',
            label: 'Reject',
            position: 'dropdown',
            handler,
            confirmDialog: {
              inputs: [{ name: 'reason', label: 'Reason', type: 'text' }],
            },
          },
        ],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Reject' }))
      await user.type(await screen.findByRole('textbox', { name: 'Reason' }), 'x')
      await user.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => expect(handler).toHaveBeenCalled())
      await waitFor(() => expect(screen.getByTestId('modal-confirm')).toBeEnabled())
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveValue('x')
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations with the confirm dialog open', async () => {
      const { user, openMenu, baseElement } = renderMenu({
        custom: [
          {
            id: 'archive',
            label: 'Archive',
            position: 'dropdown',
            onClick: vi.fn(),
            confirmDialog: { title: 'Archive item?', description: 'Sure?' },
          },
        ],
      })

      await openMenu()
      await user.click(await screen.findByRole('menuitem', { name: 'Archive' }))
      await screen.findByRole('alertdialog')

      expect(await axe(baseElement)).toHaveNoViolations()
    })
  })
})
