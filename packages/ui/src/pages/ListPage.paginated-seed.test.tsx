/**
 * Paginated ListPage with the REAL DataTable: the config defaults and the
 * urlSync seed must reach the first query. DataTable's own `initTable` effect
 * runs before ListPage's (child effects first), so a seed applied in a
 * ListPage effect lost to the store defaults (pageSize 10, no sort).
 */
import { useSyncExternalStore } from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import { useDataTableStore } from '../stores/datatable-store'
import type { CrudConfig } from '../types/crud'

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

let currentSearchParams = new URLSearchParams()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
/** What a Next navigation does: a NEW searchParams object, subscribers re-render */
const setUrl = (url: string) => {
  currentSearchParams = new URLSearchParams(url.split('?')[1] ?? '')
  listeners.forEach(fn => fn())
}
const mockReplace = vi.fn((url: string) => setUrl(url))
const mockPush = vi.fn((url: string) => setUrl(url))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () =>
    useSyncExternalStore(subscribe, () => currentSearchParams),
}))

interface User {
  id: string
  name: string
}

const TABLE_ID = '/admin/users'

function renderList(
  list: Partial<CrudConfig<User>['list']>,
  props: { urlSync?: boolean } = {}
) {
  const queryFn = vi
    .fn()
    .mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 })
  const config: CrudConfig<User> = {
    module: { name: 'users', title: 'Users', route: TABLE_ID },
    list: {
      columns: [{ accessorKey: 'name', header: 'Name' }],
      infiniteScroll: false,
      serverSidePagination: true,
      ...list,
    },
    query: { queryKey: ['users'], queryFn },
    mutations: {},
  }
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ListPage<User> config={config} {...props} />
    </QueryClientProvider>
  )
  return { queryFn }
}

describe('ListPage (paginated, real DataTable) - initial table state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDataTableStore.setState({ tables: {} })
    currentSearchParams = new URLSearchParams()
  })

  it('sends defaultPageSize and defaultSortBy/defaultSortOrder in the first query', async () => {
    const { queryFn } = renderList({
      defaultPageSize: 25,
      defaultSortBy: 'name',
      defaultSortOrder: 'desc',
    })
    await waitFor(() => expect(queryFn).toHaveBeenCalled())
    expect(queryFn.mock.calls[0][0]).toMatchObject({
      page: 1,
      pageSize: 25,
      sortBy: 'name',
      sortOrder: 'desc',
    })
    expect(queryFn.mock.calls.every(([p]) => p.pageSize === 25)).toBe(true)
  })

  it('a urlSync link wins over the config defaults', async () => {
    currentSearchParams = new URLSearchParams(
      'page=2&pageSize=20&sortBy=name&sortOrder=desc&search=ana'
    )
    const { queryFn } = renderList(
      { defaultPageSize: 25, defaultSortBy: 'id' },
      { urlSync: true }
    )
    await waitFor(() =>
      expect(queryFn).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 20,
          search: 'ana',
          sortBy: 'name',
          sortOrder: 'desc',
        })
      )
    )
    // The link survives the sync effect (not rewritten with the defaults)
    expect(currentSearchParams.get('pageSize')).toBe('20')
    expect(currentSearchParams.get('page')).toBe('2')
    expect(currentSearchParams.get('sortBy')).toBe('name')
  })
})
