import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'

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
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('../data/DataTable', () => ({
  DataTable: () => <div data-testid='datatable-mock' />,
}))

interface User {
  id: string
  name: string
}

function makeConfig(infiniteScroll: boolean): CrudConfig<User> {
  return {
    module: { name: 'users', title: 'Users', route: '/admin/users-header' },
    list: {
      columns: [{ accessorKey: 'name', header: 'Name' }],
      infiniteScroll,
    },
    query: {
      queryKey: ['users-header'],
      queryFn: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 }),
    },
    mutations: {},
  }
}

function renderList({ embedded = false, infiniteScroll = true } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ListPage<User>
        config={makeConfig(infiniteScroll)}
        embedded={embedded}
        header={<div role='alert'>Status bar</div>}
      />
    </QueryClientProvider>
  )
}

/** The ListPage root: the header wrapper's parent */
function rootOf(header: HTMLElement) {
  const root = header.parentElement
  if (!root) throw new Error('header has no parent')
  return root
}

describe('ListPage - header slot', () => {
  describe('Rendering', () => {
    it.each([
      ['embedded paginated', { embedded: true, infiniteScroll: false }],
      ['embedded infinite', { embedded: true, infiniteScroll: true }],
      ['standalone infinite', { embedded: false, infiniteScroll: true }],
    ])('%s: renders inside the flex root, before the toolbar', (_label, opts) => {
      renderList(opts)
      const header = screen.getByTestId('list-page-header')
      const root = rootOf(header)

      expect(header).toContainElement(screen.getByRole('alert'))
      expect(header).toHaveClass('shrink-0')
      expect(root.firstElementChild).toBe(header)
      // The root stays the bounded flex column: the table below fills what is left
      expect(root).toHaveClass('flex', 'flex-col', 'h-full', 'min-h-0')

      const searchInput = root.querySelector('input')
      expect(searchInput).not.toBeNull()
      expect(
        header.compareDocumentPosition(searchInput as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    })

    it('container mode (standalone paginated): renders as the first child', () => {
      renderList({ embedded: false, infiniteScroll: false })
      const header = screen.getByTestId('list-page-header')
      const root = rootOf(header)

      expect(root).toHaveClass('container')
      expect(root.firstElementChild).toBe(header)
      expect(
        header.compareDocumentPosition(screen.getByTestId('datatable-mock')) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('renders no wrapper without a header', () => {
      const queryClient = new QueryClient()
      render(
        <QueryClientProvider client={queryClient}>
          <ListPage<User> config={makeConfig(true)} embedded />
        </QueryClientProvider>
      )
      expect(screen.queryByTestId('list-page-header')).not.toBeInTheDocument()
    })
  })
})
