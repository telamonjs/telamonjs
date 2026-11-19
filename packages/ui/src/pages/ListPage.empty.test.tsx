import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { telamonjsMessages } from '../i18n/messages'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

type User = { id: string; name: string }
const makeConfig = (infiniteScroll: boolean): CrudConfig<User, { name: string }> => ({
  module: { name: 'users', title: 'Users', description: 'd', route: '/admin/users' },
  list: {
    title: 'Users',
    description: 'd',
    columns: [{ accessorKey: 'name', header: 'Name' }],
    infiniteScroll,
    emptyTitle: 'Nothing pending',
    emptyDescription: 'Approvals show up here.',
  },
  form: { sections: [], validation: undefined as never },
  query: {
    queryKey: ['users-empty', String(infiniteScroll)],
    queryFn: async () => ({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
  },
  mutations: {} as never,
})

function renderPage(infiniteScroll: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale='en' messages={telamonjsMessages.en}>
        <ListPage<User> config={makeConfig(infiniteScroll)} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  )
}

describe('ListPage custom empty state (list.emptyTitle / emptyDescription)', () => {
  it('paginated DataTable shows the custom texts', async () => {
    renderPage(false)
    expect(await screen.findByText('Nothing pending')).toBeInTheDocument()
    expect(screen.getByText('Approvals show up here.')).toBeInTheDocument()
  })

  it('InfiniteList shows the custom texts as an h2', async () => {
    renderPage(true)
    expect(await screen.findByRole('heading', { level: 2, name: 'Nothing pending' })).toBeInTheDocument()
  })
})
