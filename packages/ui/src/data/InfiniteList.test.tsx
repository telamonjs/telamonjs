/**
 * Tests for InfiniteList component.
 *
 * Coverage:
 * - Rendering: rows are displayed, header columns render
 * - Interactions: onRowClick fires; button/checkbox clicks do NOT bubble to onRowClick
 * - Infinite scroll: fetchNextPage called when sentinel intersects + hasNextPage
 * - Status bar: "X de Y itens" text, "Todos os itens carregados" when done
 * - Empty state: emptyTitle / emptyDescription rendered when data=[]
 * - Loading state: SkeletonTable rendered during isLoading
 * - actionsConfig: actions column injected when provided
 *
 * Virtualizer note:
 * jsdom has no layout engine, so getBoundingClientRect() returns { height: 0 }
 * and useVirtualizer reports 0 virtual items. We mock @tanstack/react-virtual
 * to return identity-mapped virtual rows (index === DOM index), which lets
 * tests assert on real row content without fighting the DOM sizing constraint.
 */
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { InfiniteList } from './InfiniteList'
import type { BulkAction } from './BulkActionsToolbar'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// ── @tanstack/react-virtual mock ───────────────────────────────────────────
// useVirtualizer in jsdom returns no virtual items (no layout engine).
// Return synthetic virtual rows that map 1:1 to the data array length so
// row content renders in tests.
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

// ── Stores mock (useTableSorting + useDataTableActions) ────────────────────
const storeSorting = vi.hoisted(() => ({
  current: [] as { field: string; order: 'asc' | 'desc' }[],
  setSorting: vi.fn(),
}))
vi.mock('../stores/datatable-store', () => ({
  useTableSorting: () => storeSorting.current,
  useDataTableActions: () => ({
    setSorting: storeSorting.setSorting,
  }),
}))

// ── DataTableActions mock ──────────────────────────────────────────────────
vi.mock('../components/data/DataTableActions', () => ({
  DataTableActions: ({ config }: { config: unknown }) =>
    config ? <button data-testid='row-action'>action</button> : null,
}))

// ── SkeletonTable mock ─────────────────────────────────────────────────────
vi.mock('../components/skeletons/SkeletonTable', () => ({
  SkeletonTable: () => <tr data-testid='skeleton-table' />,
}))

// ── helpers ────────────────────────────────────────────────────────────────

interface Item {
  id: string
  name: string
  email?: string
}

const defaultColumns: ColumnDef<Item>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'email', header: 'Email' },
]

const defaultItems: Item[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Carol', email: 'carol@example.com' },
]

interface RenderProps {
  data?: Item[]
  total?: number
  isLoading?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  fetchNextPage?: () => void
  onRowClick?: (row: Item) => void
  actionsConfig?: unknown
  tableId?: string
  enableSelection?: boolean
  bulkActions?: BulkAction<Item>[]
  footerContent?: React.ReactNode
}

function renderInfiniteList(props: RenderProps = {}) {
  const {
    data = defaultItems,
    total = defaultItems.length,
    isLoading = false,
    isFetchingNextPage = false,
    hasNextPage = false,
    fetchNextPage = vi.fn(),
    onRowClick,
    actionsConfig,
    tableId,
    enableSelection,
    bulkActions,
    footerContent,
  } = props

  return render(
    <InfiniteList
      columns={defaultColumns}
      data={data}
      total={total}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      onRowClick={onRowClick}
      actionsConfig={actionsConfig as any}
      tableId={tableId}
      enableSelection={enableSelection}
      bulkActions={bulkActions}
      footerContent={footerContent}
    />
  )
}

// Capture the last IntersectionObserver callback so tests can trigger it
let lastObserverCallback: IntersectionObserverCallback | null = null
let lastObservedElement: Element | null = null

beforeEach(() => {
  lastObserverCallback = null
  lastObservedElement = null

  global.IntersectionObserver = class IntersectionObserver {
    callback: IntersectionObserverCallback

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
      lastObserverCallback = callback
    }
    observe(el: Element) {
      lastObservedElement = el
    }
    disconnect() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver
})

