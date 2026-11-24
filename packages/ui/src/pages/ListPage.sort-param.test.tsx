import { render, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import { useDataTableStore } from '../stores/datatable-store'
import type { CrudConfig } from '../types/crud'
import type { ListQueryState } from './list-page/types'

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/orders',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('../data/DataTable', () => ({
  DataTable: () => <div data-testid='datatable-mock' />,
}))

interface Order {
  id: string
  customer: { name: string }
  created_at: string
}

let routeCounter = 0

function setup(list: Partial<CrudConfig<Order>['list']>) {
  routeCounter += 1
  const route = `/admin/orders-${routeCounter}`
  const queryFn = vi
    .fn()
    .mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 })
  const seen = vi.fn()
  const config: CrudConfig<Order> = {
    module: { name: 'orders', title: 'Orders', description: '', route },
    list: {
      title: 'Orders',
      description: '',
      columns: [
        { accessorKey: 'customer.name', header: 'Customer' },
        { accessorKey: 'created_at', header: 'Created' },
      ],
      ...list,
    },
    query: { queryKey: ['orders', route], queryFn },
    mutations: {},
  }
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ListPage<Order>
        config={config}
        toolbarContent={(state: ListQueryState) => {
          seen(state)
          return null
        }}
      />
    </QueryClientProvider>
  )
  // What a header click stores: the TanStack column id
  const clickHeader = (field: string) =>
    act(() => {
      useDataTableStore.getState().setSorting(route, [{ field, order: 'desc' }])
    })
  return { queryFn, seen, clickHeader }
}

const lastSortBy = (queryFn: ReturnType<typeof vi.fn>) =>
  queryFn.mock.calls.at(-1)?.[0].sortBy

describe.each([
  ['infinite', { infiniteScroll: true }],
  ['paginated', { infiniteScroll: false, serverSidePagination: true }],
] as const)('ListPage sortParam (%s list)', (_name, mode) => {
  it("sends the TanStack column id by default ('id')", async () => {
    const { queryFn, clickHeader } = setup(mode)
    clickHeader('customer_name')
    await waitFor(() => expect(lastSortBy(queryFn)).toBe('customer_name'))
  })

  it("sends the column's data path with sortParam: 'path'", async () => {
    const { queryFn, clickHeader } = setup({ ...mode, sortParam: 'path' })
    clickHeader('customer_name')
    await waitFor(() => expect(lastSortBy(queryFn)).toBe('customer.name'))
    expect(queryFn.mock.calls.at(-1)?.[0].sortOrder).toBe('desc')

    clickHeader('created_at')
    await waitFor(() => expect(lastSortBy(queryFn)).toBe('created_at'))
  })

  it("maps a dotted defaultSortBy and a legacy stored id alike in 'path'", async () => {
    const { queryFn, clickHeader } = setup({
      ...mode,
      sortParam: 'path',
      defaultSortBy: 'customer.name',
    })
    await waitFor(() => expect(lastSortBy(queryFn)).toBe('customer.name'))
    // e.g. a saved view stored before the opt-in
    clickHeader('created_at')
    clickHeader('customer_name')
    await waitFor(() =>
      expect(queryFn.mock.calls.at(-1)?.[0]).toMatchObject({
        sortBy: 'customer.name',
        sortOrder: 'desc',
      })
    )
  })
})

describe('ListPage sortParam - export and toolbarContent', () => {
  it("hands the wire form to toolbarContent/onExport and the export params in 'path'", async () => {
    const { seen, clickHeader } = setup({ sortParam: 'path' })
    clickHeader('customer_name')
    await waitFor(() =>
      expect(seen.mock.calls.at(-1)?.[0].sorting).toEqual([
        { field: 'customer.name', order: 'desc' },
      ])
    )
    const state: ListQueryState = seen.mock.calls.at(-1)?.[0]
    // fetchAllPages (exportAll) starts from these params
    expect(state.params.sortBy).toEqual(state.sorting)
  })
})
