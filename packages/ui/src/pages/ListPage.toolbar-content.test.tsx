import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
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

let currentSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

vi.mock('../data/DataTable', () => ({
  DataTable: () => <div data-testid='datatable-mock' />,
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

function makeConfig(): CrudConfig<User> {
  return {
    module: { name: 'users', title: 'Users', description: '', route: '/admin/users-query' },
    list: {
      title: 'Users',
      description: '',
      columns: [{ accessorKey: 'name', header: 'Name' }],
      defaultSortBy: 'name',
      defaultSortOrder: 'desc',
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
    },
    query: {
      queryKey: ['users-query'],
      queryFn: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 }),
    },
    mutations: {},
  }
}

function renderList(toolbarContent: Parameters<typeof ListPage<User>>[0]['toolbarContent']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ListPage<User> config={makeConfig()} toolbarContent={toolbarContent} />
    </QueryClientProvider>
  )
}

describe('ListPage - toolbarContent receives the list query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearch = ''
  })

  describe('Rendering', () => {
    it('keeps rendering a plain ReactNode', async () => {
      renderList(<button type='button'>Plain</button>)
      expect(await screen.findByRole('button', { name: 'Plain' })).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('a function gets search, filters, sorting and the queryFn params, and follows the toolbar', async () => {
      const user = userEvent.setup()
      const seen = vi.fn()
      renderList((state: ListQueryState) => {
        seen(state)
        return <span data-testid='export'>{String(state.filters.status ?? 'none')}</span>
      })

      await waitFor(() =>
        expect(seen.mock.calls.at(-1)?.[0].sorting).toEqual([{ field: 'name', order: 'desc' }])
      )
      expect(screen.getByTestId('export')).toHaveTextContent('none')
      const first: ListQueryState = seen.mock.calls.at(-1)?.[0]
      expect(first.search).toBe('')
      expect(first.params.sortBy).toEqual(first.sorting)

      await user.click(screen.getByTestId('filter-button-ACTIVE'))

      await waitFor(() => expect(screen.getByTestId('export')).toHaveTextContent('ACTIVE'))
      const last: ListQueryState = seen.mock.calls.at(-1)?.[0]
      expect(last.params.filters).toEqual({ status: 'ACTIVE' })
    })
  })
})
