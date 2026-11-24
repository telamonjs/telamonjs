/**
 * Row click vs content portaled out of the row.
 *
 * A row action's confirm dialog (and the "..." menu) is rendered in a Radix
 * portal, but React bubbles synthetic events through the COMPONENT tree: a
 * click inside the dialog reached the row's onClick and opened the view
 * dialog behind it. That view dialog then became the top modal layer, so the
 * confirm dialog lost pointer events and could no longer be confirmed.
 *
 * Runs every row-click surface against the REAL Radix AlertDialog, Dialog and
 * DropdownMenu, with the row click opening a real view Dialog (as ListPage does).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { useState, type ReactNode } from 'react'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { InfiniteList } from './InfiniteList'
import { DataTable } from './DataTable'
import { VirtualDataTable } from './VirtualDataTable'
import { MobileCard } from './MobileCard'
import { DataTableActions } from '../components/data/DataTableActions'
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog'
import type { DataTableActionsConfig } from '../types/actions'
import { isOwnRowClick } from './row-click'

expect.extend(axeMatchers)

vi.unmock('../ui/button')
vi.unmock('../ui/badge')
vi.unmock('../ui/card')
vi.unmock('../ui/dialog')
vi.unmock('../ui/alert-dialog')
vi.unmock('../ui/input')
vi.unmock('../ui/textarea')
vi.unmock('../ui/label')
vi.unmock('@radix-ui/react-slot')
vi.unmock('@radix-ui/react-label')

// dropdown-menu is swapped by a resolve.alias in vitest.config.ts; point the
// specifier back at the real module through an absolute path.
vi.mock('../ui/dropdown-menu', async () => {
  return await vi.importActual<typeof import('../ui/dropdown-menu')>(
    new URL('../ui/dropdown-menu.tsx', import.meta.url).pathname
  )
})

// jsdom has no layout: the virtualizer would render no rows.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 36,
        end: (i + 1) * 36,
        size: 36,
        key: i,
      })),
    getTotalSize: () => count * 36,
    measureElement: () => {},
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/items',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

interface Item {
  id: string
  name: string
}

const items: Item[] = [{ id: '1', name: 'Alpha' }]
const columns: ColumnDef<Item>[] = [{ accessorKey: 'name', header: 'Name' }]
const onAction = vi.fn()

function actionsConfig(position: 'after' | 'dropdown'): DataTableActionsConfig<Item> {
  return {
    custom: [
      {
        id: 'reject',
        label: 'Reject',
        position,
        onClick: onAction,
        confirmDialog: {
          title: 'Reject item?',
          confirmText: 'Yes, reject',
          inputs: [{ name: 'reason', label: 'Reason', type: 'textarea' }],
        },
      },
    ],
  }
}

type Surface = (props: {
  onRowClick: (row: Item) => void
  config: DataTableActionsConfig<Item>
}) => ReactNode

const surfaces: Array<[string, Surface]> = [
  [
    'InfiniteList',
    ({ onRowClick, config }) => (
      <InfiniteList
        columns={columns}
        data={items}
        total={items.length}
        isLoading={false}
        isFetchingNextPage={false}
        hasNextPage={false}
        fetchNextPage={vi.fn()}
        onRowClick={onRowClick}
        actionsConfig={config}
      />
    ),
  ],
  [
    'DataTable',
    ({ onRowClick, config }) => (
      <DataTable
        tableId='row-click-datatable'
        columns={columns}
        data={items}
        onRowClick={onRowClick}
        actionsConfig={config}
      />
    ),
  ],
  [
    'VirtualDataTable',
    ({ onRowClick, config }) => (
      <VirtualDataTable
        data={items}
        columns={[
          ...columns,
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => <DataTableActions row={row} config={config} />,
          },
        ]}
        onRowClick={onRowClick}
      />
    ),
  ],
]

/** The surface plus the view dialog its row click opens, like ListPage. */
function Harness({
  Surface,
  config,
}: {
  Surface: Surface
  config: DataTableActionsConfig<Item>
}) {
  const [viewing, setViewing] = useState<Item | null>(null)
  return (
    <>
      <Surface onRowClick={setViewing} config={config} />
      <Dialog open={viewing !== null} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Viewing {viewing?.name}</DialogTitle>
        </DialogContent>
      </Dialog>
    </>
  )
}

