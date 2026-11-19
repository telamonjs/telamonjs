'use client'

import React, { useCallback } from 'react'
import { Table, VisibilityState } from '@tanstack/react-table'
import { SortField } from '../../types/pagination'
import { SavedView } from '../viewsManager'
import { QueryGroup, buildPrismaWhere } from '../queryBuilderUtils'

export interface UseSavedViewsControlOptions<TData> {
  table: Table<TData>
  columnVisibility: VisibilityState
  storeSorting: SortField[]
  storeGlobalFilter: string
  storeColumnFilters: Record<string, unknown>
  queryGroup: QueryGroup
  setQueryGroup: React.Dispatch<React.SetStateAction<QueryGroup>>
  setColumnVisibility: (visibility: VisibilityState) => void
  setStoreSorting: (sorting: SortField[]) => void
  setGlobalFilter: (filter: string) => void
  clearColumnFilters: () => void
  onQueryBuilderChange?: (where: Record<string, unknown> | undefined) => void
}

export interface SavedViewsControl {
  handleLoadView: (view: SavedView) => void
  handleResetToDefault: () => void
  getCurrentViewConfig: () => SavedView['config']
}

/**
 * Saved views handlers: load a saved view into the store, reset to the
 * default state, and snapshot the current configuration for saving.
 *
 * @internal Extracted from DataTable.tsx (saved views handlers)
 */
export function useSavedViewsControl<TData>({
  table,
  columnVisibility,
  storeSorting,
  storeGlobalFilter,
  storeColumnFilters,
  queryGroup,
  setQueryGroup,
  setColumnVisibility,
  setStoreSorting,
  setGlobalFilter,
  clearColumnFilters,
  onQueryBuilderChange,
}: UseSavedViewsControlOptions<TData>): SavedViewsControl {
  // Saved Views handlers
  const handleLoadView = useCallback(
    (view: SavedView) => {
      // Apply column visibility
      setColumnVisibility(view.config.columnVisibility)

      // Apply sorting
      setStoreSorting(view.config.sorting)

      // Apply filters
      if (view.config.filters.search) {
        setGlobalFilter(view.config.filters.search)
      }
      if (view.config.filters.queryBuilder) {
        setQueryGroup(view.config.filters.queryBuilder)
        if (onQueryBuilderChange) {
          const where = buildPrismaWhere(view.config.filters.queryBuilder)
          onQueryBuilderChange(where)
        }
      }
    },
    [
      setColumnVisibility,
      setStoreSorting,
      setGlobalFilter,
      setQueryGroup,
      onQueryBuilderChange,
    ]
  )

  const handleResetToDefault = useCallback(() => {
    // Reset to initial state
    setColumnVisibility({})
    setStoreSorting([])
    setGlobalFilter('')
    clearColumnFilters()
    setQueryGroup({ logic: 'AND', conditions: [] })
    if (onQueryBuilderChange) {
      onQueryBuilderChange(undefined)
    }
  }, [
    setColumnVisibility,
    setStoreSorting,
    setGlobalFilter,
    clearColumnFilters,
    setQueryGroup,
    onQueryBuilderChange,
  ])

  // Get current view config for saving
  const getCurrentViewConfig = useCallback((): SavedView['config'] => {
    return {
      columnVisibility,
      columnOrder: table.getAllColumns().map(col => col.id),
      columnSizing: {},
      sorting: storeSorting,
      filters: {
        search: storeGlobalFilter,
        queryBuilder: queryGroup.conditions.length > 0 ? queryGroup : undefined,
        columnFilters: storeColumnFilters,
      },
    }
  }, [
    columnVisibility,
    table,
    storeSorting,
    storeGlobalFilter,
    queryGroup,
    storeColumnFilters,
  ])

  return { handleLoadView, handleResetToDefault, getCurrentViewConfig }
}
