import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useListPageData } from './useListPageData'
import { useListPageActions } from './useListPageActions'
import { useInfiniteListQuery } from '../../hooks/useInfiniteListQuery'
import type { CrudConfigWithAnyForm } from '../../types/crud'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/x',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('../../contexts/CacheContext', () => ({
  useCacheContext: () => ({ revalidateAction: undefined }),
}))

type E = { id: string }
// Single client across rerenders
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('ListPage perf', () => {
  it('debounces search: typing fast issues one request, not one per keystroke', async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      })
    const config = {
      module: { name: 'e', title: 'E', route: '/e' },
      list: { columns: [] },
      query: { queryKey: ['e'], queryFn },
    } as unknown as CrudConfigWithAnyForm<E>
    const base = {
      config,
      page: 1,
      pageSize: 20,
      sorting: [],
      allFilters: {},
      isInfiniteScroll: false,
      disableAutoRefresh: true,
    }
    const { rerender } = renderHook(
      ({ search }) => useListPageData<E>({ ...base, search }),
      { wrapper: makeWrapper(), initialProps: { search: '' } }
    )
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1))
    for (const s of ['a', 'ab', 'abc']) rerender({ search: s })
    await waitFor(
      () =>
        expect(queryFn).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'abc' })
        ),
      { timeout: 2000 }
    )
    // initial '' + final 'abc' only
    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('actions config is referentially stable when only wrapper objects change', () => {
    const mutateAsync = vi.fn()
    const handleRefresh = vi.fn()
    const actionsConfig = { standard: { delete: true } }
    const mutations = {} as CrudConfigWithAnyForm<E>['mutations']
    const openEditForRow = vi.fn()
    const openViewForRow = vi.fn()
    const { result, rerender } = renderHook(() =>
      useListPageActions<E>({
        actionsDisabled: false,
        actionsConfig,
        dialogs: undefined,
        mutations,
        // fresh wrapper object each render, like useCrudMutations
        deleteMutation: { mutateAsync },
        handleRefresh,
        openEditForRow,
        openViewForRow,
      })
    )
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('useInfiniteListQuery fetchNextPage/refetch are stable across renders', async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      })
    const { result, rerender } = renderHook(
      () => useInfiniteListQuery<E>({ queryKey: ['i'], queryFn, pageSize: 20 }),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const { fetchNextPage, refetch } = result.current
    rerender()
    expect(result.current.fetchNextPage).toBe(fetchNextPage)
    expect(result.current.refetch).toBe(refetch)
  })
})
