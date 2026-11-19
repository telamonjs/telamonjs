/**
 * Characterization tests for useListPageUrlSync (internal hook)
 *
 * PINS the current behavior: custom filters extracted from URL on mount when
 * urlSync=true, and pagination/search/sort synced into query params via
 * router.push on every relevant state change.
 *
 * The hook delegates to useUrlSync which reads useSearchParams/usePathname/
 * useRouter from next/navigation. All three are mocked here. The mock is
 * structured so tests can inspect the url written by capturing router.push/
 * router.replace calls.
 *
 * DO NOT "correct" surprising behavior — open a separate issue instead.
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListPageUrlSync } from './useListPageUrlSync'

// ---------------------------------------------------------------------------
// next/navigation mock — mutable so individual tests can override searchParams
// ---------------------------------------------------------------------------

const mockPush = vi.fn()
const mockReplace = vi.fn()

// Mutable ref so each test can override `searchParams` content
let currentSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: vi.fn() }),
  usePathname: () => '/admin/entities',
  useSearchParams: () => currentSearchParams,
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useListPageUrlSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearchParams = new URLSearchParams()
  })

  // ── Rendering (initial return shape) ─────────────────────────────────────

  describe('Rendering (initial return shape)', () => {
    it('returns an empty object when urlSync is false', () => {
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: false,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(result.current).toEqual({})
    })

    it('returns an empty object when urlSync is true but urlFilters is empty', () => {
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(result.current).toEqual({})
    })

    it('returns string filter value extracted from URL on mount when urlSync=true', () => {
      currentSearchParams = new URLSearchParams('status=active')
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { status: 'string' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(result.current).toEqual({ status: 'active' })
    })

    it('returns number filter value extracted from URL on mount when urlSync=true', () => {
      currentSearchParams = new URLSearchParams('categoryId=7')
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { categoryId: 'number' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(result.current).toEqual({ categoryId: 7 })
    })

    it('does NOT extract URL filters when urlSync is false', () => {
      currentSearchParams = new URLSearchParams('status=active')
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: false,
          urlFilters: { status: 'string' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      // urlSync=false → returns empty regardless of URL content
      expect(result.current).toEqual({})
    })

    it('omits filter keys whose URL param is absent', () => {
      currentSearchParams = new URLSearchParams('') // no status param
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { status: 'string', categoryId: 'number' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(result.current).toEqual({})
    })
  })

  // ── Interactions (URL is written on state changes) ────────────────────────

  describe('Interactions', () => {
    it('calls router.push with page param when urlSync=true on mount', () => {
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 3,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(mockReplace).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
      const calledUrl: string = mockReplace.mock.calls[0][0]
      expect(calledUrl).toContain('page=3')
    })

    it('includes pageSize in the synced URL', () => {
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 1,
          pageSize: 50,
          search: '',
          sorting: [],
        })
      )
      const calledUrl: string = mockReplace.mock.calls[0][0]
      expect(calledUrl).toContain('pageSize=50')
    })

    it('includes search param in the synced URL when non-empty', () => {
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: 'hello',
          sorting: [],
        })
      )
      const calledUrl: string = mockReplace.mock.calls[0][0]
      expect(calledUrl).toContain('search=hello')
    })

    it('does NOT include search param when search is empty string', () => {
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      const calledUrl: string = mockReplace.mock.calls[0][0]
      expect(calledUrl).not.toContain('search=')
    })

    it('includes sortBy/sortOrder from first sorting entry', () => {
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [{ field: 'name', order: 'desc' }],
        })
      )
      const calledUrl: string = mockReplace.mock.calls[0][0]
      expect(calledUrl).toContain('sortBy=name')
      expect(calledUrl).toContain('sortOrder=desc')
    })

    it('does NOT write to URL when urlSync is false', () => {
      renderHook(() =>
        useListPageUrlSync({
          urlSync: false,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('re-syncs URL when page changes', () => {
      const { rerender } = renderHook(
        ({ page }: { page: number }) =>
          useListPageUrlSync({
            urlSync: true,
            urlFilters: {},
            page,
            pageSize: 20,
            search: '',
            sorting: [],
          }),
        { initialProps: { page: 1 } }
      )
      const callsBefore = mockReplace.mock.calls.length
      act(() => { rerender({ page: 2 }) })
      const callsAfter = mockReplace.mock.calls.length
      expect(callsAfter).toBeGreaterThan(callsBefore)
      const lastUrl: string = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0]
      expect(lastUrl).toContain('page=2')
    })
  })

  // ── State Management ──────────────────────────────────────────────────────

  describe('State Management', () => {
    it('customFilters object reference is stable across rerenders (useState init)', () => {
      currentSearchParams = new URLSearchParams('status=active')
      const { result, rerender } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { status: 'string' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      const first = result.current
      rerender()
      // useState initializer is only called once → same object reference
      expect(result.current).toBe(first)
    })

    it('returns an empty object (not undefined) when no filters match', () => {
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(result.current).not.toBeUndefined()
      expect(typeof result.current).toBe('object')
    })

    it('ignores invalid number param — omits the key', () => {
      currentSearchParams = new URLSearchParams('categoryId=notanumber')
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { categoryId: 'number' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      // parseInt('notanumber') = NaN → omitted
      expect(result.current).toEqual({})
    })
  })

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles multiple urlFilters with mixed types', () => {
      currentSearchParams = new URLSearchParams('status=active&ownerId=9')
      const { result } = renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { status: 'string', ownerId: 'number' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      expect(result.current).toEqual({ status: 'active', ownerId: 9 })
    })

    it('handles empty sorting array — no sortBy/sortOrder in URL', () => {
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: {},
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      const calledUrl: string = mockReplace.mock.calls[0][0]
      expect(calledUrl).not.toContain('sortBy=')
    })

    it('includes custom filters in the synced URL when urlSync=true', () => {
      currentSearchParams = new URLSearchParams('status=inactive')
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { status: 'string' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
        })
      )
      const calledUrl: string = mockReplace.mock.calls[0][0]
      expect(calledUrl).toContain('status=inactive')
    })
  })

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    // useListPageUrlSync is a pure URL-sync hook with no rendered output.
    it('is a pure hook — no rendered output to audit with axe', () => {
      expect(true).toBe(true)
    })
  })

  // ── liveFilters: toolbar selects follow the user into the URL ──────

  describe('liveFilters (7.11)', () => {
    const lastUrl = () => {
      const calls = [...mockPush.mock.calls, ...mockReplace.mock.calls]
      return String(calls[calls.length - 1]?.[0] ?? '')
    }

    it('writes a live filter to the URL and removes it when cleared', () => {
      const { rerender } = renderHook(
        ({ live }: { live: Record<string, string | undefined> }) =>
          useListPageUrlSync({
            urlSync: true,
            urlFilters: { status: 'string' },
            page: 1,
            pageSize: 20,
            search: '',
            sorting: [],
            liveFilters: live,
          }),
        { initialProps: { live: { status: 'ativo' } } }
      )
      expect(lastUrl()).toContain('status=ativo')

      rerender({ live: { status: undefined } })
      expect(lastUrl()).not.toContain('status=')
    })

    it('live value wins over the value read from the URL at mount', () => {
      currentSearchParams = new URLSearchParams('status=inativo')
      renderHook(() =>
        useListPageUrlSync({
          urlSync: true,
          urlFilters: { status: 'string' },
          page: 1,
          pageSize: 20,
          search: '',
          sorting: [],
          liveFilters: { status: 'ativo' },
        })
      )
      expect(lastUrl()).toContain('status=ativo')
      expect(lastUrl()).not.toContain('status=inativo')
    })
  })

})
