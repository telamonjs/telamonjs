/**
 * Characterization tests for DataTableActions.
 *
 * These tests PIN the CURRENT behavior of the component (standard actions,
 * inline vs overflow split, enabled/visible predicates, TEST_IDS shape) so
 * that planned refactors (plan 006 fixes the overflow custom-action onClick)
 * proceed without silent regressions.
 *
 * IMPORTANT (AS-IS): the overflow ("...") DropdownMenuItem onClick currently
 * does NOT execute the action — it creates a detached <div>, looks for a
 * <button> inside it (there is none) and clicks nothing. Plan 006 will fix
 * this and update the relevant assertion. Here we only document what exists.
 *
 * Mocks: this suite relies on the GLOBAL ui-mocks (Button, AlertDialog,
 * Badge) and the aliased dropdown-menu mock. The aliased dropdown mock renders
 * its content always-visible (no open state), which lets us assert overflow
 * items without simulating a menu open. lucide-react is the global Proxy mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Row } from '@tanstack/react-table'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'

import { DataTableActions } from './DataTableActions'
import { TEST_IDS } from '../../utils/test-ids'
import type { DataTableActionsConfig } from '../../types/actions'
import { markToasted } from '../../utils/toasted-error'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// ---------------------------------------------------------------------------
// next/navigation — DataTableActions uses usePathname + useRouter
// ---------------------------------------------------------------------------
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/items',
}))

// ---------------------------------------------------------------------------
// dropdown-menu — DataTableActions imports from '../../ui/dropdown-menu',
// which is NOT covered by the vitest.config alias (that aliases '../ui/...'
// and '@/ui/...'). Without this, the REAL Radix dropdown renders and the
// overflow menu content stays portaled/closed in jsdom. Mock it with a simple
// always-visible passthrough so we can assert overflow items + their disabled
// state directly (peripheral mock; the component under test is the real one).
// ---------------------------------------------------------------------------
vi.mock('../../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid='dropdown-separator' />,
}))

// ---------------------------------------------------------------------------
// sonner — toast.success / toast.error
// ---------------------------------------------------------------------------
const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface Item extends Record<string, unknown> {
  id: number
  name: string
}

/**
 * Build a minimal @tanstack/react-table Row stub. DataTableActions only reads
 * `row.original`, so the rest can be a thin cast.
 */
function makeRow(data: Item): Row<Item> & { original: Item & { id: number } } {
  return { original: data } as unknown as Row<Item> & {
    original: Item & { id: number }
  }
}

const item: Item = { id: 1, name: 'John Doe' }

function renderActions(config: DataTableActionsConfig<Item>) {
  return render(<DataTableActions<Item> row={makeRow(item)} config={config} />)
}

beforeEach(() => {
  pushMock.mockClear()
  toastSuccess.mockClear()
  toastError.mockClear()
})

