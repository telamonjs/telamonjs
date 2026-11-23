'use client'

import { useMemo, useCallback, useEffect } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Updater,
  Table,
} from '@tanstack/react-table'
import { SortField } from '../../types/pagination'
import {
  useTableColumnFilters,
  useDataTableActions,
  useTableGlobalFilter,
  useTableSorting,
  useTablePageSize,
  useTableColumnVisibility,
  useTableRowSelection,
  useTableViewMode,
  useTableCurrentViewMode,
  useTableIsFullscreen,
  useTableShowFilters,
} from '../../stores/datatable-store'
import { useResponsiveViewMode } from '../../hooks/useResponsiveViewMode'
import { ViewMode } from './types'
import type { ExpandTableMeta } from './useSpecialColumns'

export interface UseDataTableInstanceOptions<TData, TValue> {
  tableId: string
  data: TData[]
  /** Final column definitions (already including injected special columns). */
  columns: ColumnDef<TData, TValue>[]
  pageSize: number
  manualPagination: boolean
  pageCount?: number
  enableMultiSort: boolean
  enableSelection: boolean
  enableSearch: boolean
  defaultViewMode: 'table' | 'cards'
  /** Initial density (store viewMode) applied on first init of this tableId. */
  defaultDensity?: ViewMode
  /** Forwarded to useReactTable `meta` (read by injected special cells). */
  expandMeta?: ExpandTableMeta
}

export interface DataTableInstance<TData> {
  table: Table<TData>
  /** TanStack-format sorting derived from the Zustand store. */
  sorting: SortingState
  /** TanStack-format column filters derived from the Zustand store. */
  columnFilters: ColumnFiltersState
  // Store data state
  storeColumnFilters: Record<string, unknown>
  storeGlobalFilter: string
  storeSorting: SortField[]
  storePageSize: number
  // Store UI state
  columnVisibility: VisibilityState
  rowSelection: Record<string, boolean>
  viewMode: ViewMode
  currentViewMode: 'table' | 'cards'
  isFullscreen: boolean
  showFilters: boolean
  // Store actions
  setStorePage: (page: number) => void
  setStorePageSize: (pageSize: number) => void
  setColumnVisibility: (visibility: VisibilityState) => void
  setRowSelection: (selection: Record<string, boolean>) => void
  setViewMode: (mode: ViewMode) => void
  setCurrentViewMode: (mode: 'table' | 'cards') => void
  toggleFullscreen: () => void
  setShowFilters: (show: boolean) => void
  setGlobalFilter: (filter: string) => void
  setStoreSorting: (sorting: SortField[]) => void
  clearColumnFilters: () => void
}

/**
 * Wires the per-table Zustand store to a TanStack Table instance.
 *
 * Owns: store selectors/actions, store -> TanStack state conversion,
 * controlled-state change handlers, table initialization, and the
 * responsive view-mode sync (cards on mobile, table on desktop).
 *
 * @internal Extracted from DataTable.tsx (state orchestration)
 */