function renderSurface(Surface: Surface, position: 'after' | 'dropdown') {
  const user = userEvent.setup()
  const utils = render(
    <Harness Surface={Surface} config={actionsConfig(position)} />
  )
  return { ...utils, user }
}

async function openConfirm(
  user: ReturnType<typeof userEvent.setup>,
  position: 'after' | 'dropdown'
) {
  const row = within(screen.getByText('Alpha').closest('tr')!)
  if (position === 'after') {
    await user.click(row.getByRole('button', { name: /^Reject/ }))
  } else {
    await user.click(row.getByRole('button', { name: 'Mais ações' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Reject' }))
  }
  return screen.findByRole('alertdialog')
}

describe('row click and portaled content', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('Rendering', () => {
    it.each(surfaces)('%s: a click on the row itself opens the view dialog', async (_, Surface) => {
      const { user } = renderSurface(Surface, 'after')
      await user.click(screen.getByText('Alpha'))
      expect(await screen.findByRole('dialog', { name: 'Viewing Alpha' })).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    describe.each(['after', 'dropdown'] as const)('%s action', position => {
      it.each(surfaces)(
        '%s: clicking the confirm title and input does not open the view dialog, and confirming still works',
        async (_, Surface) => {
          const { user } = renderSurface(Surface, position)
          const confirm = await openConfirm(user, position)

          await user.click(within(confirm).getByRole('heading', { name: 'Reject item?' }))
          await user.click(within(confirm).getByLabelText('Reason'))
          await user.type(within(confirm).getByLabelText('Reason'), 'duplicate')

          expect(screen.queryByRole('dialog', { name: /Viewing/ })).not.toBeInTheDocument()

          await user.click(within(confirm).getByRole('button', { name: 'Yes, reject' }))
          await waitFor(() =>
            expect(onAction).toHaveBeenCalledWith(items[0], {
              inputs: { reason: 'duplicate' },
            })
          )
          expect(screen.queryByRole('dialog', { name: /Viewing/ })).not.toBeInTheDocument()
        }
      )
    })

    it('MobileCard: clicking the open actions menu does not select the card', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      render(
        <MobileCard
          data={items[0]}
          columns={columns}
          onSelect={onSelect}
          actions={[{ label: 'Edit', onClick: vi.fn() }]}
        />
      )
      await user.click(screen.getByRole('button', { name: 'Abrir ações do item' }))
      await user.click(await screen.findByRole('menu'))
      expect(onSelect).not.toHaveBeenCalled()

      await user.keyboard('{Escape}')
      await user.click(screen.getByText('Alpha'))
      expect(onSelect).toHaveBeenCalledWith(items[0])
    })
  })

  describe('Edge Cases', () => {
    function clickOn(target: Element, row: Element) {
      let result: boolean | undefined
      row.addEventListener('click', e => {
        result = isOwnRowClick({
          target: e.target,
          currentTarget: row,
        } as unknown as React.MouseEvent<Element>)
      })
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return result
    }

    it('ignores interactive elements inside the row', () => {
      const row = document.createElement('div')
      row.innerHTML =
        '<span>text</span><button><svg></svg></button><a href="#">l</a><input /><textarea></textarea><select></select>'
      const [span, button, a, input, textarea, select] = Array.from(row.children)
      expect(clickOn(span, row)).toBe(true)
      expect(clickOn(button.firstElementChild!, row)).toBe(false)
      for (const el of [a, input, textarea, select]) expect(clickOn(el, row)).toBe(false)
    })

    it('ignores targets outside the row DOM (portals)', () => {
      const row = document.createElement('div')
      const portaled = document.createElement('h2')
      expect(
        isOwnRowClick({
          target: portaled,
          currentTarget: row,
        } as unknown as React.MouseEvent<Element>)
      ).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations with the confirm dialog open over a row', async () => {
      const { user, container } = renderSurface(surfaces[0][1], 'after')
      await openConfirm(user, 'after')
      expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
    })
  })
})
