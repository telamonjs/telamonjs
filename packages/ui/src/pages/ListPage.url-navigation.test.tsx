/**
 * urlSync ListPage following the URL after mount: Back/Forward or a link to
 * the same page (Next keeps it mounted), a remount with a different link, and
 * params ListPage does not own (useUrlFilters) left alone.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import { useDataTableStore } from '../stores/datatable-store'
import { useUrlSync } from '../hooks/useUrlSync'
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
const mockReplace = vi.fn()
const mockPush = vi.fn()

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
const table = () => useDataTableStore.getState().tables[TABLE_ID]

/** Another URL writer on the page, like useUrlFilters */
const other: { writer?: ReturnType<typeof useUrlSync> } = {}
function OtherWriter() {
  const writer = useUrlSync()
  useEffect(() => {
    other.writer = writer
  })
  return null
}

function renderList(list: Partial<CrudConfig<User>['list']> = {}) {
  const queryFn = vi
    .fn()
    .mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 })
  const config: CrudConfig<User> = {
    module: { name: 'users', title: 'Users', route: TABLE_ID },
    list: {
      columns: [{ accessorKey: 'name', header: 'Name' }],
      infiniteScroll: false,
      serverSidePagination: true,
      defaultPageSize: 25,
      ...list,
    },
    query: { queryKey: ['users'], queryFn },
    mutations: {},
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const ui = (
    <QueryClientProvider client={client}>
      <OtherWriter />
      <ListPage<User>
        config={config}
        urlSync
        urlFilters={{ status: 'string' }}
      />
    </QueryClientProvider>
  )
  return { queryFn, ...render(ui) }
}

