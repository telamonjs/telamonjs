/**
 * Tests for useInfiniteListQuery hook.
 *
 * Coverage:
 * - Rendering: initial load, isLoading state
 * - Pagination: getNextPageParam stops at totalPages, increments page
 * - Accumulation: pages flatten and deduplicate by id
 * - enabled: gates the query
 * - total: comes from first page
 * - error: surfaces the error message
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useInfiniteListQuery } from './useInfiniteListQuery'
import type { PaginatedResponse } from '../types/pagination'

// ── helpers ────────────────────────────────────────────────────────────────

function makePage<T>(
  data: T[],
  page: number,
  totalPages: number
): PaginatedResponse<T> {
  return {
    data,
    total: totalPages * data.length, // simplified total
    page,
    pageSize: data.length,
    totalPages,
  }
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

interface Item {
  id: string
  name: string
}

const page1Items: Item[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
]
const page2Items: Item[] = [
  { id: '3', name: 'Carol' },
  { id: '4', name: 'Dave' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

// ── tests ───────────────────────────────────────────────────────────────────

describe('useInfiniteListQuery', () => {
  describe('Rendering / initial load', () => {
    it('returns empty data while loading on first render', async () => {
      let resolveQuery: (v: PaginatedResponse<Item>) => void
      const queryFn = vi.fn(
        () =>
          new Promise<PaginatedResponse<Item>>(r => {
            resolveQuery = r
          })
      )
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toEqual([])

      // unblock
      act(() => resolveQuery(makePage(page1Items, 1, 1)))
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('loads first page and exposes flattened data', async () => {
      const queryFn = vi.fn().mockResolvedValue(makePage(page1Items, 1, 1))
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.data).toHaveLength(2))
      expect(result.current.data).toEqual(page1Items)
    })

    it('exposes total from the first page', async () => {
      const response = { ...makePage(page1Items, 1, 3), total: 100 }
      const queryFn = vi.fn().mockResolvedValue(response)
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.total).toBe(100))
    })
  })

  describe('Pagination — getNextPageParam', () => {
    it('hasNextPage is true when page < totalPages', async () => {
      const queryFn = vi.fn().mockResolvedValue(makePage(page1Items, 1, 2))
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.hasNextPage).toBe(true))
    })

    it('hasNextPage is false when page === totalPages', async () => {
      const queryFn = vi.fn().mockResolvedValue(makePage(page1Items, 1, 1))
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.hasNextPage).toBe(false))
    })

    it('fetchNextPage loads page 2 and appends it', async () => {
      const queryFn = vi
        .fn()
        .mockResolvedValueOnce(makePage(page1Items, 1, 2))
        .mockResolvedValueOnce(makePage(page2Items, 2, 2))
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.data).toHaveLength(2))
      expect(result.current.hasNextPage).toBe(true)

      await act(async () => {
        result.current.fetchNextPage()
      })

      await waitFor(() => expect(result.current.data).toHaveLength(4))
      expect(result.current.data).toEqual([...page1Items, ...page2Items])
      expect(result.current.hasNextPage).toBe(false)
    })

    it('passes the correct page param to queryFn on page 2', async () => {
      const queryFn = vi
        .fn()
        .mockResolvedValueOnce(makePage(page1Items, 1, 2))
        .mockResolvedValueOnce(makePage(page2Items, 2, 2))
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.data).toHaveLength(2))
      await act(async () => {
        result.current.fetchNextPage()
      })
      await waitFor(() => expect(result.current.data).toHaveLength(4))

      const secondCall = queryFn.mock.calls[1][0]
      expect(secondCall.page).toBe(2)
    })
  })

  describe('Deduplication', () => {
    it('deduplicates items with the same id across pages', async () => {
      // page 2 repeats id '2' from page 1 (race condition / overlap scenario)
      const overlapPage2: Item[] = [
        { id: '2', name: 'Bob (dup)' },
        { id: '3', name: 'Carol' },
      ]
      const queryFn = vi
        .fn()
        .mockResolvedValueOnce(makePage(page1Items, 1, 2))
        .mockResolvedValueOnce(makePage(overlapPage2, 2, 2))
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.hasNextPage).toBe(true))
      await act(async () => {
        result.current.fetchNextPage()
      })

      await waitFor(() =>
        expect(result.current.data.map(d => d.id)).toEqual(['1', '2', '3'])
      )
    })

    it('keeps first occurrence when id duplicates (page1 wins)', async () => {
      const overlapPage2: Item[] = [{ id: '2', name: 'Bob (overwritten)' }]
      const queryFn = vi
        .fn()
        .mockResolvedValueOnce(makePage(page1Items, 1, 2))
        .mockResolvedValueOnce(makePage(overlapPage2, 2, 2))
      const { wrapper } = makeWrapper()

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      await waitFor(() => expect(result.current.hasNextPage).toBe(true))
      await act(async () => {
        result.current.fetchNextPage()
      })
      await waitFor(() => expect(result.current.data).toHaveLength(2))

      const bob = result.current.data.find(d => d.id === '2')
      expect(bob?.name).toBe('Bob') // original wins
    })
  })

  describe('enabled gate', () => {
    it('does not call queryFn when enabled=false', async () => {
      const queryFn = vi.fn()
      const { wrapper } = makeWrapper()

      renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
            enabled: false,
          }),
        { wrapper }
      )

      // Wait a tick to ensure no async call was made
      await new Promise(r => setTimeout(r, 50))
      expect(queryFn).not.toHaveBeenCalled()
    })

    it('starts fetching when enabled switches from false to true', async () => {
      const queryFn = vi.fn().mockResolvedValue(makePage(page1Items, 1, 1))
      const { wrapper } = makeWrapper()

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
            enabled,
          }),
        { wrapper, initialProps: { enabled: false } }
      )

      expect(queryFn).not.toHaveBeenCalled()

      await act(async () => {
        rerender({ enabled: true })
      })
      await waitFor(() => expect(result.current.data).toHaveLength(2))
      expect(queryFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error handling', () => {
    it('surfaces the error message when queryFn rejects', async () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('Network error'))
      const { wrapper } = makeWrapper()

      // Suppress the uncaught error from useInfiniteQuery in test output.
      // React Testing Library v14 captures it in result.current (not thrown).
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 2,
          }),
        { wrapper }
      )

      // @tanstack/react-query surfaces the error via result.current.error (string)
      // when retry=false and the query fn rejects.
      await waitFor(() => {
        // result.current may be null if RTL's error boundary caught it; guard.
        expect(result.current?.error).toBe('Network error')
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Search / filter params forwarding', () => {
    it('passes search, pageSize, and filters to queryFn', async () => {
      const queryFn = vi.fn().mockResolvedValue(makePage(page1Items, 1, 1))
      const { wrapper } = makeWrapper()

      renderHook(
        () =>
          useInfiniteListQuery<Item>({
            queryKey: ['items'],
            queryFn,
            pageSize: 5,
            search: 'alice',
            filters: { status: 'ativo' },
          }),
        { wrapper }
      )

      await waitFor(() => expect(queryFn).toHaveBeenCalled())
      const call = queryFn.mock.calls[0][0]
      expect(call.pageSize).toBe(5)
      expect(call.search).toBe('alice')
      expect(call.filters).toEqual({ status: 'ativo' })
    })
  })
})
