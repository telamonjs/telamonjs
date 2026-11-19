'use client'

import React, { useEffect, useRef } from 'react'
import { SortField } from '../../types/pagination'

export interface UseServerSideSyncOptions {
  manualPagination: boolean
  storeColumnFilters: Record<string, unknown>
  storeGlobalFilter: string
  storeSorting: SortField[]
  onColumnFiltersChange?: (filters: Record<string, unknown>) => void
  onSearchChange?: (search: string) => void
  onSortChange?: (sorting: SortField[]) => void
}

/**
 * Notifies the parent about store changes when server-side mode is enabled:
 * - column filter changes (deduplicated via JSON snapshot)
 * - global search changes (debounced 300ms, exposes isSearching)
 * - sorting changes
 *
 * @internal Extracted from DataTable.tsx (server-side notification effects)
 */
export function useServerSideSync({
  manualPagination,
  storeColumnFilters,
  storeGlobalFilter,
  storeSorting,
  onColumnFiltersChange,
  onSearchChange,
  onSortChange,
}: UseServerSideSyncOptions): { isSearching: boolean } {
  // The last filter value actually sent to the parent (updated by the
  // debounced effect below, right after calling onSearchChange). isSearching
  // is derived from comparing this to the current store value — no
  // standalone "am I searching" state to keep in sync via an effect.
  const [lastSentFilter, setLastSentFilter] = React.useState(storeGlobalFilter)

  // Notify parent about filter changes (server-side)
  const lastNotifiedFilters = useRef<string>('')
  useEffect(() => {
    if (manualPagination && onColumnFiltersChange) {
      const filtersJson = JSON.stringify(storeColumnFilters)
      if (filtersJson !== lastNotifiedFilters.current) {
        lastNotifiedFilters.current = filtersJson
        onColumnFiltersChange(storeColumnFilters)
      }
    }
  }, [storeColumnFilters, manualPagination, onColumnFiltersChange])

  // Notify parent about search changes (server-side), debounced. The effect
  // only schedules/clears the timeout; the setState it performs happens
  // inside that async callback, not synchronously in the effect body.
  useEffect(() => {
    if (manualPagination && onSearchChange) {
      const timeoutId = setTimeout(() => {
        onSearchChange(storeGlobalFilter)
        setLastSentFilter(storeGlobalFilter)
      }, 300) // Debounce 300ms
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [storeGlobalFilter, manualPagination, onSearchChange])

  // Notify parent about sort changes (server-side)
  useEffect(() => {
    if (manualPagination && onSortChange && storeSorting.length > 0) {
      onSortChange(storeSorting)
    }
  }, [storeSorting, manualPagination, onSortChange])

  const isSearching =
    Boolean(manualPagination && onSearchChange) &&
    storeGlobalFilter !== lastSentFilter

  return { isSearching }
}