describe('DataTableActions', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('Rendering', () => {
    it('renders no action buttons when no actions are configured', () => {
      const { container } = renderActions({})
      expect(container.querySelectorAll('button')).toHaveLength(0)
    })

    it('renders the three standard actions (view/edit/delete) with TEST_IDS', () => {
      renderActions({
        standard: { view: true, edit: true, delete: true },
      })

      expect(
        screen.getByTestId(TEST_IDS.ROW_ACTION.view(1))
      ).toBeInTheDocument()
      expect(
        screen.getByTestId(TEST_IDS.ROW_ACTION.edit(1))
      ).toBeInTheDocument()
      expect(
        screen.getByTestId(TEST_IDS.ROW_ACTION.delete(1))
      ).toBeInTheDocument()
    })

    it('view/edit standard buttons carry an item-scoped aria-label including the entity label', () => {
      renderActions({ standard: { view: true, edit: true } })

      expect(
        screen.getByRole('button', { name: 'view item John Doe' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'edit item John Doe' })
      ).toBeInTheDocument()
    })

    it('renders a custom action with its label text and TEST_ID', () => {
      renderActions({
        custom: [{ id: 'archive', label: 'Arquivar', onClick: vi.fn() }],
      })

      expect(screen.getByText('Arquivar')).toBeInTheDocument()
      expect(
        screen.getByTestId(TEST_IDS.ROW_ACTION.custom('archive', 1))
      ).toBeInTheDocument()
    })

    it('renders a badge when configured (static and function)', () => {
      renderActions({
        custom: [
          { id: 'static', label: 'Static', onClick: vi.fn(), badge: 'NEW' },
          {
            id: 'dyn',
            label: 'Dyn',
            onClick: vi.fn(),
            badge: (row: Item) => `#${row.id}`,
          },
        ],
      })

      expect(screen.getByText('NEW')).toBeInTheDocument()
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // INTERACTIONS
  // =========================================================================
  describe('Interactions', () => {
    it('view standard action (no handler) navigates to {pathname}/{id} via router.push', () => {
      renderActions({ standard: { view: true } })

      fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.view(1)))

      expect(pushMock).toHaveBeenCalledWith('/admin/items/1')
    })

    it('edit standard action (no handler) navigates to {pathname}/{id}/editar', () => {
      renderActions({ standard: { edit: true } })

      fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.edit(1)))

      expect(pushMock).toHaveBeenCalledWith('/admin/items/1/editar')
    })

    it('custom action onClick is invoked with the row original on click', () => {
      const onClick = vi.fn()
      renderActions({
        custom: [{ id: 'archive', label: 'Arquivar', onClick }],
      })

      fireEvent.click(
        screen.getByTestId(TEST_IDS.ROW_ACTION.custom('archive', 1))
      )

      expect(onClick).toHaveBeenCalledWith(item)
    })

    it('href as a function navigates to the computed URL', () => {
      renderActions({
        custom: [
          {
            id: 'open',
            label: 'Abrir',
            href: (row: Item) => `/external/${row.id}`,
          },
        ],
      })

      fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.custom('open', 1)))

      expect(pushMock).toHaveBeenCalledWith('/external/1')
    })

    it('shows a success toast (string) after a successful onClick', async () => {
      const onClick = vi.fn().mockResolvedValue(undefined)
      renderActions({
        custom: [
          {
            id: 'sync',
            label: 'Sync',
            onClick,
            successMessage: 'Sincronizado!',
          },
        ],
      })

      fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.custom('sync', 1)))

      await vi.waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Sincronizado!')
      )
    })

    it('shows an error toast when onClick rejects', async () => {
      const onClick = vi.fn().mockRejectedValue(new Error('boom'))
      renderActions({
        custom: [{ id: 'fail', label: 'Fail', onClick }],
      })

      fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.custom('fail', 1)))

      await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith('boom'))
    })

    it('does not re-toast an error already toasted by useCrudMutations (lacuna 11)', async () => {
      const err = new Error('already shown')
      markToasted(err)
      const handler = vi.fn().mockRejectedValue(err)
      renderActions({ standard: { delete: { handler } } })
      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      await vi.waitFor(() => expect(handler).toHaveBeenCalled())
      await new Promise(r => setTimeout(r, 20))
      expect(toastError).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // STATE MANAGEMENT (confirm dialog flow)
  // =========================================================================
  describe('State Management', () => {
    it('delete standard action defaults to a confirm dialog wrapper (AlertDialog rendered)', () => {
      renderActions({ standard: { delete: true } })

      // Global AlertDialog mock renders its content always-visible. The mock's
      // AlertDialogAction/Cancel ignore the source's data-testid='modal-*' and
      // expose 'alert-dialog-action'/'alert-dialog-cancel' instead.
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('alert-dialog-action')).toBeInTheDocument()
      expect(screen.getByTestId('alert-dialog-cancel')).toBeInTheDocument()
    })

    it('confirming the delete dialog executes the delete handler with row.id', async () => {
      const handler = vi.fn().mockResolvedValue(undefined)
      renderActions({
        standard: { delete: { handler } },
      })

      fireEvent.click(screen.getByTestId('alert-dialog-action'))

      await vi.waitFor(() => expect(handler).toHaveBeenCalledWith(1))
    })

    it('a custom action with confirmDialog renders confirm/cancel and runs onClick only after confirm', async () => {
      const onClick = vi.fn().mockResolvedValue(undefined)
      renderActions({
        custom: [
          {
            id: 'danger',
            label: 'Danger',
            onClick,
            confirmDialog: {
              title: 'Tem certeza?',
              confirmText: 'Sim',
              cancelText: 'Não',
            },
          },
        ],
      })

      expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
      // Not run on mount.
      expect(onClick).not.toHaveBeenCalled()

      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      await vi.waitFor(() => expect(onClick).toHaveBeenCalledWith(item))
    })
  })

  // =========================================================================
  // EDGE CASES (visible / enabled predicates, overflow split, permissions)
  // =========================================================================
  describe('Edge Cases', () => {
    it('visible=false (boolean) hides the action entirely', () => {
      renderActions({
        custom: [
          { id: 'hidden', label: 'Hidden', onClick: vi.fn(), visible: false },
        ],
      })

      expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    })

    it('visible as a predicate hides the action when it returns false', () => {
      renderActions({
        custom: [
          {
            id: 'pred',
            label: 'Pred',
            onClick: vi.fn(),
            visible: (row: Item) => row.id !== 1,
          },
        ],
      })

      expect(screen.queryByText('Pred')).not.toBeInTheDocument()
    })

    it('enabled=false (boolean) disables the button but keeps it rendered', () => {
      renderActions({
        custom: [{ id: 'dis', label: 'Dis', onClick: vi.fn(), enabled: false }],
      })

      const btn = screen.getByTestId(TEST_IDS.ROW_ACTION.custom('dis', 1))
      expect(btn).toBeInTheDocument()
      expect(btn).toBeDisabled()
    })

    it('enabled as a predicate disables the button when it returns false', () => {
      renderActions({
        custom: [
          {
            id: 'predEnabled',
            label: 'PredEnabled',
            onClick: vi.fn(),
            enabled: (row: Item) => row.id === 999,
          },
        ],
      })

      expect(
        screen.getByTestId(TEST_IDS.ROW_ACTION.custom('predEnabled', 1))
      ).toBeDisabled()
    })

    it('permission filtering removes actions the user lacks permission for', () => {
      renderActions({
        userPermissions: ['items:read'],
        custom: [
          {
            id: 'priv',
            label: 'Priv',
            onClick: vi.fn(),
            permission: 'items:admin',
          },
          {
            id: 'allowed',
            label: 'Allowed',
            onClick: vi.fn(),
            permission: 'items:read',
          },
        ],
      })

      expect(screen.queryByText('Priv')).not.toBeInTheDocument()
      expect(screen.getByText('Allowed')).toBeInTheDocument()
    })

    it('`can` decides instead of the exact lookup: a bypass role with empty permissions sees the actions', () => {
      renderActions({
        userPermissions: [],
        can: perm => perm !== 'items:forbidden',
        custom: [
          { id: 'priv', label: 'Priv', onClick: vi.fn(), permission: 'items:admin' },
          { id: 'no', label: 'No', onClick: vi.fn(), permission: 'items:forbidden' },
        ],
      })

      expect(screen.getByText('Priv')).toBeInTheDocument()
      expect(screen.queryByText('No')).not.toBeInTheDocument()
    })

    it('display.mode=dropdown moves ALL inline actions into the overflow menu', () => {
      renderActions({
        standard: { view: true, edit: true },
        display: { mode: 'dropdown' },
      })

      // The overflow trigger button is rendered.
      expect(screen.getByTestId('row-action-menu')).toBeInTheDocument()
      // Overflow items use the same TEST_IDS.ROW_ACTION shape.
      expect(
        screen.getByTestId(TEST_IDS.ROW_ACTION.view(1))
      ).toBeInTheDocument()
      expect(
        screen.getByTestId(TEST_IDS.ROW_ACTION.edit(1))
      ).toBeInTheDocument()
    })

    it('inline mode with maxInline splits the overflow: extras go to the "..." menu', () => {
      renderActions({
        standard: { view: true, edit: true, delete: true },
        display: { mode: 'inline', maxInline: 1 },
      })

      // First action stays inline; overflow trigger is present for the rest.
      expect(screen.getByTestId('row-action-menu')).toBeInTheDocument()
    })

    it('display.mode=auto keeps actions inline on desktop', () => {
      renderActions({
        standard: { view: true, edit: true },
        display: { mode: 'auto' },
      })
      expect(screen.queryByTestId('row-action-menu')).not.toBeInTheDocument()
    })

    it('display.mode=auto moves every action into the menu on mobile', () => {
      const desktop = vi.mocked(window.matchMedia).getMockImplementation()
      vi.mocked(window.matchMedia).mockImplementation(
        query =>
          ({
            matches: true,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList
      )
      try {
        renderActions({
          standard: { view: true, edit: true },
          display: { mode: 'auto', maxInline: 5 },
        })
        expect(screen.getByTestId('row-action-menu')).toBeInTheDocument()
        expect(screen.getByTestId(TEST_IDS.ROW_ACTION.view(1))).toBeInTheDocument()
      } finally {
        if (desktop) vi.mocked(window.matchMedia).mockImplementation(desktop)
      }
    })

    it('position=dropdown custom actions render inside the overflow menu', () => {
      renderActions({
        custom: [
          {
            id: 'inMenu',
            label: 'InMenu',
            onClick: vi.fn(),
            position: 'dropdown',
          },
        ],
      })

      expect(screen.getByTestId('row-action-menu')).toBeInTheDocument()
      expect(screen.getByText('InMenu')).toBeInTheDocument()
    })

    it('clicking an overflow custom action invokes its handler once with row.original (plan 006)', async () => {
      const onClick = vi.fn()
      renderActions({
        custom: [
          {
            id: 'inMenu',
            label: 'InMenu',
            onClick,
            position: 'dropdown',
          },
        ],
      })

      // Clicking the overflow item now calls the action handler directly
      // (no detached-div / setTimeout workaround).
      fireEvent.click(screen.getByText('InMenu'))

      await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1))
      expect(onClick).toHaveBeenCalledWith(item)
    })

    it('an overflow action without a label is named by its function or object tooltip, not its id (#8)', () => {
      renderActions({
        custom: [
          {
            id: 'fnTip',
            tooltip: () => 'Arquivar lote',
            onClick: vi.fn(),
            position: 'dropdown',
          },
          {
            id: 'objTip',
            tooltip: { content: 'Reabrir lote' },
            onClick: vi.fn(),
            position: 'dropdown',
          },
        ],
      })

      expect(screen.getByText('Arquivar lote')).toBeInTheDocument()
      expect(screen.getByText('Reabrir lote')).toBeInTheDocument()
      expect(screen.queryByText('fnTip')).not.toBeInTheDocument()
      expect(screen.queryByText('objTip')).not.toBeInTheDocument()
    })

    it('a disabled (enabled=false) overflow custom action does NOT invoke its handler', () => {
      const onClick = vi.fn()
      renderActions({
        custom: [
          {
            id: 'inMenuDisabled',
            label: 'InMenuDisabled',
            onClick,
            position: 'dropdown',
            enabled: false,
          },
        ],
      })

      // The aliased DropdownMenuItem mock is a disabled <button>; clicking a
      // disabled button does not fire onClick.
      fireEvent.click(screen.getByText('InMenuDisabled'))

      expect(onClick).not.toHaveBeenCalled()
    })

    it('overflow item disabled state reflects enabled=false', () => {
      renderActions({
        custom: [
          {
            id: 'inMenuDisabled',
            label: 'InMenuDisabled',
            onClick: vi.fn(),
            position: 'dropdown',
            enabled: false,
          },
        ],
      })

      // The dropdown item is a <button> in the aliased mock; disabled passes through.
      const menuItem = screen.getByText('InMenuDisabled').closest('button')
      expect(menuItem).toBeDisabled()
    })
  })

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================
  describe('Accessibility', () => {
    it('the overflow trigger exposes an accessible "More actions" label', () => {
      renderActions({
        standard: { view: true },
        display: { mode: 'dropdown' },
      })

      expect(
        screen.getByRole('button', { name: 'Mais ações' })
      ).toBeInTheDocument()
    })

    it('axe smoke: standard inline actions have no violations', async () => {
      const { container } = renderActions({
        standard: { view: true, edit: true, delete: true },
      })

      expect(
        await axe(container, {
          rules: {
            'color-contrast': { enabled: false },
            region: { enabled: false },
          },
        })
      ).toHaveNoViolations()
    })
  })

  describe('Issues 7.4 (#7 #8 #9)', () => {
    it('#8 names a label-less action by its tooltip (title + aria-label), not the id', () => {
      renderActions({
        standard: { view: { tooltip: 'Ver detalhes' } },
      })
      const btn = screen.getByTestId(TEST_IDS.ROW_ACTION.view(1))
      expect(btn).toHaveAttribute('title', 'Ver detalhes')
      expect(btn).toHaveAttribute('aria-label', 'Ver detalhes')
    })

    it('leaves the hint to InstantTooltip instead of opening a Radix tooltip', () => {
      renderActions({
        custom: [
          { id: 'tip', label: 'Enviar', tooltip: 'Envia o boleto', onClick: vi.fn() },
        ],
      })
      const btn = screen.getByRole('button', { name: /Enviar/ })
      expect(btn).toHaveAttribute('data-tooltip-text', 'Envia o boleto')
      expect(btn).toHaveAttribute('title', 'Envia o boleto')
      expect(btn).not.toHaveAttribute('data-state')
    })

    it('a disabled action keeps its hint on a wrapper that takes the hover', () => {
      renderActions({
        custom: [
          {
            id: 'off',
            enabled: false,
            tooltip: { content: 'Em breve', showWhenDisabled: true },
            onClick: vi.fn(),
          },
        ],
      })
      const wrapper = screen.getByRole('button').parentElement
      expect(wrapper).toHaveAttribute('data-tooltip-text', 'Em breve')
    })

    it('the wrapper of a disabled action stays outside its confirmation trigger', () => {
      renderActions({
        custom: [
          {
            id: 'off',
            enabled: false,
            tooltip: { content: 'Em breve', showWhenDisabled: true },
            confirmDialog: { title: 'Confirmar?' },
            onClick: vi.fn(),
          },
        ],
      })
      expect(screen.getByTestId('alert-dialog').parentElement).toHaveAttribute(
        'data-tooltip-text',
        'Em breve'
      )
    })

    it('#8 dropdown item falls back to tooltip before id', () => {
      renderActions({
        custom: [
          {
            id: 'plan',
            tooltip: 'Registrar plano',
            onClick: vi.fn(),
            position: 'dropdown',
          },
        ],
      })
      expect(screen.getByText('Registrar plano')).toBeInTheDocument()
    })

    it('#7 dropdown icon wrapper forces the svg to 16px', () => {
      renderActions({
        custom: [
          {
            id: 'ic',
            label: 'WithIcon',
            icon: () => <svg data-testid='ic' />,
            onClick: vi.fn(),
            position: 'dropdown',
          },
        ],
      })
      expect(screen.getByTestId('ic').parentElement).toHaveClass(
        '[&_svg]:size-4'
      )
    })

    it('#9 choosing a dropdown item does not trigger the row click', async () => {
      const onRowClick = vi.fn()
      const onClick = vi.fn()
      render(
        <div onClick={onRowClick}>
          <DataTableActions<Item>
            row={makeRow(item)}
            config={{
              custom: [
                {
                  id: 'inMenu',
                  label: 'InMenu',
                  onClick,
                  position: 'dropdown',
                },
              ],
            }}
          />
        </div>
      )
      fireEvent.click(screen.getByText('InMenu'))
      await waitFor(() => expect(onClick).toHaveBeenCalled())
      expect(onRowClick).not.toHaveBeenCalled()
    })
  })
})