afterEach(() => {
  vi.clearAllMocks()
})

// ── tests ───────────────────────────────────────────────────────────────────

describe('InfiniteList', () => {
  describe('Rendering', () => {
    it('renders a row for each data item', () => {
      renderInfiniteList()
      // The virtualizer mock returns all rows; each row renders a <tr>
      const rows = screen.getAllByRole('row')
      // 1 header row + 3 data rows = 4 total
      expect(rows.length).toBeGreaterThanOrEqual(4)
    })

    it('renders cell content for name and email columns', () => {
      renderInfiniteList()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    it('renders column headers', () => {
      renderInfiniteList()
      expect(screen.getByText('Nome')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('renders default empty title when data is empty', () => {
      renderInfiniteList({ data: [], total: 0 })
      expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument()
    })

    it('renders custom emptyTitle and emptyDescription when data is empty', () => {
      render(
        <InfiniteList
          columns={defaultColumns}
          data={[]}
          total={0}
          isLoading={false}
          isFetchingNextPage={false}
          hasNextPage={false}
          fetchNextPage={vi.fn()}
          emptyTitle='Sem registros'
          emptyDescription='Adicione o primeiro.'
        />
      )
      expect(screen.getByText('Sem registros')).toBeInTheDocument()
      expect(screen.getByText('Adicione o primeiro.')).toBeInTheDocument()
    })

    it('does NOT render the table when data is empty', () => {
      renderInfiniteList({ data: [], total: 0 })
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('renders the skeleton table during isLoading', () => {
      renderInfiniteList({ data: [], total: 0, isLoading: true })
      expect(screen.getByTestId('skeleton-table')).toBeInTheDocument()
    })

    it('does not render empty state during isLoading', () => {
      renderInfiniteList({ data: [], total: 0, isLoading: true })
      expect(
        screen.queryByText('Nenhum item encontrado')
      ).not.toBeInTheDocument()
    })
  })

  describe('Status bar', () => {
    it('shows "X de Y itens" in the status bar', () => {
      renderInfiniteList({ data: defaultItems, total: 10 })
      expect(screen.getByText(`3 de 10 itens`)).toBeInTheDocument()
    })

    it('renders footerContent after the counter', () => {
      renderInfiniteList({
        data: defaultItems,
        total: 10,
        footerContent: <span>R$ 10,00 em aberto</span>,
      })
      expect(screen.getByText('R$ 10,00 em aberto')).toBeInTheDocument()
    })

    it('shows singular "item" when total is 1', () => {
      const oneItem = [defaultItems[0]]
      renderInfiniteList({ data: oneItem, total: 1 })
      expect(screen.getByText('1 de 1 item')).toBeInTheDocument()
    })

    it('shows "Todos os itens carregados" when all items are loaded', () => {
      renderInfiniteList({
        data: defaultItems,
        total: defaultItems.length,
        hasNextPage: false,
        isFetchingNextPage: false,
      })
      expect(screen.getByText('Todos os itens carregados')).toBeInTheDocument()
    })

    it('does not show "Todos os itens carregados" when hasNextPage is true', () => {
      renderInfiniteList({ hasNextPage: true })
      expect(
        screen.queryByText('Todos os itens carregados')
      ).not.toBeInTheDocument()
    })
  })

  describe('Interactions — onRowClick', () => {
    it('calls onRowClick with the row data when clicking a data row', () => {
      const onRowClick = vi.fn()
      renderInfiniteList({ onRowClick })

      // Click on the row cell (not a button/checkbox)
      const cell = screen.getByText('Alice').closest('td')!
      fireEvent.click(cell)

      expect(onRowClick).toHaveBeenCalledWith(defaultItems[0])
    })

    it('does not call onRowClick when clicking a button inside a row', () => {
      const onRowClick = vi.fn()

      // Render with actionsConfig to get the action button inside a row
      const actionsConfig = { standard: {} }
      renderInfiniteList({ onRowClick, actionsConfig })

      const actionBtn = screen.getAllByTestId('row-action')[0]
      fireEvent.click(actionBtn)

      expect(onRowClick).not.toHaveBeenCalled()
    })

    it('does not wire onRowClick when prop is undefined', () => {
      // Should render without errors and no cursor-pointer styles
      const { container } = renderInfiniteList({ onRowClick: undefined })
      // No onClick wired: clicking cells simply does nothing
      const cell = screen.getByText('Alice').closest('td')!
      expect(() => fireEvent.click(cell)).not.toThrow()
      // No cursor-pointer class on rows
      const trs = container.querySelectorAll('tbody tr[class]')
      trs.forEach(tr => {
        expect(tr.className).not.toContain('cursor-pointer')
      })
    })
  })

  describe('Infinite scroll — sentinel / fetchNextPage', () => {
    it('calls fetchNextPage when sentinel intersects and hasNextPage is true', () => {
      const fetchNextPage = vi.fn()
      renderInfiniteList({ hasNextPage: true, fetchNextPage })

      expect(lastObserverCallback).not.toBeNull()
      // Simulate intersection
      lastObserverCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )

      expect(fetchNextPage).toHaveBeenCalledTimes(1)
    })

    it('does NOT call fetchNextPage when hasNextPage is false', () => {
      const fetchNextPage = vi.fn()
      renderInfiniteList({ hasNextPage: false, fetchNextPage })

      lastObserverCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )

      expect(fetchNextPage).not.toHaveBeenCalled()
    })

    it('does NOT call fetchNextPage when isFetchingNextPage is true', () => {
      const fetchNextPage = vi.fn()
      renderInfiniteList({
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage,
      })

      lastObserverCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )

      expect(fetchNextPage).not.toHaveBeenCalled()
    })

    it('does NOT call fetchNextPage when sentinel is NOT intersecting', () => {
      const fetchNextPage = vi.fn()
      renderInfiniteList({ hasNextPage: true, fetchNextPage })

      lastObserverCallback!(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )

      expect(fetchNextPage).not.toHaveBeenCalled()
    })

    it('observes a sentinel element (not null)', () => {
      renderInfiniteList({ hasNextPage: true })
      expect(lastObservedElement).not.toBeNull()
    })
  })

  describe('actionsConfig', () => {
    it('renders action buttons in each row when actionsConfig is provided', () => {
      renderInfiniteList({ actionsConfig: { standard: {} } })
      const actions = screen.getAllByTestId('row-action')
      expect(actions).toHaveLength(defaultItems.length)
    })

    it('does not render action buttons when actionsConfig is undefined', () => {
      renderInfiniteList({ actionsConfig: undefined })
      expect(screen.queryByTestId('row-action')).not.toBeInTheDocument()
    })

    it('does not duplicate the actions column if already present in columns', () => {
      const columnsWithActions: ColumnDef<Item>[] = [
        ...defaultColumns,
        {
          id: 'actions',
          cell: () => <button data-testid='custom-action'>x</button>,
        },
      ]
      render(
        <InfiniteList
          columns={columnsWithActions}
          data={defaultItems}
          total={3}
          isLoading={false}
          isFetchingNextPage={false}
          hasNextPage={false}
          fetchNextPage={vi.fn()}
          actionsConfig={{ standard: {} } as any}
        />
      )
      // Only the custom-action buttons exist; no row-action from DataTableActions
      expect(screen.queryByTestId('row-action')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('custom-action')).toHaveLength(
        defaultItems.length
      )
    })
  })

  describe('Selection + bulk actions', () => {
    const deferir: BulkAction<Item> = {
      id: 'deferir',
      label: 'Deferir selecionadas',
      handler: vi.fn(async () => undefined),
    }

    it('does NOT render checkboxes when enableSelection is not set (regression)', () => {
      renderInfiniteList({ bulkActions: [deferir] })
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.queryByText(/selecionad/)).not.toBeInTheDocument()
    })

    it('renders a header checkbox and one checkbox per loaded row', () => {
      renderInfiniteList({ enableSelection: true })
      // 1 header + 3 rows
      expect(screen.getAllByRole('checkbox')).toHaveLength(
        defaultItems.length + 1
      )
    })

    it('header checkbox selects ALL loaded rows and the counter reflects it', async () => {
      const user = userEvent.setup()
      renderInfiniteList({ enableSelection: true, bulkActions: [deferir] })
      await user.click(screen.getByLabelText('Selecionar todos'))

      const rowBoxes = screen.getAllByLabelText('Selecionar linha')
      rowBoxes.forEach(box =>
        expect(box).toHaveAttribute('aria-checked', 'true')
      )
      expect(
        screen.getByText('3 selecionados de 3 carregados')
      ).toBeInTheDocument()
    })

    it('row checkbox selects only that row; toolbar appears only with selection', async () => {
      const user = userEvent.setup()
      renderInfiniteList({ enableSelection: true, bulkActions: [deferir] })
      expect(screen.queryByText('Deferir selecionadas')).not.toBeInTheDocument()

      await user.click(screen.getAllByLabelText('Selecionar linha')[1])

      expect(
        screen.getByText('1 selecionado de 3 carregados')
      ).toBeInTheDocument()
      // Custom bulk actions live in the "Mais ações em lote" dropdown
      expect(screen.getByLabelText('Mais ações em lote')).toBeInTheDocument()
      expect(screen.getByText('1 item selecionado')).toBeInTheDocument()
    })

    it('does not fire onRowClick when clicking a row checkbox', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      renderInfiniteList({ enableSelection: true, onRowClick })
      await user.click(screen.getAllByLabelText('Selecionar linha')[0])
      expect(onRowClick).not.toHaveBeenCalled()
    })

    it('bulk action receives the selected rows and selection is cleared after it', async () => {
      const user = userEvent.setup()
      const handler = vi.fn(async () => undefined)
      renderInfiniteList({
        enableSelection: true,
        bulkActions: [{ id: 'export', label: 'Exportar', handler }],
      })
      await user.click(screen.getAllByLabelText('Selecionar linha')[0])
      await user.click(screen.getAllByLabelText('Selecionar linha')[2])

      await user.click(screen.getByTestId('bulk-action-export'))

      await waitFor(() => expect(handler).toHaveBeenCalledTimes(1))
      expect(handler).toHaveBeenCalledWith([defaultItems[0], defaultItems[2]])
      await waitFor(() =>
        expect(
          screen.queryByTestId('bulk-action-export')
        ).not.toBeInTheDocument()
      )
      screen
        .getAllByLabelText('Selecionar linha')
        .forEach(box => expect(box).toHaveAttribute('aria-checked', 'false'))
    })

    it('"Limpar seleção" clears the selection', async () => {
      const user = userEvent.setup()
      renderInfiniteList({ enableSelection: true, bulkActions: [deferir] })
      await user.click(screen.getByLabelText('Selecionar todos'))
      await user.click(screen.getByTestId('bulk-actions-clear-selection'))
      expect(screen.queryByText(/selecionados de/)).not.toBeInTheDocument()
    })

    it('does not render the toolbar when enableSelection is on but bulkActions is empty', async () => {
      const user = userEvent.setup()
      renderInfiniteList({ enableSelection: true })
      await user.click(screen.getByLabelText('Selecionar todos'))
      expect(
        screen.queryByTestId('bulk-actions-clear-selection')
      ).not.toBeInTheDocument()
      expect(
        screen.getByText('3 selecionados de 3 carregados')
      ).toBeInTheDocument()
    })

    it('drops selected ids that are no longer in the loaded data (refetch)', async () => {
      const user = userEvent.setup()
      const { rerender } = renderInfiniteList({
        enableSelection: true,
        bulkActions: [deferir],
      })
      await user.click(screen.getByLabelText('Selecionar todos'))

      rerender(
        <InfiniteList
          columns={defaultColumns}
          data={[defaultItems[1]]}
          total={1}
          isLoading={false}
          isFetchingNextPage={false}
          hasNextPage={false}
          fetchNextPage={vi.fn()}
          enableSelection
          bulkActions={[deferir]}
        />
      )
      expect(
        screen.getByText('1 selecionado de 1 carregado')
      ).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders a table element (semantic structure)', () => {
      renderInfiniteList()
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('renders columnheader roles for each column', () => {
      renderInfiniteList()
      const headers = screen.getAllByRole('columnheader')
      // At least our 2 columns
      expect(headers.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('InfiniteList error state (7.3.1)', () => {
  it('shows the error with "Tentar novamente" instead of the empty state', async () => {
    const onRetry = vi.fn()
    render(
      <InfiniteList
        columns={[{ accessorKey: 'name', header: 'Name' }]}
        data={[]}
        total={0}
        isLoading={false}
        isFetchingNextPage={false}
        hasNextPage={false}
        fetchNextPage={vi.fn()}
        error='Internal Server Error'
        onRetry={onRetry}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Erro ao carregar dados'
    )
    expect(screen.getByText('Internal Server Error')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum item encontrado')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: /tentar novamente/i })
    )
    expect(onRetry).toHaveBeenCalled()
  })
})

describe('InfiniteList counterLabel + headingLevel', () => {
  const base = {
    columns: defaultColumns,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  }

  it('uses a string counterLabel in the footer', () => {
    render(
      <InfiniteList
        {...base}
        data={defaultItems}
        total={129}
        counterLabel='lotes'
      />
    )
    expect(screen.getByText('3 de 129 lotes')).toBeInTheDocument()
  })

  it('uses a function counterLabel (returns the label for the total)', () => {
    render(
      <InfiniteList
        {...base}
        data={defaultItems}
        total={1}
        counterLabel={n => (n === 1 ? 'lote' : 'lotes')}
      />
    )
    expect(screen.getByText('3 de 1 lote')).toBeInTheDocument()
  })

  it('renders the empty title as h2 by default and honours headingLevel', () => {
    const { rerender } = render(<InfiniteList {...base} data={[]} total={0} />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Nenhum item encontrado' })
    ).toBeInTheDocument()
    rerender(<InfiniteList {...base} data={[]} total={0} headingLevel={4} />)
    expect(
      screen.getByRole('heading', { level: 4, name: 'Nenhum item encontrado' })
    ).toBeInTheDocument()
  })
})

describe('InfiniteList scroll container a11y', () => {
  it('exposes the scroll container as a focusable named region', () => {
    renderInfiniteList()
    const region = screen.getByRole('region', { name: 'Lista de registros' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.className).toContain('overflow-auto')
  })
})

describe('InfiniteList sort field round-trip', () => {
  type Order = { id: string; customer: { name: string } }
  const columns: ColumnDef<Order>[] = [
    { accessorKey: 'customer.name', header: 'Cliente' },
  ]
  const data: Order[] = [{ id: '1', customer: { name: 'Ana' } }]

  afterEach(() => {
    storeSorting.current = []
    storeSorting.setSorting.mockClear()
  })

  const renderSorted = () =>
    render(
      <InfiniteList
        columns={columns}
        data={data}
        total={1}
        isLoading={false}
        isFetchingNextPage={false}
        hasNextPage={false}
        fetchNextPage={vi.fn()}
        tableId='orders'
      />
    )

  it.each(['customer.name', 'customer_name'])(
    'shows the sort arrow for a stored %s and toggles that same column',
    async field => {
      storeSorting.current = [{ field, order: 'desc' }]
      renderSorted()
      const header = screen.getByRole('columnheader', { name: 'Cliente' })
      expect(header.querySelector('[data-icon="ArrowDown"]')).not.toBeNull()

      await userEvent.click(header)

      // A header click stores the TanStack column id; ListPage maps it to the wire form
      expect(storeSorting.setSorting).toHaveBeenCalledWith([
        { field: 'customer_name', order: 'asc' },
      ])
    }
  )
})
