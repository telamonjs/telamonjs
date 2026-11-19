/**
 * Characterization tests for SubList (nested CRUD engine).
 *
 * Pins CURRENT behavior: columns derived from listFields, row rendering, empty
 * state, getFieldValue formatting (boolean -> 'Sim'/'Não', date, fallback '-'),
 * edit (loadFn) / delete (deleteFn) wiring + confirm dialog, and search
 * filtering. SubList renders BOTH a mobile and a desktop view (CSS show/hide),
 * so every value appears twice in jsdom — queries are scoped to the
 * data-view='desktop' / data-view='mobile' container to disambiguate.
 *
 * Peripheral mocks: the GLOBAL ui-mocks (Table, AlertDialog, Select, Input,
 * Button) apply; the AlertDialog mock renders its content ALWAYS-visible
 * (ignores `open`), so the confirm button is present regardless of dialog
 * state — clicking the trash button is therefore not required to reach it.
 * dropdown-menu is mocked locally (the config alias only covers '../ui/...').
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SubList, type SubListField } from './sub-list'
import { msg } from '../../i18n/msg'

// ---------------------------------------------------------------------------
// dropdown-menu — SubList imports from '../../ui/dropdown-menu' (not aliased).
// ---------------------------------------------------------------------------
vi.mock('../../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({ children, checked, onCheckedChange }: any) => (
    <label>
      <input
        type='checkbox'
        checked={checked}
        onChange={e => onCheckedChange?.(e.target.checked)}
      />
      {children}
    </label>
  ),
}))

// ---------------------------------------------------------------------------
// tooltip — keep it simple/passthrough so trigger buttons render directly.
// ---------------------------------------------------------------------------
vi.mock('../../ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}))

// ---------------------------------------------------------------------------
// sonner
// ---------------------------------------------------------------------------
const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}))

// ---------------------------------------------------------------------------
// framer-motion — passthrough to avoid animation timing in jsdom.
// ---------------------------------------------------------------------------
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
}))

interface Asset extends Record<string, unknown> {
  id: string
  plate: string
  active: boolean
  // accessorKey must contain 'date'/'Date' to trigger date formatting in the
  // cell renderer (the heuristic keys off the field name).
  createdDate: string
}

const rows: Asset[] = [
  { id: '1', plate: 'ABC1234', active: true, createdDate: '2024-01-15' },
  { id: '2', plate: 'XYZ9876', active: false, createdDate: '2024-02-20' },
]

const fields: SubListField<Asset>[] = [
  { header: 'Placa', accessorKey: 'plate' },
  // Header text 'Situação' avoids colliding with the cell text 'Ativo'/'Inativo'.
  { header: 'Situação', accessorKey: 'active' },
  { header: 'Criado em', accessorKey: 'createdDate' },
]

function desktop(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-view="desktop"]') as HTMLElement
}
function mobile(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-view="mobile"]') as HTMLElement
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
})

describe('SubList', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('Rendering', () => {
    it('renders both a mobile and a desktop view container', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      expect(desktop(container)).toBeInTheDocument()
      expect(mobile(container)).toBeInTheDocument()
    })

    it('renders the column headers from listFields (desktop)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const d = within(desktop(container))
      expect(d.getByText('Placa')).toBeInTheDocument()
      expect(d.getByText('Situação')).toBeInTheDocument()
      expect(d.getByText('Criado em')).toBeInTheDocument()
    })

    it('renders component and MessageRef headers (consumer QA 7.3.1: they rendered empty)', () => {
      const i18nFields: SubListField<Asset>[] = [
        { header: () => <span>Placa (comp)</span>, accessorKey: 'plate' },
        { header: msg('telamonjs.common.yes'), accessorKey: 'active' },
      ]
      const { container } = render(
        <SubList<Asset> data={rows} listFields={i18nFields} />
      )
      const d = within(desktop(container))
      expect(d.getByText('Placa (comp)')).toBeInTheDocument()
      expect(d.getByText('Sim')).toBeInTheDocument()
      const m = within(mobile(container))
      expect(m.getAllByText('Sim').length).toBeGreaterThan(0)
    })

    it('renders one row per data item (desktop body)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const d = within(desktop(container))
      expect(d.getByText('ABC1234')).toBeInTheDocument()
      expect(d.getByText('XYZ9876')).toBeInTheDocument()
    })

    it('destaca em negrito os números filtrado/total no rodapé de paginação (desktop)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const d = within(desktop(container))
      const strongs = d.getAllByText('2').filter(el => el.tagName === 'STRONG')
      expect(strongs.length).toBeGreaterThan(0)
    })

    it('destaca em negrito a contagem de registros no rodapé (mobile)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const m = within(mobile(container))
      expect(m.getByText('2').tagName).toBe('STRONG')
    })

    it('renders the empty state when data is empty', () => {
      const { container } = render(
        <SubList<Asset>
          data={[]}
          listFields={fields}
          emptyState={{ title: 'Sem produtos', description: 'Adicione um.' }}
        />
      )
      // Empty state appears in both views.
      expect(screen.getAllByText('Sem produtos').length).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // STATE MANAGEMENT (getFieldValue formatting via the cell renderer)
  // =========================================================================
  describe('State Management', () => {
    it('formats boolean values: true -> "Ativo", false -> "Inativo" (desktop cells)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const d = within(desktop(container))
      expect(d.getByText('Ativo', { selector: 'span' })).toBeInTheDocument()
      expect(d.getByText('Inativo')).toBeInTheDocument()
    })

    it('formats boolean values in the MOBILE card as Sim/Não (getFieldValue)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const m = within(mobile(container))
      // active:true -> 'Sim', active:false -> 'Não'
      expect(m.getByText(/Sim/)).toBeInTheDocument()
      expect(m.getByText(/Não/)).toBeInTheDocument()
    })

    it('formats date-keyed fields via toLocaleDateString pt-BR', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const d = within(desktop(container))
      // '2024-01-15' -> '15/01/2024' (UTC parse may shift a day; assert format)
      const dateCells = d.getAllByText(/\d{2}\/\d{2}\/\d{4}/)
      expect(dateCells.length).toBeGreaterThanOrEqual(2)
    })

    it('falls back to "-" when a value is null/undefined', () => {
      const sparse: Asset[] = [
        { id: '3', plate: '', active: true, createdDate: '2024-01-01' },
      ]
      const onlyMissing: SubListField<Asset>[] = [
        { header: 'Missing', accessorKey: 'doesNotExist' },
      ]
      const { container } = render(
        <SubList<Asset> data={sparse} listFields={onlyMissing} />
      )
      const d = within(desktop(container))
      expect(d.getAllByText('-').length).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // INTERACTIONS (loadFn / deleteFn / search)
  // =========================================================================
  describe('Interactions', () => {
    it('clicking a row invokes loadFn with the row id (desktop)', () => {
      const loadFn = vi.fn()
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} loadFn={loadFn} />
      )
      const d = within(desktop(container))
      fireEvent.click(d.getByText('ABC1234'))
      expect(loadFn).toHaveBeenCalledWith('1')
    })

    it('confirming the delete dialog calls deleteFn (1:N passes the row id)', async () => {
      const deleteFn = vi.fn().mockResolvedValue(undefined)
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} deleteFn={deleteFn} />
      )
      // One confirmation for the list: trash on the row, then confirm.
      const d = within(desktop(container))
      fireEvent.click(d.getByTestId('row-action-delete-1'))
      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      await vi.waitFor(() => expect(deleteFn).toHaveBeenCalledWith('1'))
    })

    it('one confirmation (not one per view) naming the row; aria-labels use the label, not the id (7.3.1)', () => {
      const { container } = render(
        <SubList<Asset>
          data={rows}
          listFields={fields}
          loadFn={vi.fn()}
          deleteFn={vi.fn()}
        />
      )
      expect(
        screen.queryByTestId('alert-dialog-content')
      ).not.toBeInTheDocument()
      const d = within(desktop(container))
      expect(d.getByTestId('row-action-delete-1')).toHaveAttribute(
        'aria-label',
        'Excluir ABC1234'
      )
      expect(d.getByTestId('row-action-edit-1')).toHaveAttribute(
        'aria-label',
        'Editar ABC1234'
      )
      expect(
        within(mobile(container)).getByRole('button', {
          name: 'Excluir ABC1234',
        })
      ).toBeInTheDocument()

      fireEvent.click(d.getByTestId('row-action-delete-1'))
      expect(screen.getAllByTestId('alert-dialog-content')).toHaveLength(1)
      expect(screen.getByText('Excluir "ABC1234"?')).toBeInTheDocument()
    })

    it('as ações da linha não dependem de hover para existir na tela', () => {
      // regression: the buttons used `opacity-0 group-hover:opacity-100`, but
      // no ancestor had the `group` class — group-hover never matched and
      // edit/delete stayed at opacity 0 permanently. Not to mention hover
      // doesn't exist on touch devices.
      const { container } = render(
        <SubList<Asset>
          data={rows}
          listFields={fields}
          loadFn={vi.fn()}
          deleteFn={vi.fn()}
        />
      )
      const d = within(desktop(container))
      for (const acao of ['edit', 'delete']) {
        const btn = d.getAllByTestId(`row-action-${acao}-1`)[0]
        expect(btn.className).not.toContain('opacity-0')
      }
    })

    it('manyToMany delete passes { parentId, id } to deleteFn', async () => {
      const deleteFn = vi.fn().mockResolvedValue(undefined)
      const { container } = render(
        <SubList<Asset>
          id='parent-9'
          manyToMany
          data={rows}
          listFields={fields}
          deleteFn={deleteFn}
        />
      )
      const d = within(desktop(container))
      fireEvent.click(d.getByTestId('row-action-delete-1'))
      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      await vi.waitFor(() =>
        expect(deleteFn).toHaveBeenCalledWith({ parentId: 'parent-9', id: '1' })
      )
    })

    it('successful void delete shows a success toast', async () => {
      const deleteFn = vi.fn().mockResolvedValue(undefined)
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} deleteFn={deleteFn} />
      )
      const d = within(desktop(container))
      fireEvent.click(d.getByTestId('row-action-delete-1'))
      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      await vi.waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Item excluído com sucesso')
      )
    })

    it('success toast waits for the delete promise to resolve', async () => {
      let resolveDelete: (v: unknown) => void = () => {}
      const deleteFn = vi.fn(() => new Promise(r => (resolveDelete = r)))
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} deleteFn={deleteFn} />
      )
      const d = within(desktop(container))
      fireEvent.click(d.getByTestId('row-action-delete-1'))
      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      await vi.waitFor(() => expect(deleteFn).toHaveBeenCalled())
      expect(toastSuccess).not.toHaveBeenCalled()
      resolveDelete(undefined)
      await vi.waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1))
    })

    it('the confirm action is disabled while the delete is in flight (no double DELETE)', async () => {
      let resolveDelete: (v: unknown) => void = () => {}
      const deleteFn = vi.fn(() => new Promise(r => (resolveDelete = r)))
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} deleteFn={deleteFn} />
      )
      fireEvent.click(
        within(desktop(container)).getByTestId('row-action-delete-1')
      )
      const confirm = screen.getByTestId('alert-dialog-action')
      fireEvent.click(confirm)
      await vi.waitFor(() => expect(confirm).toBeDisabled())
      fireEvent.click(confirm)
      expect(deleteFn).toHaveBeenCalledTimes(1)
      resolveDelete(undefined)
      await vi.waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1))
    })

    it.each([
      ['success', 0],
      ['other', 1],
    ] as const)(
      'a response with status=%s gets %i generic success toast',
      async (status, n) => {
        const deleteFn = vi.fn().mockResolvedValue({ status })
        const { container } = render(
          <SubList<Asset>
            data={rows}
            listFields={fields}
            deleteFn={deleteFn}
          />
        )
        fireEvent.click(
          within(desktop(container)).getByTestId('row-action-delete-1')
        )
        fireEvent.click(screen.getByTestId('alert-dialog-action'))
        await vi.waitFor(() => expect(deleteFn).toHaveBeenCalled())
        await vi.waitFor(() =>
          expect(screen.queryByTestId('alert-dialog-action')).toBeNull()
        )
        expect(toastSuccess).toHaveBeenCalledTimes(n)
      }
    )

    it('a thrown delete error surfaces an error toast', async () => {
      const deleteFn = vi.fn().mockRejectedValue(new Error('falhou'))
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} deleteFn={deleteFn} />
      )
      const d = within(desktop(container))
      fireEvent.click(d.getByTestId('row-action-delete-1'))
      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith('falhou'))
    })

    it('onRefresh fires when the refresh button is clicked', () => {
      const onRefresh = vi.fn()
      const { container } = render(
        <SubList<Asset>
          data={rows}
          listFields={fields}
          onRefresh={onRefresh}
        />
      )
      // Refresh icon button exists in the desktop toolbar (icon-refreshcw).
      const d = within(desktop(container))
      const refreshIcon = d.getByTestId('icon-refreshcw')
      fireEvent.click(refreshIcon.closest('button') as HTMLButtonElement)
      expect(onRefresh).toHaveBeenCalled()
    })

    it('typing in the search input filters the mobile list (globalFilter)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const m = within(mobile(container))
      const search = m.getByPlaceholderText('Buscar...')
      fireEvent.change(search, { target: { value: 'ABC' } })
      // Mobile list now only shows the matching row.
      expect(m.getByText('ABC1234')).toBeInTheDocument()
      expect(m.queryByText('XYZ9876')).not.toBeInTheDocument()
    })

    it('keeps focus on the desktop search input while typing multiple characters', async () => {
      // Regression: DesktopView used to be declared INSIDE the render body,
      // so every keystroke (globalFilter state change) created a new
      // component type and React remounted the whole subtree, stealing
      // focus from the input after each character.
      const user = userEvent.setup()
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const d = within(desktop(container))
      const search = d.getByPlaceholderText('Filtrar...')
      await user.click(search)
      await user.keyboard('a')
      expect(search).toHaveFocus()
      await user.keyboard('b')
      expect(search).toHaveFocus()
      expect(search).toHaveValue('ab')
    })
  })

  // =========================================================================
  // EDGE CASES
  // =========================================================================
  describe('Edge Cases', () => {
    it('does not render the actions column when neither loadFn nor deleteFn is set', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      const d = within(desktop(container))
      expect(d.queryByText('Ações')).not.toBeInTheDocument()
    })

    it('renders the actions column header when loadFn is provided', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} loadFn={vi.fn()} />
      )
      const d = within(desktop(container))
      expect(d.getByText('Ações')).toBeInTheDocument()
    })

    it('accessorFn takes precedence over accessorKey for the cell value', () => {
      const customFields: SubListField<Asset>[] = [
        {
          header: 'Computed',
          id: 'computed',
          accessorFn: (row: Asset) => `P-${row.plate}`,
        },
      ]
      const { container } = render(
        <SubList<Asset> data={rows} listFields={customFields} />
      )
      const d = within(desktop(container))
      expect(d.getByText('P-ABC1234')).toBeInTheDocument()
    })

    it('a custom cell renderer overrides default formatting', () => {
      const customFields: SubListField<Asset>[] = [
        {
          header: 'Custom',
          accessorKey: 'plate',
          cell: ({ row }) => <span>custom:{row.original.plate}</span>,
        },
      ]
      const { container } = render(
        <SubList<Asset> data={rows} listFields={customFields} />
      )
      const d = within(desktop(container))
      expect(d.getByText('custom:ABC1234')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================
  describe('Accessibility', () => {
    it('renders a search input the user can target (placeholder)', () => {
      const { container } = render(
        <SubList<Asset> data={rows} listFields={fields} />
      )
      expect(
        within(desktop(container)).getByPlaceholderText('Filtrar...')
      ).toBeInTheDocument()
    })

    it('exposes the empty-state action as a clickable button', () => {
      const onAction = vi.fn()
      render(
        <SubList<Asset>
          data={[]}
          listFields={fields}
          emptyState={{ title: 'Vazio', actionLabel: 'Adicionar', onAction }}
        />
      )
      const addButtons = screen.getAllByText('Adicionar')
      fireEvent.click(addButtons[0])
      expect(onAction).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // MERGED FROM crud-components.test.tsx (same SubList target, different
  // mock/query strategy — kept as a distinct suite rather than folded into
  // the sections above, since it exercises the SAME behaviors through a
  // different data shape (mockListFields/mockData) and query style
  // (getAllByRole('button').filter(...) by icon, no desktop/mobile scoping).
  // =========================================================================
  describe('Additional Coverage (mockData suite)', () => {
    const mockListFields = [
      { header: 'Nome', accessorKey: 'name' },
      { header: 'Email', accessorKey: 'email' },
      { header: 'Ativo', accessorKey: 'active' },
    ]

    const mockData = [
      { id: '1', name: 'João Silva', email: 'joao@example.com', active: true },
      {
        id: '2',
        name: 'Maria Santos',
        email: 'maria@example.com',
        active: false,
      },
    ]

    it('renders empty state when no data', () => {
      render(<SubList listFields={mockListFields} data={[]} />)

      // SubList shows the EmptyState default title in both mobile and desktop views
      expect(
        screen.getAllByText('Nenhum item encontrado').length
      ).toBeGreaterThan(0)
      expect(screen.getByText('Nome')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Ativo')).toBeInTheDocument()
    })

    it('renders data rows correctly', () => {
      render(<SubList listFields={mockListFields} data={mockData} />)

      // SubList renders both mobile and desktop views (CSS-hidden), so text appears in each
      expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0)
      expect(screen.getAllByText('joao@example.com').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0)
      expect(screen.getAllByText('maria@example.com').length).toBeGreaterThan(0)
    })

    it('renders action buttons when functions are provided', () => {
      const mockLoadFn = vi.fn()
      const mockDeleteFn = vi.fn()

      render(
        <SubList
          listFields={mockListFields}
          data={mockData}
          loadFn={mockLoadFn}
          deleteFn={mockDeleteFn}
        />
      )

      // "Ações" header exists
      expect(screen.getByText('Ações')).toBeInTheDocument()
      // With actions column: multiple buttons exist (edit + delete per row, plus toolbar buttons)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('calls loadFn when edit button is clicked', async () => {
      const mockLoadFn = vi.fn()
      const user = userEvent.setup()

      render(
        <SubList
          listFields={mockListFields}
          data={mockData}
          loadFn={mockLoadFn}
        />
      )

      // Find the Edit button (it has an Edit icon)
      const editButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg[data-icon="Edit"]')
        return svg !== null
      })

      expect(editButtons.length).toBeGreaterThan(0)
      await user.click(editButtons[0])

      expect(mockLoadFn).toHaveBeenCalledWith('1')
    })

    it('calls loadFn when row is clicked', async () => {
      const mockLoadFn = vi.fn()
      const user = userEvent.setup()

      render(
        <SubList
          listFields={mockListFields}
          data={mockData}
          loadFn={mockLoadFn}
        />
      )

      // Text appears in both mobile and desktop views; only the desktop view has table rows
      const firstRow = screen
        .getAllByText('João Silva')
        .map(el => el.closest('tr'))
        .find(tr => tr !== null)
      await user.click(firstRow!)

      expect(mockLoadFn).toHaveBeenCalledWith('1')
    })

    it('opens delete dialog when delete button is clicked', async () => {
      const mockDeleteFn = vi.fn()
      const user = userEvent.setup()

      render(
        <SubList
          listFields={mockListFields}
          data={mockData}
          deleteFn={mockDeleteFn}
        />
      )

      // Find delete button (has Trash2 icon)
      const deleteButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg[data-icon="Trash2"]')
        return svg !== null
      })

      expect(deleteButtons.length).toBeGreaterThan(0)
      await user.click(deleteButtons[0])

      // A single confirmation naming the record (was generic and duplicated per view)
      expect(screen.getAllByText(/^Excluir ".*"\?$/)).toHaveLength(1)
      expect(
        screen.getByText('Esta ação não pode ser desfeita.')
      ).toBeInTheDocument()
    })

    it('calls deleteFn when delete is confirmed', async () => {
      const mockDeleteFn = vi.fn()
      const user = userEvent.setup()

      render(
        <SubList
          listFields={mockListFields}
          data={mockData}
          deleteFn={mockDeleteFn}
        />
      )

      // Find delete button by icon
      const deleteButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg[data-icon="Trash2"]')
        return svg !== null
      })
      await user.click(deleteButtons[0])

      // Find the confirm button by looking for button that triggers delete
      // It's the AlertDialogAction button with "Excluir" text and Trash2 icon
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const confirmButton = buttons.find(btn => {
          const hasExcluirText = btn.textContent?.includes('Excluir')
          const hasTrashIcon = btn.querySelector('svg[data-icon="Trash2"]')
          return hasExcluirText && hasTrashIcon
        })
        expect(confirmButton).toBeDefined()
      })

      const buttons = screen.getAllByRole('button')
      const confirmButton = buttons.find(btn => {
        const hasExcluirText = btn.textContent?.includes('Excluir')
        const hasTrashIcon = btn.querySelector('svg[data-icon="Trash2"]')
        return hasExcluirText && hasTrashIcon
      })

      await user.click(confirmButton!)

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith('1')
      })
    })

    it('renders boolean values with Ativo/Inativo text', () => {
      render(<SubList listFields={mockListFields} data={mockData} />)

      // SubList renders booleans as colored dots with "Ativo"/"Inativo" text, not switches
      // Multiple instances exist (one per row)
      const ativoElements = screen.getAllByText('Ativo')
      expect(ativoElements.length).toBeGreaterThan(0)
      const inativoElements = screen.getAllByText('Inativo')
      expect(inativoElements.length).toBeGreaterThan(0)
    })

    it('formats date fields correctly', () => {
      const dataWithDate = [
        { id: '1', name: 'Test', createdDate: '2023-12-25T10:30:00.000Z' },
      ]
      const fieldsWithDate = [
        { header: 'Nome', accessorKey: 'name' },
        { header: 'Criado', accessorKey: 'createdDate' },
      ]

      render(<SubList listFields={fieldsWithDate} data={dataWithDate} />)

      // Rendered in both mobile and desktop views
      expect(screen.getAllByText('25/12/2023').length).toBeGreaterThan(0)
    })

    it('handles custom cell renderers', () => {
      const fieldsWithCustomCell = [
        {
          header: 'Nome',
          accessorKey: 'name',
          cell: ({ row }: any) => (
            <span data-testid='custom-cell'>
              {row.original.name.toUpperCase()}
            </span>
          ),
        },
      ]

      render(<SubList listFields={fieldsWithCustomCell} data={mockData} />)

      // Custom cell renderer is used (multiple instances for multiple rows)
      const customCells = screen.getAllByTestId('custom-cell')
      expect(customCells.length).toBeGreaterThan(0)
      expect(customCells[0]).toHaveTextContent('JOÃO SILVA')
    })

    it('handles accessorFn correctly', () => {
      const fieldsWithAccessorFn = [
        {
          header: 'Nome Completo',
          accessorFn: (row: any) => `${row.name} (${row.email})`,
        },
      ]

      render(<SubList listFields={fieldsWithAccessorFn} data={mockData} />)

      // Rendered in both mobile and desktop views
      expect(
        screen.getAllByText('João Silva (joao@example.com)').length
      ).toBeGreaterThan(0)
    })

    it('handles undefined/null data gracefully', () => {
      render(<SubList listFields={mockListFields} data={undefined} />)

      // Empty state message (rendered in both mobile and desktop views)
      expect(
        screen.getAllByText('Nenhum item encontrado').length
      ).toBeGreaterThan(0)
    })
  })
})

describe('SubList re-render stability', () => {
  it('keeps the action cells mounted when the parent passes a new inline loadFn', () => {
    const calls: string[] = []
    const { container, rerender } = render(
      <SubList<Asset>
        data={rows}
        listFields={fields}
        loadFn={id => calls.push(`a:${id}`)}
      />
    )
    const before = within(desktop(container)).getByTestId('row-action-edit-1')
    rerender(
      <SubList<Asset>
        data={rows}
        listFields={fields}
        loadFn={id => calls.push(`b:${id}`)}
      />
    )
    const after = within(desktop(container)).getByTestId('row-action-edit-1')
    expect(after).toBe(before)
    // and the latest handler is the one that runs
    fireEvent.click(after)
    return waitFor(() => expect(calls).toEqual(['b:1']))
  })
})
