'use client'

import React, { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '../utils'
import { Button } from '../ui/button'
import { useTelamonjsT } from '../i18n/use-t'
import { Z_INDEX } from '../constants/z-index'
import { DataTableProps } from './datatable/types'
import { useDataTableInstance } from './datatable/useDataTableInstance'
import { useServerSideSync } from './datatable/useServerSideSync'
import { useSpecialColumns } from './datatable/useSpecialColumns'
import { useQueryBuilderControl } from './datatable/useQueryBuilderControl'
import { useSavedViewsControl } from './datatable/useSavedViewsControl'
import { TableToolbar } from './datatable/TableToolbar'
import { TableFiltersPanel } from './datatable/TableFiltersPanel'
import { TableDesktopView } from './datatable/TableDesktopView'
import { TableCardsView } from './datatable/TableCardsView'
import { TableFooter } from './datatable/TableFooter'

export type { DataTableProps, DataTableExportMenuProps } from './datatable/types'

/**
 * DataTable - Advanced data table component with TanStack Table
 *
 * @category Data
 * @status stable
 *
 * @description
 * Production-ready data table component powered by TanStack Table v8, Zustand state management,
 * and Framer Motion animations. Supports advanced features like server-side pagination, multi-sort,
 * column filters, query builder, bulk actions, expandable rows, and mobile-responsive card views.
 *
 * **Key Features:**
 * - **Auto-pagination detection:** Automatically detects server-side vs client-side pagination
 * - **Multi-column sorting:** Stack sorts by clicking headers (numbered badges)
 * - **Advanced filters:** Column filters + visual query builder (Prisma where generation)
 * - **Bulk actions:** Select rows and perform batch operations
 * - **Export:** Excel, CSV, PDF with customizable options
 * - **Saved views:** Save/load column visibility, sorting, and filters
 * - **Mobile-responsive:** Auto-switches to card view on small screens
 * - **Expandable rows:** Show/hide detailed content per row
 * - **Zustand state:** Isolated state per table (by tableId or pathname)
 * - **Animations:** Smooth transitions with Framer Motion
 *
 * **State Management:**
 * Each DataTable instance has isolated state in Zustand store, keyed by `tableId` or `pathname`.
 * State includes: sorting, filters, column visibility, row selection, view mode, page size.
 *
 * @example
 * Client-side pagination (automatic):
 * ```tsx
 * import { DataTable, ColumnDef } from '@telamonjs/ui'
 *
 * const columns: ColumnDef<User>[] = [
 *   { header: 'Name', accessorKey: 'name' },
 *   { header: 'Email', accessorKey: 'email' }
 * ]
 *
 * export default function UsersTable({ users }: { users: User[] }) {
 *   return (
 *     <DataTable
 *       columns={columns}
 *       data={users}
 *       title="Users"
 *       enableSearch
 *       enableFilters
 *       enablePagination
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Server-side pagination:
 * ```tsx
 * 'use client'
 * import { DataTable } from '@telamonjs/ui'
 * import { useState, useEffect } from 'react'
 *
 * export default function ServerPaginatedTable() {
 *   const [data, setData] = useState([])
 *   const [pageCount, setPageCount] = useState(0)
 *   const [totalItems, setTotalItems] = useState(0)
 *   const [currentPage, setCurrentPage] = useState(1)
 *
 *   const fetchData = async (page: number, pageSize: number, search: string) => {
 *     const response = await fetch(`/api/users?page=${page}&pageSize=${pageSize}&search=${search}`)
 *     const result = await response.json()
 *     setData(result.data)
 *     setPageCount(result.pageCount)
 *     setTotalItems(result.total)
 *   }
 *
 *   return (
 *     <DataTable
 *       columns={columns}
 *       data={data}
 *       manualPagination
 *       pageCount={pageCount}
 *       currentPage={currentPage}
 *       totalItems={totalItems}
 *       onPaginationChange={(page, pageSize) => {
 *         setCurrentPage(page)
 *         fetchData(page, pageSize, '')
 *       }}
 *       onSearchChange={(search) => fetchData(currentPage, 10, search)}
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * With bulk actions and row selection:
 * ```tsx
 * const bulkActions: BulkAction<User>[] = [
 *   {
 *     label: 'Delete selected',
 *     icon: <Trash className="w-4 h-4" />,
 *     variant: 'destructive',
 *     onAction: async (rows) => {
 *       await deleteUsers(rows.map(r => r.id))
 *     }
 *   },
 *   {
 *     label: 'Export selected',
 *     icon: <Download className="w-4 h-4" />,
 *     onAction: async (rows) => {
 *       exportToExcel(rows)
 *     }
 *   }
 * ]
 *
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   enableBulkActions
 *   enableRowSelection
 *   bulkActions={bulkActions}
 * />
 * ```
 *
 * @example
 * With query builder (advanced filters):
 * ```tsx
 * const queryBuilderFields: QueryBuilderField[] = [
 *   { name: 'name', label: 'Name', type: 'text' },
 *   { name: 'age', label: 'Age', type: 'number' },
 *   { name: 'createdAt', label: 'Created At', type: 'date' },
 *   {
 *     name: 'status',
 *     label: 'Status',
 *     type: 'select',
 *     options: [
 *       { value: 'active', label: 'Active' },
 *       { value: 'inactive', label: 'Inactive' }
 *     ]
 *   }
 * ]
 *
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   enableQueryBuilder
 *   queryBuilderFields={queryBuilderFields}
 *   onQueryBuilderChange={(where) => {
 *     // where is a Prisma where object
 *     fetchFilteredData(where)
 *   }}
 * />
 * ```
 *
 * @example
 * With expandable rows:
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   enableExpandableRows
 *   expandableRowContent={(row) => (
 *     <div className="p-4">
 *       <h4 className="font-semibold mb-2">Details for {row.name}</h4>
 *       <p>Address: {row.address}</p>
 *       <p>Phone: {row.phone}</p>
 *       <p>Notes: {row.notes}</p>
 *     </div>
 *   )}
 * />
 * ```
 *
 * @example
 * With actions column (auto-injected):
 * ```tsx
 * const actionsConfig: DataTableActionsConfig<User> = {
 *   actions: [
 *     {
 *       type: 'view',
 *       label: 'View',
 *       href: (row) => `/users/${row.id}`
 *     },
 *     {
 *       type: 'edit',
 *       label: 'Edit',
 *       href: (row) => `/users/${row.id}/edit`
 *     },
 *     {
 *       type: 'delete',
 *       label: 'Delete',
 *       confirmTitle: 'Delete user?',
 *       confirmDescription: 'This action cannot be undone.',
 *       onAction: async (row) => {
 *         await deleteUser(row.id)
 *       }
 *     }
 *   ]
 * }
 *
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   actionsConfig={actionsConfig}
 * />
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/listpage-pattern.mdx | ListPage Pattern}
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  tableId: providedTableId,
  title,
  description,
  searchPlaceholder: searchPlaceholderProp,
  enableSearch = true,
  enableFilters = true,
  enableExport = true,
  exportFormats = ['excel', 'csv', 'pdf'],
  exportFilename = 'export',
  exportPdfOptions = {},
  exportMenuProps,
  enableSavedViews = false,
  enableAdd = true,
  enableRefresh = true,
  enableColumnVisibility = true,
  enableSelection = false,
  enablePagination = true,
  pageSize = 10,
  readOnly = false,
  loading = false,
  error,
  emptyTitle: emptyTitleProp,
  emptyDescription: emptyDescriptionProp,
  onAdd,
  onRefresh,
  onExport,
  onRowClick,
  rowClickNavigation = true,
  className,
  enableDensity = true,
  defaultDensity,
  enableFullscreen = false,
  enableBulkActions = false,
  bulkActions = [],
  enableRowSelection = false,
  headerActions = [],
  enableMobileCards = true,
  defaultViewMode = 'table',
  cardActions = [],
  cardComponent,
  // Server-side pagination props
  manualPagination = false,
  pageCount,
  currentPage,
  totalItems,
  onPaginationChange,
  onSearchChange,
  onSortChange,
  onColumnFiltersChange,
  enableMultiSort = true,
  // Filter options
  filterOptions,
  // Actions configuration
  enableActions = true,
  actionsConfig,
  // Query Builder
  enableQueryBuilder = false,
  queryBuilderFields = [],
  onQueryBuilderChange,
  // Expandable Rows
  enableExpandableRows = false,
  expandableRowContent,
  // Hide sections
  hideToolbar = false,
  hideTitleSection = false,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTelamonjsT()
  const searchPlaceholder = searchPlaceholderProp ?? t('list.search')
  const emptyTitle = emptyTitleProp ?? t('list.empty')
  const emptyDescription = emptyDescriptionProp ?? t('list.emptyDescription')

  // Use pathname as default tableId if not provided
  const tableId = providedTableId || pathname

  // Expanded rows state
  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({})

  // Read by the expand cell via table.options.meta (keeps columns stable on toggle)
  const expandMeta = React.useMemo(
    () => ({ expandedRows, setExpandedRows }),
    [expandedRows]
  )

  // Inject special columns (checkbox, expand, actions)
  const columnsWithSpecialColumns = useSpecialColumns({
    columns,
    enableRowSelection,
    enableBulkActions,
    enableSelection,
    enableExpandableRows,
    expandableRowContent,
    enableActions,
    actionsConfig,
  })

  // Zustand store wiring + TanStack Table instance
  const {
    table,
    sorting,
    columnFilters,
    storeColumnFilters,
    storeGlobalFilter,
    storeSorting,
    storePageSize,
    columnVisibility,
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
  } = useDataTableInstance({
    tableId,
    data,
    columns: columnsWithSpecialColumns,
    pageSize,
    manualPagination,
    pageCount,
    enableMultiSort,
    enableSelection,
    enableSearch,
    defaultViewMode,
    defaultDensity,
    expandMeta,
  })

  // Notify parent about filter/search/sort changes (server-side)
  const { isSearching } = useServerSideSync({
    manualPagination,
    storeColumnFilters,
    storeGlobalFilter,
    storeSorting,
    onColumnFiltersChange,
    onSearchChange,
    onSortChange,
  })

  // Query Builder state + handlers
  const queryBuilder = useQueryBuilderControl(onQueryBuilderChange)

  // Saved Views handlers
  const savedViews = useSavedViewsControl({
    table,
    columnVisibility,
    storeSorting,
    storeGlobalFilter,
    storeColumnFilters,
    queryGroup: queryBuilder.queryGroup,
    setQueryGroup: queryBuilder.setQueryGroup,
    setColumnVisibility,
    setStoreSorting,
    setGlobalFilter,
    clearColumnFilters,
    onQueryBuilderChange,
  })

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length

  const isFiltered = storeGlobalFilter !== '' || columnFilters.length > 0

  // Handle row click
  const handleRowClick = useCallback(
    (row: TData) => {
      if (onRowClick) {
        onRowClick(row)
      } else if (!readOnly && rowClickNavigation) {
        const rowWithId = row as { id?: string | number }
        if (rowWithId.id !== undefined) {
          router.push(`${pathname}/${rowWithId.id}`)
        }
      }
    },
    [onRowClick, readOnly, rowClickNavigation, router, pathname]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    setGlobalFilter('')
    clearColumnFilters()
  }, [setGlobalFilter, clearColumnFilters])

  // Handle add action
  const handleAdd = useCallback(() => {
    if (onAdd) {
      onAdd()
    } else {
      router.push(`${pathname}/adicionar`)
    }
  }, [onAdd, router, pathname])

  return (
    <div
      className={cn(
        'flex flex-col space-y-4',
        isFullscreen && 'fixed inset-0 bg-background p-4',
        className
      )}
      style={isFullscreen ? { zIndex: Z_INDEX.modal } : undefined}
    >
      {/* Header */}
      {(!hideTitleSection || !hideToolbar) && (
        <div className='flex flex-col space-y-4'>
          {/* Title and description */}
          {!hideTitleSection && (title || description) && (
            <div className='space-y-1'>
              {title && (
                <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
              )}
              {description && (
                <p className='text-muted-foreground'>{description}</p>
              )}
            </div>
          )}

          {/* Toolbar */}
          {!hideToolbar && (
            <TableToolbar
              tableId={tableId}
              table={table}
              columns={columns}
              sorting={sorting}
              selectedRowCount={selectedRowCount}
              isFiltered={isFiltered}
              enableSearch={enableSearch}
              searchPlaceholder={searchPlaceholder}
              storeGlobalFilter={storeGlobalFilter}
              setGlobalFilter={setGlobalFilter}
              isSearching={isSearching}
              manualPagination={manualPagination}
              clearFilters={clearFilters}
              setStoreSorting={setStoreSorting}
              enableBulkActions={enableBulkActions}
              bulkActions={bulkActions}
              setRowSelection={setRowSelection}
              enableFilters={enableFilters}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              enableQueryBuilder={enableQueryBuilder}
              queryBuilderFields={queryBuilderFields}
              queryBuilder={queryBuilder}
              enableExport={enableExport}
              exportFormats={exportFormats}
              exportFilename={exportFilename}
              exportPdfOptions={exportPdfOptions}
              exportMenuProps={exportMenuProps}
              onExport={onExport}
              enableSavedViews={enableSavedViews}
              savedViews={savedViews}
              enableColumnVisibility={enableColumnVisibility}
              currentViewMode={currentViewMode}
              headerActions={headerActions}
              enableRefresh={enableRefresh}
              onRefresh={onRefresh}
              loading={loading}
              enableAdd={enableAdd}
              readOnly={readOnly}
              handleAdd={handleAdd}
              enableMobileCards={enableMobileCards}
              setCurrentViewMode={setCurrentViewMode}
              viewMode={viewMode}
              setViewMode={setViewMode}
              enableDensity={enableDensity}
              enableFullscreen={enableFullscreen}
              toggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
            />
          )}

          {/* Advanced filters */}
          {!hideToolbar && (
            <TableFiltersPanel
              table={table}
              tableId={tableId}
              showFilters={showFilters}
              filterOptions={filterOptions}
            />
          )}
        </div>
      )}

      {/* Table */}
      <div className='rounded-lg border bg-card overflow-hidden'>
        {error ? (
          <div className='flex h-32 items-center justify-center'>
            <div className='text-center'>
              <p className='text-sm text-destructive'>
                {t('dialog.loadDataError')}
              </p>
              <p className='text-xs text-muted-foreground'>{error}</p>
              {onRefresh && (
                <Button
                  variant='outline'
                  size='sm'
                  className='mt-3'
                  onClick={() => onRefresh()}
                  data-testid='list-retry'
                >
                  {t('common.retry')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Conditional rendering based on view mode */}
            {currentViewMode === 'table' ? (
              <TableDesktopView
                table={table}
                columns={columns}
                sorting={sorting}
                loading={loading}
                manualPagination={manualPagination}
                storePageSize={storePageSize}
                pageSize={pageSize}
                viewMode={viewMode}
                expandedRows={expandedRows}
                enableExpandableRows={enableExpandableRows}
                expandableRowContent={expandableRowContent}
                handleRowClick={handleRowClick}
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
                enableAdd={enableAdd}
                readOnly={readOnly}
                handleAdd={handleAdd}
              />
            ) : (
              /* Cards view */
              <TableCardsView
                table={table}
                columns={columns}
                loading={loading}
                manualPagination={manualPagination}
                storePageSize={storePageSize}
                pageSize={pageSize}
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
                onRefresh={onRefresh}
                cardComponent={cardComponent}
                cardActions={cardActions}
                handleRowClick={handleRowClick}
              />
            )}

            {/* Footer */}
            {enablePagination && (
              <TableFooter
                table={table}
                manualPagination={manualPagination}
                storePageSize={storePageSize}
                pageSize={pageSize}
                pageCount={pageCount}
                currentPage={currentPage}
                totalItems={totalItems}
                onPaginationChange={onPaginationChange}
                setStorePage={setStorePage}
                setStorePageSize={setStorePageSize}
                enableSelection={enableSelection}
                selectedRowCount={selectedRowCount}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
