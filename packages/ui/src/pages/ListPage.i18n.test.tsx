import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { msg } from '../i18n/msg'
import { telamonjsMessages } from '../i18n/messages'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

const appMessages = {
  users: { title: 'Users', description: 'Manage users', name: 'Name', search: 'Search users...' },
}
type User = { id: string; name: string }
const config: CrudConfig<User, { name: string }> = {
  module: { name: 'users', title: msg('users.title'), description: msg('users.description'), route: '/admin/users' },
  list: {
    title: msg('users.title'),
    description: msg('users.description'),
    searchPlaceholder: msg('users.search'),
    columns: [{ accessorKey: 'name', header: msg('users.name') }],
    // Classic (non-infinite) DataTable renders the title as an <h2> — the
    // infinite-scroll default path (InfiniteList) has no title/description UI.
    infiniteScroll: false,
  },
  form: { sections: [], validation: undefined as never },
  query: {
    queryKey: ['users'],
    queryFn: async () => ({ data: [{ id: '1', name: 'Ana' }], total: 1, page: 1, pageSize: 10, totalPages: 1 }),
  },
  mutations: {} as never,
}

describe('ListPage i18n', () => {
  it('resolves MessageRef slots against app messages in the active locale', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale='en' messages={{ ...telamonjsMessages.en, ...appMessages }}>
          <ListPage<User> config={config} />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
    expect(await screen.findByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
  })
})
