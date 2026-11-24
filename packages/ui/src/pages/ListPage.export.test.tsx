import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'
import type { PaginationParams } from '../types/pagination'

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

let currentSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'progress'),
    dismiss: vi.fn(),
  }),
}))

const exportToCSV = vi.fn()
vi.mock('../data/exportUtils', () => ({
  exportToCSV: (...args: unknown[]) => exportToCSV(...args),
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
}))


// jsdom has no layout → offsetParent is always null. Emulate visibility so
// useDialogUrlSync's gate can be exercised: an element is "visible" unless it
// (or an ancestor) has inline `display: none` (how keep-alive tabs hide content).
let originalOffsetParent: PropertyDescriptor | undefined
beforeAll(() => {
  originalOffsetParent = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent'
  )
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      let el: HTMLElement | null = this
      while (el) {
        if (el.style?.display === 'none') return null
        el = el.parentElement
      }
      return document.body
    },
  })
})
afterAll(() => {
  if (originalOffsetParent) {
    Object.defineProperty(
      HTMLElement.prototype,
      'offsetParent',
      originalOffsetParent
    )
  }
})

interface User {
  id: string
  name: string
}

const ALL: User[] = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), name: `User ${i + 1}` }))

/** Backend of 5 users honoring page/pageSize */
const pagedQueryFn = () =>
  vi.fn(async ({ page, pageSize }: PaginationParams) => ({
    data: ALL.slice((page - 1) * pageSize, page * pageSize),
    total: ALL.length,
    page,
    pageSize,
    totalPages: Math.ceil(ALL.length / pageSize),
  }))

function makeConfig(list: Partial<CrudConfig<User>['list']>, queryFn = pagedQueryFn()): CrudConfig<User> {
  return {
    module: { name: 'users', title: 'Users', description: '', route: '/admin/users-export' },
    list: {
      title: 'Users',
      description: '',
      columns: [{ accessorKey: 'name', header: 'Name' }],
      defaultPageSize: 2,
      toolbar: {
        filters: [
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'all', label: 'All' },
              { value: 'ACTIVE', label: 'Active' },
            ],
          },
        ],
      },
      ...list,
    },
    query: { queryKey: ['users-export'], queryFn },
    mutations: {},
  }
}

function renderList(config: CrudConfig<User>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ListPage<User> config={config} />
    </QueryClientProvider>
  )
}

async function exportAllCsv(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId('export-menu-trigger'))
  await user.click(await screen.findByText('CSV (.csv)'))
  await user.click(await screen.findByText('Exportar tudo'))
}

describe('ListPage - export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearch = ''
  })

  describe('State Management', () => {
    it('default: "All" exports only the loaded rows (the first infinite page)', async () => {
      const user = userEvent.setup()
      const config = makeConfig({ enableExport: true, exportFormats: ['csv'] })
      renderList(config)
      await screen.findByText(/5 resultados/)

      await exportAllCsv(user)
      await waitFor(() => expect(exportToCSV).toHaveBeenCalled())
      expect(exportToCSV.mock.calls[0]?.[0]).toEqual(ALL.slice(0, 2))
    })

    it('exportAll: "All" fetches every page with the current filter and exports all of them', async () => {
      const user = userEvent.setup()
      const config = makeConfig({ enableExport: true, exportAll: true, exportFormats: ['csv'] })
      renderList(config)
      await screen.findByText(/5 resultados/)
      await user.click(screen.getByTestId('filter-button-ACTIVE'))
      await waitFor(() =>
        expect(config.query.queryFn).toHaveBeenCalledWith(expect.objectContaining({ filters: { status: 'ACTIVE' } }))
      )

      await exportAllCsv(user)
      await waitFor(() => expect(exportToCSV).toHaveBeenCalled())
      expect(exportToCSV.mock.calls[0]?.[0]).toEqual(ALL)
      expect(exportToCSV.mock.calls[0]?.[2]).toBe('users')
      expect(config.query.queryFn).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, pageSize: 2, filters: { status: 'ACTIVE' } })
      )
    })

    it('onExport: the app gets the list query and the format; nothing is generated locally', async () => {
      const user = userEvent.setup()
      const onExport = vi.fn()
      renderList(makeConfig({ onExport, exportFormats: ['excel'] }))
      await screen.findByText(/5 resultados/)
      await user.click(screen.getByTestId('filter-button-ACTIVE'))

      await user.click(await screen.findByTestId('export-menu-trigger'))
      await user.click(await screen.findByText('Excel (.xlsx)'))
      expect(onExport).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { status: 'ACTIVE' } }),
        'excel'
      )
      expect(exportToCSV).not.toHaveBeenCalled()
    })
  })
})