export function useDataTableInstance<TData, TValue>({
  tableId,
  data,
  columns,
  pageSize,
  manualPagination,
  pageCount,
  enableMultiSort,
  enableSelection,
  enableSearch,
  defaultViewMode,
  defaultDensity,
  expandMeta,
}: UseDataTableInstanceOptions<TData, TValue>): DataTableInstance<TData> {
  // Get state from Zustand store
  const storeColumnFilters = useTableColumnFilters(tableId)
  const storeGlobalFilter = useTableGlobalFilter(tableId)
  const storeSorting = useTableSorting(tableId)
  const storePageSize = useTablePageSize(tableId)

  // Get UI state from store
  const columnVisibility = useTableColumnVisibility(tableId)
  const rowSelection = useTableRowSelection(tableId)
  const viewMode = useTableViewMode(tableId)
  const currentViewMode = useTableCurrentViewMode(tableId)
  const isFullscreen = useTableIsFullscreen(tableId)
  const showFilters = useTableShowFilters(tableId)

  const {
    initTable,
    setPage: setStorePage,
    setPageSize: setStorePageSize,
    setColumnVisibility,
    setRowSelection,
    setViewMode,
    setCurrentViewMode,
    toggleFullscreen,
    setShowFilters,
    setGlobalFilter,
    setSorting: setStoreSorting,
    clearColumnFilters,
  } = useDataTableActions(tableId)

  // Initialize table on mount (initTable is a no-op if the tableId already
  // exists, so defaultDensity only applies on first init — e.g. when
  // ListPage already initialized the same tableId, its init prevails)
  useEffect(() => {
    initTable(defaultDensity ? { viewMode: defaultDensity } : undefined)
  }, [initTable, defaultDensity])

  // Convert store filters to TanStack Table format
  const columnFilters: ColumnFiltersState = useMemo(() => {
    return Object.entries(storeColumnFilters).map(([id, value]) => ({
      id,
      value,
    }))
  }, [storeColumnFilters])

  // Convert store sorting to TanStack Table format
  const sorting: SortingState = useMemo(() => {
    return storeSorting.map(s => ({
      id: s.field,
      desc: s.order === 'desc',
    }))
  }, [storeSorting])

  // Auto-detect responsive view mode (cards on mobile, table on desktop)
  const responsiveMode = useResponsiveViewMode(defaultViewMode)

  // Update view mode when screen size changes
  useEffect(() => {
    setCurrentViewMode(responsiveMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responsiveMode])

  // Handlers that update Zustand store
  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater
      const sortFields: SortField[] = newSorting.map(s => ({
        field: s.id,
        order: s.desc ? ('desc' as const) : ('asc' as const),
      }))
      setStoreSorting(sortFields)
    },
    [sorting, setStoreSorting]
  )

  const handleGlobalFilterChange = useCallback(
    (value: Updater<string>) => {
      setGlobalFilter(
        typeof value === 'function' ? value(storeGlobalFilter) : value
      )
    },
    [setGlobalFilter, storeGlobalFilter]
  )

  const handleColumnVisibilityChange = useCallback(
    (updater: Updater<VisibilityState>) => {
      const newVisibility =
        typeof updater === 'function' ? updater(columnVisibility) : updater
      setColumnVisibility(newVisibility)
    },
    [columnVisibility, setColumnVisibility]
  )

  const handleRowSelectionChange = useCallback(
    (updater: Updater<Record<string, boolean>>) => {
      const newSelection =
        typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
    },
    [rowSelection, setRowSelection]
  )

  // Note: Column filters are handled directly by DataTableColumnFilter via store

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable() returns functions the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it.
  const table = useReactTable({
    data,
    columns,
    meta: expandMeta,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: storeGlobalFilter,
    },
    initialState: {
      pagination: {
        pageSize: manualPagination ? storePageSize : pageSize,
      },
    },
    // Server-side pagination configuration
    ...(manualPagination && {
      manualPagination: true,
      manualSorting: true, // Enable server-side sorting
      pageCount: pageCount,
    }),
    // Explicitly define getRowId to ensure stable keys
    getRowId: (row, index) => {
      // Try to use 'id' field if it exists, otherwise fall back to index
      const rowWithId = row as { id?: string | number }
      return rowWithId.id !== undefined ? String(rowWithId.id) : String(index)
    },
    // Multi-column sorting (automatic stacking)
    enableMultiSort: enableMultiSort,
    isMultiSortEvent: () => true, // Every click adds to sort stack
    enableRowSelection: enableSelection,
    enableGlobalFilter: enableSearch,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: () => {}, // Handled by store directly
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: handleRowSelectionChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: !manualPagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Compute the whole row-model chain (core → filtered → sorted → paginated)
  // in THIS render. TanStack wires `autoResetPageIndex` into the first
  // computation of each row model: the first call only registers (microtask),
  // later first-computations schedule `resetPageIndex()` → React setState.
  // When the child fibers (TableToolbar/TableDesktopView) are the ones doing
  // the first computation, React's time-sliced rendering (hydration, StrictMode
  // dev) can yield in between, so the setState targets a fiber that has not
  // committed yet: "Can't perform a React state update on a component that
  // hasn't mounted yet". Reading the row model here keeps every registration
  // in one task and makes the child reads cache hits.
  table.getRowModel()

  return {
    table,
    sorting,
    columnFilters,
    storeColumnFilters,
    storeGlobalFilter,
    storeSorting,
    storePageSize,
    columnVisibility,
    rowSelection,
    viewMode,
    currentViewMode,
    isFullscreen,
    showFilters,
    setStorePage,
    setStorePageSize,
    setColumnVisibility,
    setRowSelection,
    setViewMode,
    setCurrentViewMode,
    toggleFullscreen,
    setShowFilters,
    setGlobalFilter,
    setStoreSorting,
    clearColumnFilters,
  }
}
