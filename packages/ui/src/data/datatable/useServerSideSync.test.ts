import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useServerSideSync } from './useServerSideSync'

describe('useServerSideSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isSearching', () => {
    it('is false on mount (nothing has changed yet)', () => {
      const onSearchChange = vi.fn()
      const { result } = renderHook(() =>
        useServerSideSync({
          manualPagination: true,
          storeColumnFilters: {},
          storeGlobalFilter: '',
          storeSorting: [],
          onSearchChange,
        })
      )

      expect(result.current.isSearching).toBe(false)
    })

    it('flips true immediately when the search value changes', () => {
      const onSearchChange = vi.fn()
      const { result, rerender } = renderHook(
        ({ storeGlobalFilter }) =>
          useServerSideSync({
            manualPagination: true,
            storeColumnFilters: {},
            storeGlobalFilter,
            storeSorting: [],
            onSearchChange,
          }),
        { initialProps: { storeGlobalFilter: '' } }
      )

      expect(result.current.isSearching).toBe(false)

      rerender({ storeGlobalFilter: 'acme' })
      expect(result.current.isSearching).toBe(true)
    })

    it('goes false again after the 300ms debounce fires', () => {
      const onSearchChange = vi.fn()
      const { result, rerender } = renderHook(
        ({ storeGlobalFilter }) =>
          useServerSideSync({
            manualPagination: true,
            storeColumnFilters: {},
            storeGlobalFilter,
            storeSorting: [],
            onSearchChange,
          }),
        { initialProps: { storeGlobalFilter: '' } }
      )

      rerender({ storeGlobalFilter: 'acme' })
      expect(result.current.isSearching).toBe(true)

      vi.advanceTimersByTime(300)
      rerender({ storeGlobalFilter: 'acme' })

      expect(onSearchChange).toHaveBeenCalledWith('acme')
      expect(result.current.isSearching).toBe(false)
    })

    it('stays false when manualPagination is off', () => {
      const onSearchChange = vi.fn()
      const { result, rerender } = renderHook(
        ({ storeGlobalFilter }) =>
          useServerSideSync({
            manualPagination: false,
            storeColumnFilters: {},
            storeGlobalFilter,
            storeSorting: [],
            onSearchChange,
          }),
        { initialProps: { storeGlobalFilter: '' } }
      )

      rerender({ storeGlobalFilter: 'acme' })
      expect(result.current.isSearching).toBe(false)
      vi.advanceTimersByTime(300)
      expect(onSearchChange).not.toHaveBeenCalled()
    })
  })
})
