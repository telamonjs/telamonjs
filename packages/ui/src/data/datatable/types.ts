import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { SortField } from '../../types/pagination'
import { ColumnFilterConfig } from '../../types/filters'
import { DataTableActionsConfig } from '../../types/actions'
import { BulkAction } from '../BulkActionsToolbar'
import { QueryBuilderField } from '../QueryBuilder'
import { PDFExportOptions } from '../exportUtils'

/**
 * DataTableProps - Configuration for DataTable component
 *
 * @category Data
 *
 * @description
 * Comprehensive props interface for the DataTable component. Supports advanced features
 * like server-side pagination, multi-sort, query builder, bulk actions, expandable rows,
 * and mobile-responsive card views.
 */
export interface DataTableProps<TData, TValue> {
  /** TanStack Table column definitions. Required. */
  columns: ColumnDef<TData, TValue>[]

  /** Data array to display. For server-side pagination, pass current page data only. */
  data: TData[]

  /** Unique table ID for Zustand store. Defaults to pathname if not provided. */
  tableId?: string

  /** Table title displayed above the toolbar */
  title?: string

  /** Description text displayed below the title */
  description?: string

  // Search & Filters
  /** Placeholder text for global search input. Default: 'Buscar...' */
  searchPlaceholder?: string

  /** Enable global search functionality. Default: true */
  enableSearch?: boolean

  /** Enable column filters section. Default: true */
  enableFilters?: boolean

  /** Server-side filter options per column. Object with column ID as key. */
  filterOptions?: ColumnFilterConfig

  // Export
  /** Enable export functionality. Default: true */
  enableExport?: boolean

  /** Export formats to enable. Default: ['excel', 'csv', 'pdf'] */
  exportFormats?: Array<'excel' | 'csv' | 'pdf'>

  /** Base filename for exports (without extension). Default: 'export' */
  exportFilename?: string

  /** PDF export options (orientation, page size, etc.). */
  exportPdfOptions?: Omit<PDFExportOptions, 'filename' | 't' | 'locale'>

  // Saved Views
  /** Enable saved views functionality (save/load column visibility, sorting, filters). Default: false */
  enableSavedViews?: boolean

  /** Name of default view to load on mount */
  defaultView?: string

  // Toolbar Actions
  /** Enable "Add" button. Default: true */
  enableAdd?: boolean

  /** Enable "Refresh" button. Default: true */
  enableRefresh?: boolean

  /** Enable column visibility toggle. Default: true */
  enableColumnVisibility?: boolean

  /** Enable row selection (internal). Default: false */
  enableSelection?: boolean

  /** Enable pagination controls. Default: true */
  enablePagination?: boolean

  /** Initial page size. Default: 10 */
  pageSize?: number

  /** Read-only mode (disables add/edit actions). Default: false */
  readOnly?: boolean

  /** Loading state (shows skeleton). Default: false */
  loading?: boolean

  /** Error message to display */
  error?: string

  /** Title for empty state. Default: 'Nenhum item encontrado' */
  emptyTitle?: string

  /** Description for empty state. Default: 'Tente ajustar os filtros ou adicione novos itens.' */
  emptyDescription?: string

  // Callbacks
  /** Callback when "Add" button is clicked. Defaults to `router.push('${pathname}/adicionar')` */
  onAdd?: () => void

  /** Callback when "Refresh" button is clicked */
  onRefresh?: () => void

  /** Callback when "Export" button is clicked (legacy, use `ExportMenu` instead) */
  onExport?: () => void

  /**
   * Callback when row is clicked. **Without it, a row click navigates to
   * `${pathname}/${row.id}`** (unless `readOnly` or `rowClickNavigation={false}`).
   */
  onRowClick?: (row: TData) => void

  /**
   * Default row-click navigation to `${pathname}/${row.id}` when there is no `onRowClick`.
   * Set `false` for lists without a detail route (e.g. hub tabs). Default: `true`.
   */
  rowClickNavigation?: boolean

  /** Custom className for container div */
  className?: string

