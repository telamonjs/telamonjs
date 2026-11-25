import { act, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { telamonjsMessages } from '../i18n/messages'
import { ListPage } from './ListPage'
import { arrayQueryFn } from '../data/array-query-fn'
import { useDataTableStore } from '../stores/datatable-store'
import type { CrudConfig } from '../types/crud'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/members',
  useSearchParams: () => new URLSearchParams(),
}))

type Member = { id: string; name: string }
const route = '/admin/members'

// An endpoint that answers a plain array, in no particular order
const fetchAll = vi.fn(async (): Promise<Member[]> => [
  { id: '1', name: 'Carla' },
  { id: '2', name: 'Ana' },
  { id: '3', name: 'Bruno' },
])

const config: CrudConfig<Member, { name: string }> = {
  module: { name: 'members', title: 'Members', description: 'd', route },
  list: {
    title: 'Members',
    description: 'd',
    columns: [{ accessorKey: 'name', header: 'Name' }],
    // The table renders its rows in jsdom; the virtualized infinite list does not
    infiniteScroll: false,
    serverSidePagination: true,
  },
  form: { sections: [], validation: undefined as never },
  query: { queryKey: ['members-array'], queryFn: arrayQueryFn(fetchAll) },
  mutations: {} as never,
}

const shown = () =>
  ['Ana', 'Bruno', 'Carla'].filter(name => screen.queryAllByText(name).length > 0)

describe('ListPage with arrayQueryFn', () => {
  it('renders the array rows, then searches and sorts them in memory', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <NextIntlClientProvider locale='en' messages={telamonjsMessages.en}>
          <ListPage<Member> config={config} />
        </NextIntlClientProvider>
      </QueryClientProvider>
    )

    await waitFor(() => expect(shown()).toEqual(['Ana', 'Bruno', 'Carla']))

    act(() => useDataTableStore.getState().setGlobalFilter(route, 'AN'))
    await waitFor(() => expect(shown()).toEqual(['Ana']))

    act(() => {
      useDataTableStore.getState().setGlobalFilter(route, '')
      useDataTableStore.getState().setSorting(route, [{ field: 'name', order: 'desc' }])
    })
    await waitFor(() => {
      const names = screen.getAllByText(/^(Ana|Bruno|Carla)$/).map(el => el.textContent)
      expect(names).toEqual(['Carla', 'Bruno', 'Ana'])
    })
  })
})
