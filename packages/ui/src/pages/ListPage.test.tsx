import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { z } from 'zod'
import { ListPage } from './ListPage'
import { useDataTableStore } from '../stores/datatable-store'
import type { CrudConfig } from '../types/crud'
import type { ColumnDef } from '@tanstack/react-table'
import type { ColumnFilterConfig } from '../types/filters'
import {
  createPaginatedResponse,
  type PaginatedResponse,
} from '../types/pagination'

// Avoid loading @telamonjs/logger (published dist breaks Node ESM resolution)
vi.mock('../utils/logger', () => {
  const noop = () => undefined
  const mockLogger: Record<string, unknown> = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
  }
  mockLogger.child = () => mockLogger
  mockLogger.withUser = () => mockLogger
  return {
    logger: mockLogger,
    withComponent: () => mockLogger,
    withUser: () => mockLogger,
    withRoute: () => mockLogger,
    log: mockLogger,
  }
})

// Mock Next.js hooks (ListPage uses useRouter/usePathname)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

// Rich DataTable mock: renders the props ListPage actually forwards so tests
// can assert on title/description, rows, loading, error, empty state, add
// button, header actions and pagination wiring (manualPagination, pageCount,
// currentPage, totalItems).
vi.mock('../data/DataTable', () => ({
  DataTable: ({
    data = [],
    columns = [],
    loading,
    error,
    title,
    description,
    searchPlaceholder = 'Buscar...',
    headerActions = [],
    onAdd,
    enableAdd,
    emptyTitle = 'Nenhum item encontrado',
    emptyDescription = '',
    filterOptions,
    manualPagination,
    pageCount,
    currentPage,
    totalItems,
    pageSize,
  }: Record<string, any>) => {
    const safeData: any[] = Array.isArray(data) ? data : []
    const safeColumns: any[] = Array.isArray(columns) ? columns : []

    return (
      <div
        data-testid='datatable-mock'
        data-row-count={safeData.length}
        data-loading={loading ? 'true' : 'false'}
        data-manual-pagination={manualPagination ? 'true' : 'false'}
        data-page-count={pageCount ?? ''}
        data-current-page={currentPage ?? ''}
        data-total-items={totalItems ?? ''}
        data-page-size={pageSize ?? ''}
        data-filter-options={JSON.stringify(filterOptions ?? {})}
      >
        {/* Header with title and description */}
        {(title || description) && (
          <div className='header'>
            {title && <h1>{title}</h1>}
            {description && <p>{description}</p>}
          </div>
        )}

        {/* Search input (search state itself lives in the Zustand store) */}
        <input
          type='text'
          placeholder={searchPlaceholder}
          data-testid='search-input'
          readOnly
        />

        {/* Header actions */}
        {headerActions.length > 0 && (
          <div className='header-actions'>
            {headerActions.map((action: any, idx: number) => (
              <button
                key={idx}
                onClick={action.onClick}
                data-testid={`header-action-${idx}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Add button (ListPage enables it only when dialogs.create exists) */}
        {enableAdd && (
          <button onClick={onAdd} data-testid='add-button'>
            Adicionar
          </button>
        )}

        {/* Error state */}
        {error && <div data-testid='error-message'>{error}</div>}

        {/* Table content */}
        {loading ? (
          <div data-testid='loading-indicator'>Loading...</div>
        ) : safeData.length === 0 ? (
          <div>
            <div>{emptyTitle}</div>
            {emptyDescription && <div>{emptyDescription}</div>}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {safeColumns.map((col: any, idx: number) => (
                  <th key={col.accessorKey || col.id || `col-${idx}`}>
                    {typeof col.header === 'string' ? col.header : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeData.map((row: any, rowIdx: number) => (
                <tr key={row.id || `row-${rowIdx}`}>
                  {safeColumns.map((col: any, colIdx: number) => (
                    <td key={col.accessorKey || col.id || `col-${colIdx}`}>
                      {row[col.accessorKey] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  },
}))

// Dialog spies: record exactly what ListPage forwards to each dialog
const createDialogSpy = vi.fn()
const editDialogSpy = vi.fn()

vi.mock('../components/dialog/create-dialog', () => ({
  CreateDialog: (props: Record<string, unknown>) => {
    createDialogSpy(props)
    return null
  },
}))

vi.mock('../components/dialog/edit-dialog', () => ({
  EditDialog: (props: Record<string, unknown>) => {
    editDialogSpy(props)
    return null
  },
}))

vi.mock('../components/dialog/view-dialog', () => ({
  ViewDialog: () => null,
}))

interface MockUser {
  id: string
  name: string
  email: string
}

const mockColumns: ColumnDef<MockUser>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
]

const mockData: MockUser[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
]

// Unique route (= tableId) per test: the Zustand datatable-store persists
// across tests within the same file, so each test gets an isolated table.
let routeCounter = 0

interface MakeConfigOptions {
  queryFn?: ReturnType<typeof vi.fn>
  list?: Partial<CrudConfig<MockUser, Partial<MockUser>>['list']>
  dialogs?: CrudConfig<MockUser, Partial<MockUser>>['dialogs']
}

function makeConfig(options: MakeConfigOptions = {}) {
  routeCounter += 1
  const route = `/admin/users-${routeCounter}`
  const queryFn =
    options.queryFn ??
    vi
      .fn()
      .mockResolvedValue(
        createPaginatedResponse(mockData, mockData.length, 1, 10)
      )

  const config: CrudConfig<MockUser, Partial<MockUser>> = {
    module: {
      name: 'users',
      title: 'Users',
      description: 'Users module',
      route,
    },
    list: {
      title: 'Users',
      description: 'Manage users',
      columns: mockColumns,
      // Default to paginated DataTable so behavior tests keep asserting on
      // datatable-mock. Individual tests can override with infiniteScroll:true.
      infiniteScroll: false,
      ...options.list,
    },
    form: {
      sections: [
        {
          title: 'Dados',
          fields: [{ name: 'name', label: 'Nome', type: 'text' }],
        },
      ],
      validation: z.object({}),
    },
    query: {
      queryKey: ['users', route],
      queryFn,
    },
    mutations: {
      create: { mutationFn: vi.fn(), invalidates: [['users']] },
      update: { mutationFn: vi.fn(), invalidates: [['users']] },
      delete: { mutationFn: vi.fn(), invalidates: [['users']] },
    },
    dialogs: options.dialogs,
  }

  return { config, queryFn, route }
}

interface ListPageExtraProps {
  filterOptions?: ColumnFilterConfig
  loadFilterOptions?: () => Promise<ColumnFilterConfig>
  headerActions?: Array<{ label: string; onClick: () => void }>
  embedded?: boolean
  errorBoundary?: boolean
}

function renderListPage(
  config: CrudConfig<MockUser, Partial<MockUser>>,
  extraProps: ListPageExtraProps = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ListPage<MockUser> config={config} {...extraProps} />
    </QueryClientProvider>
  )
}

describe('ListPage', () => {
  describe('Server-side Pagination', () => {
    it('calls queryFn with PaginationParams and wires manual pagination to DataTable', async () => {
      const { config, queryFn } = makeConfig({
        queryFn: vi
          .fn()
          .mockResolvedValue(createPaginatedResponse(mockData, 50, 1, 10)),
        list: { serverSidePagination: true },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1, pageSize: 10 })
        )
      })

      const table = screen.getByTestId('datatable-mock')
      await waitFor(() => {
        expect(table).toHaveAttribute('data-manual-pagination', 'true')
        expect(table).toHaveAttribute('data-page-count', '5') // 50 / 10
        expect(table).toHaveAttribute('data-current-page', '1')
        expect(table).toHaveAttribute('data-total-items', '50')
      })
    })

    it('includes defaultSortBy/defaultSortOrder in the query params', async () => {
      const { config, queryFn } = makeConfig({
        list: {
          serverSidePagination: true,
          defaultSortBy: 'name',
          defaultSortOrder: 'asc',
        },
      })

      renderListPage(config)

      await waitFor(() => {
        // useCrudQuery serializes SortField[] into sortBy + sortOrder strings
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' })
        )
      })
    })

    it('respects defaultPageSize from config', async () => {
      const { config, queryFn } = makeConfig({
        list: { serverSidePagination: true, defaultPageSize: 25 },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ pageSize: 25 })
        )
      })
    })

    it('refetches with new page when pagination changes in the store', async () => {
      const { config, queryFn, route } = makeConfig({
        queryFn: vi
          .fn()
          .mockResolvedValue(createPaginatedResponse(mockData, 50, 1, 10)),
        list: { serverSidePagination: true },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        )
      })

      act(() => {
        useDataTableStore.getState().setPage(route, 2)
      })

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        )
      })
    })
  })

  describe('Client-side Pagination', () => {
    it('renders data without manual pagination when serverSidePagination is not set', async () => {
      const { config, queryFn } = makeConfig()

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      const table = screen.getByTestId('datatable-mock')
      expect(table).toHaveAttribute('data-manual-pagination', 'false')
      expect(table).toHaveAttribute('data-page-count', '')
      expect(table).toHaveAttribute('data-current-page', '')
    })
  })

  describe('Search Integration', () => {
    it('forwards searchPlaceholder from config to DataTable', async () => {
      const { config } = makeConfig({
        list: { searchPlaceholder: 'Search users...' },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search users...')
        ).toBeInTheDocument()
      })
    })

    it('refetches with search param when global filter changes in the store', async () => {
      const { config, queryFn, route } = makeConfig({
        list: { serverSidePagination: true },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalled()
      })

      act(() => {
        useDataTableStore.getState().setGlobalFilter(route, 'John')
      })

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'John' })
        )
      })
    })

    it('debounces toolbar search in embedded mode (300ms)', async () => {
      const { config, queryFn } = makeConfig({
        list: { serverSidePagination: true },
      })

      renderListPage(config, { embedded: true })

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalled()
      })

      // Two inputs share the 'Buscar...' placeholder in embedded mode (the
      // TabToolbar search and the DataTable mock's display-only input). The
      // toolbar one is the globally-mocked Input (data-testid 'input').
      const input = screen.getByTestId('input')

      // Rapid typing: intermediate values must be swallowed by the debounce
      fireEvent.change(input, { target: { value: 'J' } })
      fireEvent.change(input, { target: { value: 'Jo' } })
      fireEvent.change(input, { target: { value: 'John' } })

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'John' })
        )
      })

      // Debounce: 'J' and 'Jo' never reached the query
      expect(queryFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ search: 'J' })
      )
      expect(queryFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Jo' })
      )
    })
  })

  describe('Filters Integration', () => {
    it('forwards static filterOptions to DataTable', async () => {
      const { config } = makeConfig()
      const filterOptions: ColumnFilterConfig = {
        status: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      }

      renderListPage(config, { filterOptions })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const table = screen.getByTestId('datatable-mock')
      expect(table.getAttribute('data-filter-options')).toContain('active')
    })

    it('loads dynamic filter options via loadFilterOptions', async () => {
      const { config } = makeConfig()
      const loadFilterOptions = vi.fn().mockResolvedValue({
        department: [
          { value: 'eng', label: 'Engineering' },
          { value: 'sales', label: 'Sales' },
        ],
      } satisfies ColumnFilterConfig)

      renderListPage(config, { loadFilterOptions })

      await waitFor(() => {
        expect(loadFilterOptions).toHaveBeenCalled()
      })

      await waitFor(() => {
        const table = screen.getByTestId('datatable-mock')
        expect(table.getAttribute('data-filter-options')).toContain(
          'department'
        )
      })
    })

    it('refetches with filters when a column filter changes in the store', async () => {
      const { config, queryFn, route } = makeConfig({
        list: { serverSidePagination: true },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalled()
      })

      act(() => {
        useDataTableStore.getState().setColumnFilter(route, 'status', 'active')
      })

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({ status: 'active' }),
          })
        )
      })
    })
  })

  describe('Actions Integration', () => {
    it('renders header actions through DataTable', async () => {
      const { config } = makeConfig()
      const headerActions = [{ label: 'Add User', onClick: vi.fn() }]

      renderListPage(config, { headerActions })

      await waitFor(() => {
        expect(screen.getByText('Add User')).toBeInTheDocument()
      })
    })

    it('executes header action on button click', async () => {
      const user = userEvent.setup()
      const { config } = makeConfig()
      const onClick = vi.fn()

      renderListPage(config, { headerActions: [{ label: 'Export', onClick }] })

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Export'))
      expect(onClick).toHaveBeenCalled()
    })

    it('shows add button when dialogs.create is configured and opens CreateDialog', async () => {
      const user = userEvent.setup()
      const { config } = makeConfig({
        dialogs: { create: { title: 'Novo usuário' } },
      })

      renderListPage(config)

      const addButton = await screen.findByTestId('add-button')

      // CreateDialog is lazy: not even mounted until first opened
      expect(createDialogSpy).not.toHaveBeenCalled()

      await user.click(addButton)

      await waitFor(() => {
        expect(createDialogSpy.mock.calls.at(-1)?.[0]?.open).toBe(true)
      })
    })

    it('does not show add button when dialogs.create is not configured', async () => {
      const { config } = makeConfig()

      renderListPage(config)

      await waitFor(() => {
        expect(screen.getByTestId('datatable-mock')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('add-button')).not.toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading indicator while fetching and hides it after data loads', async () => {
      let resolveQuery!: (value: PaginatedResponse<MockUser>) => void
      const queryFn = vi.fn().mockImplementation(
        () =>
          new Promise<PaginatedResponse<MockUser>>(resolve => {
            resolveQuery = resolve
          })
      )
      const { config } = makeConfig({ queryFn })

      renderListPage(config)

      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
      })

      resolveQuery(createPaginatedResponse(mockData, mockData.length, 1, 10))

      await waitFor(() => {
        expect(
          screen.queryByTestId('loading-indicator')
        ).not.toBeInTheDocument()
      })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('passes query error to DataTable without crashing', async () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('Network error'))
      const { config } = makeConfig({ queryFn })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Network error'
        )
      })
    })
  })

  describe('Empty State', () => {
    it('shows default empty state when query returns no data', async () => {
      const queryFn = vi
        .fn()
        .mockResolvedValue(createPaginatedResponse<MockUser>([], 0, 1, 10))
      const { config } = makeConfig({ queryFn })

      renderListPage(config)

      await waitFor(() => {
        expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument()
      })
    })
  })

  describe('Title and Description', () => {
    it('forwards config.list.title to DataTable header', async () => {
      const { config } = makeConfig({ list: { title: 'All Users' } })

      renderListPage(config)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'All Users' })
        ).toBeInTheDocument()
      })
    })

    it('forwards config.list.description to DataTable header', async () => {
      const { config } = makeConfig({
        list: { description: 'Manage all users in the system' },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(
          screen.getByText('Manage all users in the system')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty columns array', async () => {
      const { config, queryFn } = makeConfig({ list: { columns: [] } })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalled()
      })

      expect(screen.getByTestId('datatable-mock')).toBeInTheDocument()
    })

    it('handles queryFn resolving null gracefully', async () => {
      const queryFn = vi
        .fn()
        .mockResolvedValue(null as unknown as PaginatedResponse<MockUser>)
      const { config } = makeConfig({ queryFn })

      expect(() => renderListPage(config)).not.toThrow()

      // useCrudQuery falls back to [] / 0 → empty state renders
      await waitFor(() => {
        expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument()
      })
    })

    it('handles rapid store filter changes without crashing', async () => {
      const { config, queryFn, route } = makeConfig({
        list: { serverSidePagination: true },
      })

      renderListPage(config)

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalled()
      })

      act(() => {
        const store = useDataTableStore.getState()
        store.setGlobalFilter(route, 'a')
        store.setGlobalFilter(route, 'ab')
        store.setGlobalFilter(route, 'abc')
      })

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'abc' })
        )
      })

      expect(screen.getByTestId('datatable-mock')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// Focus Listener Error Handling
// ============================================================================
//
// These tests exercise the try/catch around the focus/visibilitychange
// auto-refresh listeners in useListPageData.ts. That path relies on
// `refetch()` *rejecting* on failure — real @tanstack/react-query's
// useQuery().refetch() resolves with an error result instead of throwing,
// so the suites above (real QueryClientProvider) can't reach this branch.
// This block therefore fully replaces '@tanstack/react-query' with a
// minimal mock (refetch = direct queryFn call) scoped ONLY to this describe
// via vi.doMock + vi.resetModules + a fresh dynamic import of ListPage, so
// it doesn't affect the real-react-query suites above (which already ran
// by the time this block's beforeAll executes).
describe('ListPage - Focus Listener Error Handling', () => {
  let FocusListPage: typeof ListPage
  let focusLogger: { error: (...args: unknown[]) => void }
  let toastMock: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    vi.resetModules()

    toastMock = vi.fn()
    vi.doMock('../hooks/use-toast', () => ({
      toast: toastMock,
      useToast: () => ({ toast: toastMock }),
    }))

    // Mock React Query. The mocked refetch invokes the query's queryFn
    // directly so tests can drive refresh success/failure deterministically
    // (the real refetch never rejects, it resolves with an error state).
    vi.doMock('@tanstack/react-query', () => ({
      useQuery: vi.fn((options: any) => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: () => options.queryFn(),
      })),
      useInfiniteQuery: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      })),
      useMutation: vi.fn(() => ({
        mutateAsync: vi.fn(),
        isPending: false,
      })),
      useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn(),
      })),
      QueryClient: vi.fn(),
      QueryClientProvider: ({ children }: any) => children,
      keepPreviousData: <T,>(previous: T) => previous,
    }))

    const listPageModule = await import('./ListPage')
    FocusListPage = listPageModule.ListPage
    const loggerModule = await import('../utils/logger')
    focusLogger = loggerModule.logger as { error: (...args: unknown[]) => void }
  })

  afterAll(() => {
    vi.doUnmock('@tanstack/react-query')
    vi.doUnmock('../hooks/use-toast')
    vi.resetModules()
  })

  const mockColumns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' },
  ]

  const mockQueryFn = vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, limit: 10 },
  })

  const baseConfig: CrudConfig<any, any> = {
    module: {
      name: 'users',
      title: 'Users',
      route: '/admin/users',
    },
    list: {
      columns: mockColumns,
    },
    form: {
      sections: [],
      validation: {} as any,
    },
    query: {
      queryKey: ['users'],
      queryFn: mockQueryFn,
    },
    mutations: {
      create: {
        mutationFn: vi.fn(),
        invalidates: [['users']],
      },
      update: {
        mutationFn: vi.fn(),
        invalidates: [['users']],
      },
      delete: {
        mutationFn: vi.fn(),
        invalidates: [['users']],
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Focus Listener Error Handling', () => {
    it('should log error when focus refresh fails', async () => {
      const loggerErrorSpy = vi
        .spyOn(focusLogger, 'error')
        .mockImplementation(() => {})
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const configWithFailingRefetch = {
        ...baseConfig,
        query: {
          ...baseConfig.query,
          queryFn: mockRefetch,
        },
      }

      render(
        <FocusListPage
          config={configWithFailingRefetch}
          disableAutoRefresh={false}
        />
      )

      // Simulate window focus event
      act(() => {
        window.dispatchEvent(new Event('focus'))
      })

      await waitFor(() => {
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[ListPage] Error refreshing data on focus'),
          expect.objectContaining({ error: expect.anything() })
        )
      })

      loggerErrorSpy.mockRestore()
    })

    it('should log error when visibility change refresh fails', async () => {
      const loggerErrorSpy = vi
        .spyOn(focusLogger, 'error')
        .mockImplementation(() => {})
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const configWithFailingRefetch = {
        ...baseConfig,
        query: {
          ...baseConfig.query,
          queryFn: mockRefetch,
        },
      }

      render(
        <FocusListPage
          config={configWithFailingRefetch}
          disableAutoRefresh={false}
        />
      )

      // Simulate visibility change event (page becomes visible)
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      await waitFor(() => {
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            '[ListPage] Error refreshing data on visibility change'
          ),
          expect.objectContaining({ error: expect.anything() })
        )
      })

      loggerErrorSpy.mockRestore()
    })

    it('should NOT show toast for background refresh errors', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const configWithFailingRefetch = {
        ...baseConfig,
        query: {
          ...baseConfig.query,
          queryFn: mockRefetch,
        },
      }

      render(
        <FocusListPage
          config={configWithFailingRefetch}
          disableAutoRefresh={false}
        />
      )

      act(() => {
        window.dispatchEvent(new Event('focus'))
      })

      await waitFor(() => {
        expect(toastMock).not.toHaveBeenCalled()
      })
    })

    it('should handle successful focus refresh without errors', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const mockRefetch = vi.fn().mockResolvedValue({
        data: [{ id: '1', name: 'Test User' }],
        meta: { total: 1, page: 1, limit: 10 },
      })

      const configWithSuccessRefetch = {
        ...baseConfig,
        query: {
          ...baseConfig.query,
          queryFn: mockRefetch,
        },
      }

      render(
        <FocusListPage
          config={configWithSuccessRefetch}
          disableAutoRefresh={false}
        />
      )

      act(() => {
        window.dispatchEvent(new Event('focus'))
      })

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled()
      })

      expect(consoleErrorSpy).not.toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should not refresh when disableAutoRefresh is true', async () => {
      const mockRefetch = vi.fn()

      const configWithAutoRefreshDisabled = {
        ...baseConfig,
        query: {
          ...baseConfig.query,
          queryFn: mockRefetch,
        },
      }

      render(
        <FocusListPage
          config={configWithAutoRefreshDisabled}
          disableAutoRefresh
        />
      )

      act(() => {
        window.dispatchEvent(new Event('focus'))
      })

      await waitFor(() => {
        expect(mockRefetch).not.toHaveBeenCalled()
      })
    })

    it('should not refresh on visibility change when document remains hidden', async () => {
      const mockRefetch = vi.fn()

      const configWithRefetch = {
        ...baseConfig,
        query: {
          ...baseConfig.query,
          queryFn: mockRefetch,
        },
      }

      render(
        <FocusListPage config={configWithRefetch} disableAutoRefresh={false} />
      )

      // Simulate visibility change event while document is hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      await waitFor(() => {
        expect(mockRefetch).not.toHaveBeenCalled()
      })
    })
  })
})