describe('ListPage urlSync - URL changes after mount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReplace.mockImplementation((url: string) => setUrl(url))
    mockPush.mockImplementation((url: string) => setUrl(url))
    useDataTableStore.setState({ tables: {} })
    currentSearchParams = new URLSearchParams()
  })

  it('Back/Forward on the mounted page applies the URL and refetches', async () => {
    const { queryFn } = renderList()
    await waitFor(() => expect(queryFn).toHaveBeenCalled())
    expect(currentSearchParams.get('pageSize')).toBe('25')

    act(() =>
      setUrl('/admin/users?page=3&pageSize=50&sortBy=name&sortOrder=desc&search=ana&status=active')
    )

    await waitFor(() =>
      expect(queryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 3,
          pageSize: 50,
          search: 'ana',
          sortBy: 'name',
          sortOrder: 'desc',
          filters: { status: 'active' },
        })
      )
    )
    expect(table()).toMatchObject({ page: 3, pageSize: 50, globalFilter: 'ana' })
    // The URL is left as navigated (no write back, no loop)
    expect(currentSearchParams.toString()).toBe(
      'page=3&pageSize=50&sortBy=name&sortOrder=desc&search=ana&status=active'
    )

    // Back to a URL without the params: the defaults return
    const writes = mockReplace.mock.calls.length
    act(() => setUrl('/admin/users'))
    await waitFor(() =>
      expect(table()).toMatchObject({
        page: 1,
        pageSize: 25,
        globalFilter: '',
        sorting: [],
      })
    )
    await waitFor(() =>
      expect(queryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 25, filters: undefined })
      )
    )
    // One write puts the defaults back in the URL, then it settles
    await waitFor(() => expect(currentSearchParams.get('pageSize')).toBe('25'))
    expect(mockReplace.mock.calls.length - writes).toBe(1)
  })

  it("ignores its own writes, including one that lands after a newer one", async () => {
    const pending: string[] = []
    mockReplace.mockImplementation((url: string) => pending.push(url))
    const { queryFn } = renderList()
    await waitFor(() => expect(queryFn).toHaveBeenCalled())
    act(() => setUrl(pending.splice(0)[0]))

    act(() => useDataTableStore.getState().setPage(TABLE_ID, 2))
    act(() => useDataTableStore.getState().setPage(TABLE_ID, 3))
    expect(pending.map(u => new URL(u, 'http://x').searchParams.get('page'))).toEqual(['2', '3'])

    // The older write lands first: still ours, the table stays on page 3
    act(() => setUrl(pending[0]))
    expect(table().page).toBe(3)
    act(() => setUrl(pending[1]))
    expect(table().page).toBe(3)
    expect(mockReplace).toHaveBeenCalledTimes(3)
  })

  it('a remount with a different link replaces the state left by the previous visit', async () => {
    const first = renderList()
    await waitFor(() => expect(first.queryFn).toHaveBeenCalled())
    act(() => useDataTableStore.getState().setPage(TABLE_ID, 4))
    await waitFor(() => expect(currentSearchParams.get('page')).toBe('4'))
    first.unmount()

    currentSearchParams = new URLSearchParams('sortBy=name&sortOrder=desc')
    const second = renderList()
    await waitFor(() =>
      expect(second.queryFn).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 25,
          sortBy: 'name',
          sortOrder: 'desc',
        })
      )
    )
    // The link's params survive (not overwritten with page=4)
    await waitFor(() => expect(currentSearchParams.get('page')).toBe('1'))
    expect(currentSearchParams.get('sortBy')).toBe('name')
  })

  it('a remount without list params keeps the previous state', async () => {
    const first = renderList()
    await waitFor(() => expect(first.queryFn).toHaveBeenCalled())
    act(() => useDataTableStore.getState().setPage(TABLE_ID, 4))
    first.unmount()

    currentSearchParams = new URLSearchParams()
    renderList()
    await waitFor(() => expect(currentSearchParams.get('page')).toBe('4'))
  })

  it('leaves params it does not own alone (useUrlFilters)', async () => {
    const { queryFn } = renderList()
    await waitFor(() => expect(queryFn).toHaveBeenCalled())
    act(() => useDataTableStore.getState().setPage(TABLE_ID, 2))
    await waitFor(() => expect(currentSearchParams.get('page')).toBe('2'))
    const writes = mockReplace.mock.calls.length
    const calls = queryFn.mock.calls.length

    act(() => other.writer!.setParams({ city: 'natal' }, { replace: true }))

    expect(currentSearchParams.get('city')).toBe('natal')
    expect(currentSearchParams.get('page')).toBe('2')
    expect(table().page).toBe(2)
    // Only the other writer's navigation; ListPage did not react
    expect(mockReplace.mock.calls.length - writes).toBe(1)
    expect(queryFn.mock.calls.length).toBe(calls)

    // A later list write keeps the other param
    act(() => useDataTableStore.getState().setPage(TABLE_ID, 3))
    await waitFor(() => expect(currentSearchParams.get('page')).toBe('3'))
    expect(currentSearchParams.get('city')).toBe('natal')
  })

  it('a toolbar filter listed in urlFilters follows the URL, back to its default when missing', async () => {
    currentSearchParams = new URLSearchParams('status=inactive')
    const { queryFn } = renderList({
      toolbar: {
        filters: [
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
            defaultValue: 'active',
          },
        ],
      },
    })
    await waitFor(() =>
      expect(queryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: { status: 'inactive' } })
      )
    )

    act(() => setUrl('/admin/users?status=all'))
    await waitFor(() =>
      expect(queryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: undefined })
      )
    )

    act(() => setUrl('/admin/users'))
    await waitFor(() =>
      expect(queryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: { status: 'active' } })
      )
    )
    await waitFor(() => expect(currentSearchParams.get('status')).toBe('active'))
  })

  it('infinite scroll: follows sort/search, page and pageSize stay out of the URL', async () => {
    const { queryFn } = renderList({ infiniteScroll: true })
    await waitFor(() => expect(queryFn).toHaveBeenCalled())
    expect(currentSearchParams.has('page')).toBe(false)

    act(() => setUrl('/admin/users?sortBy=name&sortOrder=desc&search=bia'))
    await waitFor(() =>
      expect(table()).toMatchObject({
        globalFilter: 'bia',
        sorting: [{ field: 'name', order: 'desc' }],
      })
    )
    await waitFor(() =>
      expect(queryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'bia', sortBy: 'name' })
      )
    )

    // A page in the URL is not list state here: no reaction, no write
    const writes = mockReplace.mock.calls.length
    act(() => setUrl('/admin/users?sortBy=name&sortOrder=desc&search=bia&page=7'))
    expect(table().page).toBe(1)
    expect(mockReplace.mock.calls.length).toBe(writes)
  })
})
