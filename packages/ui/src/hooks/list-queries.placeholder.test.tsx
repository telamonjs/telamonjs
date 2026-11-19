import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCrudQuery } from './useCrudQuery'
import { useInfiniteListQuery } from './useInfiniteListQuery'

describe('list queries keep previous rows while a new key loads', () => {
  it('keeps the previous rows (not loading) while a new search loads', async () => {
    let resolveSecond: (v: unknown) => void = () => {}
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: '1' }], total: 1 })
      .mockImplementationOnce(() => new Promise(r => (resolveSecond = r)))
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const config = { query: { queryKey: ['x'], queryFn } } as never
    const { result, rerender } = renderHook(
      ({ search }) =>
        useCrudQuery({ config, params: { page: 1, pageSize: 10, search } }),
      { wrapper, initialProps: { search: '' } }
    )
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    rerender({ search: 'abc' })
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toHaveLength(1)
    resolveSecond({ data: [], total: 0 })
  })

  it('infinite list: no skeleton on a new search (default ListPage mode)', async () => {
    let resolveSecond: (v: unknown) => void = () => {}
    const page = (data: unknown[]) => ({
      data,
      total: data.length,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    })
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce(page([{ id: '1' }]))
      .mockImplementationOnce(() => new Promise(r => (resolveSecond = r)))
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, rerender } = renderHook(
      ({ search }) =>
        useInfiniteListQuery({
          queryKey: ['y'],
          queryFn,
          pageSize: 50,
          search,
        }),
      { wrapper, initialProps: { search: '' } }
    )
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    rerender({ search: 'abc' })
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toHaveLength(1)
    resolveSecond(page([]))
  })
})
