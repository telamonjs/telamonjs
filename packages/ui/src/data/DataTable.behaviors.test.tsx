import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { DataTable } from './DataTable'
import { ColumnDef } from '@tanstack/react-table'

/**
 * Characterization tests for DataTable internals.
 *
 * These tests pin CURRENT behavior of logic that lives (or lived) inside
 * DataTable.tsx and is NOT asserted by src/test/DataTable.test.tsx:
 * density CSS classes, multi-sort indicators/clear button, default
 * router navigation, pagination page-number generation, summary text,
 * filters panel column slicing, special column injection order,
 * expandable row content, column visibility popover, and server-side
 * sort payloads.
 */

// Mock Next.js hooks with an observable push spy
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

interface MockUser {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
}

const mockData: MockUser[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'active' },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    status: 'inactive',
  },
]

const mockColumns: ColumnDef<MockUser>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
]

const largeDataset: MockUser[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  status: 'active' as const,
}))

describe('DataTable characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Multi-sort indicators and clear button', () => {
    // TableHead mock drops onClick, so trigger sorting through a custom
    // header control (legit consumer pattern via column.toggleSorting).
    const sortableColumns: ColumnDef<MockUser>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            type='button'
            onClick={() => column.toggleSorting(undefined, true)}
          >
            SortName
          </button>
        ),
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <button
            type='button'
            onClick={() => column.toggleSorting(undefined, true)}
          >
            SortEmail
          </button>
        ),
      },
    ]

    it('shows numbered badges and "Limpar ordenação" with 2+ sorts, and clears them', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-multi-sort'
          data={mockData}
          columns={sortableColumns}
          enableMultiSort={true}
        />
      )

      // No clear-sort button initially
      expect(
        screen.queryByRole('button', { name: /limpar ordenação/i })
      ).not.toBeInTheDocument()

      const table = screen.getByRole('table')
      const nameSort = within(table).getByText('SortName')
      const emailSort = within(table).getByText('SortEmail')
      const nameHeader = nameSort.closest('th')!
      const emailHeader = emailSort.closest('th')!

      await user.click(nameSort)
      // Single sort: asc arrow, no numbered badge, no clear button
      expect(within(nameHeader).getByTestId('icon-arrowup')).toBeInTheDocument()
      expect(within(nameHeader).queryByText('1')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /limpar ordenação/i })
      ).not.toBeInTheDocument()

      await user.click(emailSort)
      // Stacked sort: numbered badges 1 and 2 + clear button
      expect(within(nameHeader).getByText('1')).toBeInTheDocument()
      expect(within(emailHeader).getByText('2')).toBeInTheDocument()

      const clearButton = screen.getByRole('button', {
        name: /limpar ordenação/i,
      })
      await user.click(clearButton)

      expect(
        screen.queryByRole('button', { name: /limpar ordenação/i })
      ).not.toBeInTheDocument()
      expect(within(nameHeader).queryByText('1')).not.toBeInTheDocument()
    })
  })

  describe('Default navigation (router fallbacks)', () => {
    it('navigates to `${pathname}/adicionar` when add clicked without onAdd', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-add-nav'
          data={mockData}
          columns={mockColumns}
        />
      )

      await user.click(screen.getByTestId('toolbar-add'))
      expect(pushMock).toHaveBeenCalledWith('/admin/users/adicionar')
    })

    it('navigates to `${pathname}/${id}` on row click without onRowClick', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-row-nav'
          data={mockData}
          columns={mockColumns}
        />
      )

      await user.click(screen.getByText('Jane Smith').closest('tr')!)
      expect(pushMock).toHaveBeenCalledWith('/admin/users/2')
    })

    it('rowClickNavigation={false} disables the default row navigation', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-row-nav-off'
          data={mockData}
          columns={mockColumns}
          rowClickNavigation={false}
        />
      )

      await user.click(screen.getByText('Jane Smith').closest('tr')!)
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('does not navigate on row click and hides add button when readOnly', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-readonly'
          data={mockData}
          columns={mockColumns}
          readOnly={true}
        />
      )

      expect(screen.queryByTestId('toolbar-add')).not.toBeInTheDocument()

      await user.click(screen.getByText('John Doe').closest('tr')!)
      expect(pushMock).not.toHaveBeenCalled()
    })
  })

  describe('Empty state', () => {
    it('renders "Adicionar item" button in empty state that triggers add', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()

      render(
        <DataTable
          tableId='char-empty-add'
          data={[]}
          columns={mockColumns}
          onAdd={onAdd}
        />
      )

      expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument()
      expect(
        screen.getByText('Tente ajustar os filtros ou adicione novos itens.')
      ).toBeInTheDocument()

      const addItemButton = screen.getByRole('button', {
        name: /adicionar item/i,
      })
      await user.click(addItemButton)
      expect(onAdd).toHaveBeenCalledTimes(1)
    })

    it('hides "Adicionar item" empty-state button when readOnly', () => {
      render(
        <DataTable
          tableId='char-empty-readonly'
          data={[]}
          columns={mockColumns}
          readOnly={true}
        />
      )

      expect(
        screen.queryByRole('button', { name: /adicionar item/i })
      ).not.toBeInTheDocument()
    })

    it('shows "Nenhum resultado" in pagination summary when no rows', () => {
      render(
        <DataTable
          tableId='char-empty-summary'
          data={[]}
          columns={mockColumns}
        />
      )

      expect(screen.getByText('Nenhum resultado')).toBeInTheDocument()
    })
  })

  describe('Pagination page numbers (client-side)', () => {
    it('renders 1, 2, ellipsis, 5 for 50 rows at page 1 and updates on navigation', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-page-numbers'
          data={largeDataset}
          columns={mockColumns}
        />
      )

      // Summary text
      expect(screen.getByText('1–10 de 50 resultados')).toBeInTheDocument()

      // Page numbers: [1] [2] ... [5]
      expect(screen.getByRole('button', { name: 'Page 1' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeEnabled()
      expect(
        screen.queryByRole('button', { name: 'Page 3' })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 5' })).toBeEnabled()
      expect(screen.getByText('...')).toBeInTheDocument()

      // First/Previous disabled on page 1
      expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled()
      expect(
        screen.getByRole('button', { name: 'Previous page' })
      ).toBeDisabled()

      // Navigate to page 2
      await user.click(screen.getByRole('button', { name: 'Page 2' }))

      expect(screen.getByText('User 11')).toBeInTheDocument()
      expect(screen.queryByText('User 1')).not.toBeInTheDocument()
      expect(screen.getByText('11–20 de 50 resultados')).toBeInTheDocument()

      // Range expands around current page: [1] [2] [3] ... [5]
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeDisabled()

      // Navigate to last page via "Last page"
      await user.click(screen.getByRole('button', { name: 'Last page' }))
      expect(screen.getByText('41–50 de 50 resultados')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled()
    })
  })

  describe('Pagination (server-side)', () => {
    it('calls onPaginationChange(page, storePageSize) when clicking a page number', async () => {
      const user = userEvent.setup()
      const onPaginationChange = vi.fn()

      render(
        <DataTable
          tableId='char-manual-page'
          data={largeDataset.slice(0, 10)}
          columns={mockColumns}
          manualPagination={true}
          pageCount={5}
          currentPage={1}
          totalItems={50}
          onPaginationChange={onPaginationChange}
        />
      )

      expect(screen.getByText('1–10 de 50 resultados')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Page 2' }))
      expect(onPaginationChange).toHaveBeenCalledWith(2, 10)
    })
  })

  describe('Filters panel', () => {
    it('toggles panel via Filtros button, shows Ativo badge and column filter labels', async () => {
      const user = userEvent.setup()

      const manyColumns: ColumnDef<MockUser>[] = [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'email', header: 'Email', enableColumnFilter: false },
        { accessorKey: 'status', header: 'Status' },
      ]

      render(
        <DataTable
          tableId='char-filters-panel'
          data={mockData}
          columns={manyColumns}
          enableFilters={true}
        />
      )

      const filtersButton = screen.getByTestId('toolbar-filters')
      expect(within(filtersButton).queryByText('Ativo')).not.toBeInTheDocument()

      await user.click(filtersButton)

      // Badge "Ativo" appears on the toggle button
      expect(within(filtersButton).getByText('Ativo')).toBeInTheDocument()

      // Panel renders filter labels for filterable columns only
      await waitFor(() => {
        const panel = document.querySelector('.rounded-lg.border.bg-muted\\/50')
        expect(panel).not.toBeNull()
        const labels = panel!.querySelectorAll('label')
        const labelTexts = Array.from(labels).map(l => l.textContent)
        expect(labelTexts).toContain('Name')
        expect(labelTexts).toContain('Status')
        expect(labelTexts).not.toContain('Email')
      })
    })
  })

  describe('Special columns injection', () => {
    it('injects selection checkbox as the FIRST column when enableRowSelection', () => {
      render(
        <DataTable
          tableId='char-checkbox-first'
          data={mockData}
          columns={mockColumns}
          enableRowSelection={true}
        />
      )

      const table = screen.getByRole('table')
      const headerCells = within(table).getAllByRole('columnheader')
      const firstHeaderCheckbox = within(headerCells[0]).getByRole('checkbox')
      expect(firstHeaderCheckbox).toHaveAttribute(
        'aria-label',
        'Selecionar todos'
      )

      // Each data row has a "Selecionar linha" checkbox
      const rowCheckboxes = screen.getAllByLabelText('Selecionar linha')
      expect(rowCheckboxes).toHaveLength(mockData.length)
    })

    it('injects actions column only when actionsConfig provided and enableActions', () => {
      const { unmount } = render(
        <DataTable
          tableId='char-no-actions-col'
          data={mockData}
          columns={mockColumns}
          enableActions={true}
        />
      )

      // No actionsConfig -> column count = 3
      let headerCells = within(screen.getByRole('table')).getAllByRole(
        'columnheader'
      )
      expect(headerCells).toHaveLength(3)
      unmount()

      render(
        <DataTable
          tableId='char-actions-col'
          data={mockData}
          columns={mockColumns}
          enableActions={true}
          actionsConfig={{
            standard: { view: { href: row => `/users/${row.id}` } },
          }}
        />
      )

      headerCells = within(screen.getByRole('table')).getAllByRole(
        'columnheader'
      )
      expect(headerCells).toHaveLength(4)
    })
  })

  describe('Expandable rows', () => {
    it('toggles expanded content when chevron button clicked', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-expand-content'
          data={mockData}
          columns={mockColumns}
          enableExpandableRows={true}
          expandableRowContent={row => <div>Details for {row.name}</div>}
        />
      )

      expect(screen.queryByText('Details for John Doe')).not.toBeInTheDocument()

      // Expand buttons contain the chevron-down icon
      const firstRow = screen.getByText('John Doe').closest('tr')!
      const chevron = within(firstRow).getByTestId('icon-chevrondown')
      await user.click(chevron.closest('button')!)

      expect(
        await screen.findByText('Details for John Doe')
      ).toBeInTheDocument()
      expect(
        screen.queryByText('Details for Jane Smith')
      ).not.toBeInTheDocument()
    })
  })

  describe('Column visibility popover', () => {
    it('lists hideable columns and toggles visibility', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-col-visibility'
          data={mockData}
          columns={mockColumns}
        />
      )

      expect(screen.getByText('Visibilidade das colunas')).toBeInTheDocument()

      // Uncheck "Name" column
      const popoverContent = screen.getByTestId('popover-content')
      const nameLabel = within(popoverContent).getByText('Name')
      const nameCheckbox = popoverContent.querySelector(
        'input#name'
      ) as HTMLInputElement
      expect(nameLabel).toBeInTheDocument()
      expect(nameCheckbox.checked).toBe(true)

      await user.click(nameCheckbox)

      // Column header "Name" removed from table
      const table = screen.getByRole('table')
      expect(within(table).queryByText('Name')).not.toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      expect(within(table).getByText('Email')).toBeInTheDocument()
    })
  })

  describe('Server-side sorting payload', () => {
    it('calls onSortChange with SortField[] payload after header click', async () => {
      const user = userEvent.setup()
      const onSortChange = vi.fn()

      const sortableColumns: ColumnDef<MockUser>[] = [
        {
          accessorKey: 'name',
          header: ({ column }) => (
            <button
              type='button'
              onClick={() => column.toggleSorting(undefined, true)}
            >
              SortName
            </button>
          ),
        },
        { accessorKey: 'email', header: 'Email' },
      ]

      render(
        <DataTable
          tableId='char-sort-payload'
          data={mockData}
          columns={sortableColumns}
          manualPagination={true}
          onSortChange={onSortChange}
        />
      )

      const table = screen.getByRole('table')
      const nameHeader = within(table).getByText('SortName')
      await user.click(nameHeader)

      await waitFor(() => {
        expect(onSortChange).toHaveBeenCalledWith([
          { field: 'name', order: 'asc' },
        ])
      })

      // Second click toggles to desc
      await user.click(within(table).getByText('SortName'))
      await waitFor(() => {
        expect(onSortChange).toHaveBeenCalledWith([
          { field: 'name', order: 'desc' },
        ])
      })
    })
  })

  describe('hideToolbar / hideTitleSection', () => {
    it('hides search/add/filters when hideToolbar but keeps table data', () => {
      render(
        <DataTable
          tableId='char-hide-toolbar'
          data={mockData}
          columns={mockColumns}
          title='My Table'
          hideToolbar={true}
        />
      )

      expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument()
      expect(screen.queryByTestId('toolbar-add')).not.toBeInTheDocument()
      expect(screen.queryByTestId('toolbar-filters')).not.toBeInTheDocument()
      expect(screen.getByText('My Table')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('hides title but keeps toolbar when hideTitleSection', () => {
      render(
        <DataTable
          tableId='char-hide-title'
          data={mockData}
          columns={mockColumns}
          title='My Table'
          hideTitleSection={true}
        />
      )

      expect(screen.queryByText('My Table')).not.toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
    })
  })

  describe('Search clear button', () => {
    it('shows clear button while searching and clears the global filter', async () => {
      const user = userEvent.setup()

      render(
        <DataTable
          tableId='char-search-clear'
          data={mockData}
          columns={mockColumns}
        />
      )

      const searchInput = screen.getByPlaceholderText('Buscar...')
      await user.type(searchInput, 'John')

      const clearButton = await screen.findByTestId('toolbar-search-clear')
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
      expect(
        screen.queryByTestId('toolbar-search-clear')
      ).not.toBeInTheDocument()
    })
  })

  describe('defaultDensity prop', () => {
    it('initializes store viewMode with defaultDensity on first mount', async () => {
      const { useDataTableStore } = await import('../stores/datatable-store')

      render(
        <DataTable
          tableId='char-default-density'
          columns={mockColumns}
          data={mockData}
          defaultDensity='spacious'
        />
      )

      expect(
        useDataTableStore.getState().tables['char-default-density']?.viewMode
      ).toBe('spacious')
    })

    it('falls back to store default (comfortable) when not provided', async () => {
      const { useDataTableStore } = await import('../stores/datatable-store')

      render(
        <DataTable
          tableId='char-density-fallback'
          columns={mockColumns}
          data={mockData}
        />
      )

      expect(
        useDataTableStore.getState().tables['char-density-fallback']?.viewMode
      ).toBe('comfortable')
    })

    it('does not clobber an already-initialized table (init-once semantics)', async () => {
      const { useDataTableStore } = await import('../stores/datatable-store')
      useDataTableStore
        .getState()
        .initTable('char-density-preinit', { viewMode: 'compact' })

      render(
        <DataTable
          tableId='char-density-preinit'
          columns={mockColumns}
          data={mockData}
          defaultDensity='spacious'
        />
      )

      expect(
        useDataTableStore.getState().tables['char-density-preinit']?.viewMode
      ).toBe('compact')
    })
  })
})