  // Advanced Features
  /** Enable density toggle (compact/comfortable/spacious). Default: true */
  enableDensity?: boolean

  /**
   * Initial density (store viewMode) applied on the first initialization
   * of the tableId. Default: 'comfortable' (datatable-store default). If the
   * tableId was already initialized (e.g. by ListPage), the prop does not override it.
   */
  defaultDensity?: ViewMode

  /** Enable fullscreen toggle. Default: false */
  enableFullscreen?: boolean

  /** Enable bulk actions toolbar when rows are selected. Default: false */
  enableBulkActions?: boolean

  /** Bulk actions configuration (delete, export, etc.) */
  bulkActions?: BulkAction<TData>[]

  /** Enable row selection checkboxes. Default: false */
  enableRowSelection?: boolean

  // Header Actions
  /** Custom action buttons to display in toolbar */
  headerActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
    loading?: boolean
  }>

  // Mobile Features
  /** Enable mobile card view on small screens. Default: true */
  enableMobileCards?: boolean

  /** Default view mode (table or cards). Default: 'table' */
  defaultViewMode?: 'table' | 'cards'

  /** Actions to display in mobile cards */
  cardActions?: Array<{
    label: string
    onClick: (data: TData) => void
    variant?: 'default' | 'destructive'
  }>

  /** Custom card component for mobile view */
  cardComponent?: React.ComponentType<{
    data: TData
    onClick?: (data: TData) => void
  }>

  // Server-side Pagination
  /** Enable server-side pagination (manual control). Default: false */
  manualPagination?: boolean

  /** Total page count (for server-side pagination) */
  pageCount?: number

  /** Current page number (1-indexed, for server-side pagination) */
  currentPage?: number

  /** Total items count (for server-side pagination) */
  totalItems?: number

  /** Callback when pagination changes. `(page: number, pageSize: number) => void` */
  onPaginationChange?: (page: number, pageSize: number) => void

  /** Callback when global search changes (debounced 300ms). Server-side only. */
  onSearchChange?: (search: string) => void

  /** Callback when sorting changes. Server-side only. */
  onSortChange?: (sorting: SortField[]) => void

  /** Callback when column filters change. Server-side only. */
  onColumnFiltersChange?: (filters: Record<string, unknown>) => void

  // Multi-sort Options
  /** Enable multi-column sorting (automatic stacking). Default: true */
  enableMultiSort?: boolean

  // Actions Column
  /** Enable actions column (auto-injected if not present). Default: true */
  enableActions?: boolean

  /** Full actions configuration. */
  actionsConfig?: DataTableActionsConfig<TData>

  // Query Builder (Advanced Filters)
  /** Enable visual query builder for advanced filtering. Default: false */
  enableQueryBuilder?: boolean

  /** Fields available for query builder (field definitions) */
  queryBuilderFields?: QueryBuilderField[]

  /** Callback when query builder changes (returns Prisma where object) */
  onQueryBuilderChange?: (where: Record<string, unknown> | undefined) => void

  // Expandable Rows
  /** Enable row expansion (click chevron to expand row). Default: false */
  enableExpandableRows?: boolean

  /** Content to render when row is expanded */
  expandableRowContent?: (row: TData) => React.ReactNode

  /** Hide the toolbar (search, filters, actions). Use when an external toolbar controls the table. */
  hideToolbar?: boolean

  /** Hide the title and description section above the toolbar. */
  hideTitleSection?: boolean
}

/**
 * ViewMode - Density options for table rows
 *
 * @category Data
 */
export type ViewMode = 'comfortable' | 'compact' | 'spacious'

/** Internal alias for the toolbar custom action items (same shape as DataTableProps['headerActions']). */
export type DataTableHeaderActions<TData, TValue> = NonNullable<
  DataTableProps<TData, TValue>['headerActions']
>

/** Internal alias for mobile card actions (same shape as DataTableProps['cardActions']). */
export type DataTableCardActions<TData, TValue> = NonNullable<
  DataTableProps<TData, TValue>['cardActions']
>
