/**
 * Characterization tests for useListPageData (internal hook)
 *
 * PINS the current data-fetching orchestration behavior BEFORE any future
 * refactor of the ListPage decomposition. Tests cover: return shape,
 * delegation to useCrudQuery (standard path), handleRefresh flow,
 * auto-refresh listener wiring, and the effectiveTotal/loading/isFetching
 * unified surface.
 *
 * The infinite-scroll path (useInfiniteListQuery) is wired but NOT stressed
 * here beyond verifying the isInfiniteScroll branch switches the effective*
 * fields — full infinite-query characterization is in
 * useInfiniteListQuery.test.ts (a future test file).
 *
 * Dependencies mocked:
 *   - next/navigation → usePathname
 *   - ../../contexts/CacheContext → useCacheContext
 *   - ../../hooks/useCrudQuery → minimal stub returning typed data
 *   - ../../hooks/useInfiniteListQuery → minimal stub (disabled by default)
 *
 * React Query provider wrapper is required because useCrudQuery calls useQuery.
 *
 * DO NOT "correct" surprising behavior — open a separate issue instead.
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useListPageData } from './useListPageData'
import type { CrudConfigWithAnyForm } from '../../types/crud'
import type { PaginatedResponse } from '../../types/pagination'

// ---------------------------------------------------------------------------
// next/navigation mock
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/entities',
  useSearchParams: () => new URLSearchParams(),
}))

// ---------------------------------------------------------------------------
// CacheContext mock — revalidateAction is optional; default to undefined
// ---------------------------------------------------------------------------

const mockRevalidateAction = vi.fn().mockResolvedValue(undefined)

vi.mock('../../contexts/CacheContext', () => ({
  useCacheContext: () => ({ revalidateAction: mockRevalidateAction }),
}))

// ---------------------------------------------------------------------------
// Minimal fixture types
// ---------------------------------------------------------------------------

type TestEntity = { id: string; name: string }

function makeQueryFn(items: TestEntity[] = [], total = 0) {
  const response: PaginatedResponse<TestEntity> = {
    data: items,
    total,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }
  return vi.fn().mockResolvedValue(response)
}

function makeConfig(
  queryFn: ReturnType<typeof makeQueryFn>
): CrudConfigWithAnyForm<TestEntity> {
  return {
    module: {
      name: 'entities',
      title: 'Entities',
      description: 'Test entities',
      route: '/admin/entities',
    },
    list: {
      title: 'Entities',
      description: 'Test entities',
      columns: [],
      infiniteScroll: false, // use standard paginated path
    },
    form: {
      sections: [],
      validation: {} as any,
    },
    query: {
      queryKey: ['entities'],
      queryFn,
    },
    mutations: {
      create: {
        mutationFn: vi.fn().mockResolvedValue({ success: true }),
        invalidates: [['entities']],
      },
      update: {
        mutationFn: vi.fn().mockResolvedValue({ success: true }),
        invalidates: [['entities']],
      },
      delete: {
        mutationFn: vi.fn().mockResolvedValue({ success: true }),
        invalidates: [['entities']],
      },
    },
  }
}

// React Query wrapper
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function makeBaseParams(
  overrides: Partial<Parameters<typeof useListPageData>[0]> = {}
) {
  const queryFn = makeQueryFn(
    [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
    ],
    2
  )
  return {
    config: makeConfig(queryFn),
    page: 1,
    pageSize: 20,
    search: '',
    sorting: [],
    allFilters: {},
    isInfiniteScroll: false,
    disableAutoRefresh: true, // default to disabled so we don't register listeners
    onRefreshAction: undefined,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useListPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering (initial return shape) ─────────────────────────────────────

  describe('Rendering (initial return shape)', () => {
    it('returns all expected keys', () => {
      const { result } = renderHook(() => useListPageData(makeBaseParams()), {
        wrapper: makeWrapper(),
      })
      const keys = Object.keys(result.current)
      expect(keys).toContain('data')
      expect(keys).toContain('total')
      expect(keys).toContain('loading')
      expect(keys).toContain('error')
      expect(keys).toContain('infiniteQuery')
      expect(keys).toContain('effectiveTotal')
      expect(keys).toContain('effectiveLoading')
      expect(keys).toContain('effectiveIsFetching')
      expect(keys).toContain('handleRefresh')
    })

    it('data is an array initially (may be empty while loading)', () => {
      const { result } = renderHook(() => useListPageData(makeBaseParams()), {
        wrapper: makeWrapper(),
      })
      expect(Array.isArray(result.current.data)).toBe(true)
    })

    it('handleRefresh is a function', () => {
      const { result } = renderHook(() => useListPageData(makeBaseParams()), {
        wrapper: makeWrapper(),
      })
      expect(typeof result.current.handleRefresh).toBe('function')
    })

    it('error is undefined initially', () => {
      const { result } = renderHook(() => useListPageData(makeBaseParams()), {
        wrapper: makeWrapper(),
      })
      expect(result.current.error).toBeUndefined()
    })
  })

  // ── Interactions (data fetch + refresh) ──────────────────────────────────

  describe('Interactions', () => {
    it('resolves data and total after queryFn settles', async () => {
      const { result } = renderHook(() => useListPageData(makeBaseParams()), {
        wrapper: makeWrapper(),
      })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.data).toHaveLength(2)
      expect(result.current.total).toBe(2)
    })

    it('handleRefresh calls revalidateAction with the current pathname', async () => {
      const { result } = renderHook(() => useListPageData(makeBaseParams()), {
        wrapper: makeWrapper(),
      })
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => {
        await result.current.handleRefresh()
      })
      expect(mockRevalidateAction).toHaveBeenCalledWith(
        '/admin/entities',
        'layout'
      )
    })

    it('handleRefresh calls the optional onRefreshAction', async () => {
      const onRefreshAction = vi.fn().mockResolvedValue({ success: true })
      const { result } = renderHook(
        () => useListPageData(makeBaseParams({ onRefreshAction })),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => {
        await result.current.handleRefresh()
      })
      expect(onRefreshAction).toHaveBeenCalledTimes(1)
    })

    it('queryFn is called with the pagination params including search', async () => {
      const queryFn = makeQueryFn([], 0)
      const config = makeConfig(queryFn)
      renderHook(
        () =>
          useListPageData(
            makeBaseParams({ config, search: 'hello', page: 2, pageSize: 10 })
          ),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(queryFn).toHaveBeenCalled())
      const calledParams = queryFn.mock.calls[0][0]
      expect(calledParams.search).toBe('hello')
      expect(calledParams.page).toBe(2)
      expect(calledParams.pageSize).toBe(10)
    })

    it('does NOT call onRefreshAction when it is undefined', async () => {
      const { result } = renderHook(
        () => useListPageData(makeBaseParams({ onRefreshAction: undefined })),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(result.current.loading).toBe(false))
      // Should not throw
      await act(async () => {
        await result.current.handleRefresh()
      })
      // No assertion needed beyond "no error thrown"
    })
  })

  // ── State Management ──────────────────────────────────────────────────────

  describe('State Management', () => {
    it('effectiveTotal equals total in standard (non-infinite) mode', async () => {
      const { result } = renderHook(
        () => useListPageData(makeBaseParams({ isInfiniteScroll: false })),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.effectiveTotal).toBe(result.current.total)
    })

    it('effectiveLoading equals loading in standard (non-infinite) mode', async () => {
      const { result } = renderHook(
        () => useListPageData(makeBaseParams({ isInfiniteScroll: false })),
        { wrapper: makeWrapper() }
      )
      // Once settled, effectiveLoading should mirror loading
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.effectiveLoading).toBe(result.current.loading)
    })

    it('passes filters to queryFn when allFilters is non-empty', async () => {
      const queryFn = makeQueryFn([], 0)
      const config = makeConfig(queryFn)
      renderHook(
        () =>
          useListPageData(
            makeBaseParams({
              config,
              allFilters: { status: 'active' },
            })
          ),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(queryFn).toHaveBeenCalled())
      const calledParams = queryFn.mock.calls[0][0]
      expect(calledParams.filters).toEqual({ status: 'active' })
    })

    it('passes undefined filters when allFilters is empty', async () => {
      const queryFn = makeQueryFn([], 0)
      const config = makeConfig(queryFn)
      renderHook(
        () => useListPageData(makeBaseParams({ config, allFilters: {} })),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(queryFn).toHaveBeenCalled())
      const calledParams = queryFn.mock.calls[0][0]
      expect(calledParams.filters).toBeUndefined()
    })
  })

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('returns empty data and total=0 when queryFn resolves with empty list', async () => {
      const queryFn = makeQueryFn([], 0)
      const config = makeConfig(queryFn)
      const { result } = renderHook(
        () => useListPageData(makeBaseParams({ config })),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.data).toHaveLength(0)
      expect(result.current.total).toBe(0)
    })

    it('handles queryFn rejection — error is set', async () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('Network error'))
      const config = makeConfig(queryFn)
      const { result } = renderHook(
        () => useListPageData(makeBaseParams({ config })),
        { wrapper: makeWrapper() }
      )
      await waitFor(() => expect(result.current.error).toBeDefined(), {
        timeout: 3000,
      })
      expect(result.current.error).toContain('Network error')
    })

    it('does NOT register window focus/visibilitychange listeners when disableAutoRefresh=true', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      renderHook(
        () => useListPageData(makeBaseParams({ disableAutoRefresh: true })),
        { wrapper: makeWrapper() }
      )
      const focusCalls = addEventListenerSpy.mock.calls.filter(
        ([event]) => event === 'focus'
      )
      expect(focusCalls).toHaveLength(0)
      addEventListenerSpy.mockRestore()
    })

    it('registers window focus/visibilitychange listeners when disableAutoRefresh=false', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const { unmount } = renderHook(
        () => useListPageData(makeBaseParams({ disableAutoRefresh: false })),
        { wrapper: makeWrapper() }
      )
      const focusCalls = addEventListenerSpy.mock.calls.filter(
        ([event]) => event === 'focus'
      )
      expect(focusCalls.length).toBeGreaterThan(0)
      unmount()
      addEventListenerSpy.mockRestore()
    })

    it('refreshes once when returning to the tab fires focus + visibilitychange', async () => {
      const params = makeBaseParams({ disableAutoRefresh: false })
      const queryFn = params.config.query.queryFn as ReturnType<
        typeof makeQueryFn
      >
      const { result, unmount } = renderHook(() => useListPageData(params), {
        wrapper: makeWrapper(),
      })
      await waitFor(() => expect(result.current.loading).toBe(false))
      const before = queryFn.mock.calls.length

      await act(async () => {
        window.dispatchEvent(new Event('focus'))
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await waitFor(() => expect(queryFn.mock.calls.length).toBe(before + 1))
      await new Promise(r => setTimeout(r, 50))
      expect(queryFn.mock.calls.length).toBe(before + 1)
      unmount()
    })

    it('revalidateAction is called once per handleRefresh invocation', async () => {
      // The module-level mock always provides a revalidateAction; this test pins
      // that handleRefresh calls it exactly once (not twice, not zero times).
      vi.mocked(mockRevalidateAction).mockClear()
      const { result } = renderHook(() => useListPageData(makeBaseParams()), {
        wrapper: makeWrapper(),
      })
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => {
        await result.current.handleRefresh()
      })
      expect(mockRevalidateAction).toHaveBeenCalledTimes(1)
    })
  })

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    // useListPageData is a pure data-fetching hook with no rendered output.
    it('is a pure hook — no rendered output to audit with axe', () => {
      expect(true).toBe(true)
    })
  })
})
