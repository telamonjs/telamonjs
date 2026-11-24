'use client'

import type { ComponentType, ReactNode } from 'react'
import type { CrudConfigWithAnyForm, ListQueryState } from '../../types/crud'
import type { ColumnFilterConfig } from '../../types/filters'
import type { BulkAction } from '../../data/BulkActionsToolbar'

/**
 * ListPageProps - props of `ListPage`. Everything about the module (columns,
 * form, data, mutations, dialogs) lives in `config`; the other props only
 * tune how this page instance behaves.
 *
 * @category Pages
 */
export interface ListPageProps<TData> {
  /**
   * Complete CRUD configuration: module, list (columns, search, filters),
   * form, `query` (React Query `queryFn`), `mutations` and dialogs.
   *
   * @see {@link CrudConfig} for the interface definition
   */
  config: CrudConfigWithAnyForm<TData>

  /** Unique table ID for Zustand store. Defaults to config.module.route if not provided. */
  tableId?: string

  /**
   * Enable URL synchronization: page, page size, sort and search are kept in
   * the query params, and a link carrying them opens the list in that state.
   * With infinite scroll (the default), page and page size are left out.
   */
  urlSync?: boolean

  /**
   * Custom filters to extract from URL (when urlSync=true).
   * Example: `{ clienteId: 'string', status: 'string' }`
   */
  urlFilters?: Record<string, 'string' | 'number'>

  /** Custom card component for mobile view */
  cardComponent?: ComponentType<{
    data: TData
    onClick?: (data: TData) => void
  }>

  /** Custom className for container div */
  className?: string

  /**
   * Optional callback for custom refresh logic (e.g., revalidate dependencies).
   * Called AFTER revalidatePath() and handleLoadData().
   */
  onRefreshAction?: () => Promise<void | { success: boolean }>

  /** Static server-side filter options per column. Object with column ID as key. */
  filterOptions?: ColumnFilterConfig

  /** Dynamic filter options loader. Called on mount to fetch filter options from backend. */
  loadFilterOptions?: () => Promise<ColumnFilterConfig>

  /** Enable bulk actions toolbar when rows are selected. Default: false */
  enableBulkActions?: boolean

  /** Bulk actions configuration (delete, export, etc.) */
  bulkActions?: BulkAction<TData>[]

  /** Custom action buttons to display in toolbar */
  headerActions?: Array<{
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
    loading?: boolean
  }>

  /** Disable automatic refresh on focus/visibility change. Default: true */
  disableAutoRefresh?: boolean

  /**
   * Enable ErrorBoundary wrapping. Default: true
   * Set to false to disable automatic error boundary.
   */
  errorBoundary?: boolean

  /**
   * Custom fallback component for ErrorBoundary.
   * If not provided, uses DefaultErrorFallback.
   */
  errorFallback?: ReactNode

  /** Custom React content to render BEFORE search in the embedded TabToolbar (e.g. DateRange picker) */
  toolbarPrepend?: ReactNode

  /**
   * Custom React content to render inside the embedded TabToolbar (after filters, before Spacer).
   * Pass a function to receive the list's current query (`ListQueryState`) — e.g. an export/PDF
   * button that must fetch exactly what the list shows.
   */
  toolbarContent?: ReactNode | ((state: ListQueryState) => ReactNode)

  /**
   * Second level of the toolbar: content of the "Filters" popover
   * (selects of client, period…). The button shows how many `activeFilters`.
   */
  filtersPanel?: ReactNode

  /** Active filters of `filtersPanel`, shown as removable chips under the toolbar */
  activeFilters?: ActiveFilterChip[]

  /** "Clear filters" next to the chips: resets the `filtersPanel` filters */
  onClearFilters?: () => void

  /** Extra content in the list status bar, after "N of M" (infinite scroll), e.g. totals of the filter */
  footerContent?: ReactNode

  /** When true, hides DataTable toolbar and title, removes container wrapper. Use when the table is rendered inside a container with an embedded toolbar. */
  embedded?: boolean

  /**
   * Dialog ↔ URL sync (`dialogs.<type>.urlParam`). Pass `false` when this
   * ListPage is rendered INSIDE another ListPage's dialog that already owns
   * the same param (e.g. tabs of a workspace opened via the parent's
   * `?view=<id>`) — otherwise the child reads the parent's id as if it were
   * its own and opens a 404 dialog.
   * @default true
   */
  dialogUrlSync?: boolean
}

/** Removable chip of an active filter (ListPage `activeFilters`) */
export interface ActiveFilterChip {
  key: string
  /** e.g. "Customer: ACME" */
  label: string
  onRemove: () => void
}

// Lives with ListConfig (`list.onExport` receives it); re-exported for existing imports
export type { ListQueryState } from '../../types/crud'
