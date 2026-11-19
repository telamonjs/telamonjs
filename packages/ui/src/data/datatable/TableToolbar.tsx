'use client'

import React from 'react'
import { ColumnDef, SortingState, Table } from '@tanstack/react-table'
import {
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  Eye,
  X,
  Settings2,
  Grid3X3,
  Loader2,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Badge } from '../../ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog'
import { cn } from '../../utils'
import { SortField } from '../../types/pagination'
import { ToolbarActionsMenu } from '../../components/toolbar/ToolbarActionsMenu'
import { QueryBuilder, QueryBuilderField } from '../QueryBuilder'
import { BulkActionsToolbar, BulkAction } from '../BulkActionsToolbar'
import { ExportMenu } from '../ExportMenu'
import { ViewsMenu } from '../ViewsMenu'
import { PDFExportOptions } from '../exportUtils'
import { useTelamonjsT } from '../../i18n/use-t'
import { DataTableHeaderActions, ViewMode } from './types'
import { QueryBuilderControl } from './useQueryBuilderControl'
import { SavedViewsControl } from './useSavedViewsControl'
import { getColumnLabel } from '../column-label'

export interface TableToolbarProps<TData, TValue> {
  tableId: string
  table: Table<TData>
  /** Original (user-provided) column definitions, used by ExportMenu. */
  columns: ColumnDef<TData, TValue>[]
  sorting: SortingState
  selectedRowCount: number
  isFiltered: boolean
  // Search
  enableSearch: boolean
  searchPlaceholder: string
  storeGlobalFilter: string
  setGlobalFilter: (filter: string) => void
  isSearching: boolean
  manualPagination: boolean
  clearFilters: () => void
  setStoreSorting: (sorting: SortField[]) => void
  // Bulk actions
  enableBulkActions: boolean
  bulkActions: BulkAction<TData>[]
  setRowSelection: (selection: Record<string, boolean>) => void
  // Filters
  enableFilters: boolean
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  // Query Builder
  enableQueryBuilder: boolean
  queryBuilderFields: QueryBuilderField[]
  queryBuilder: QueryBuilderControl
  // Export
  enableExport: boolean
  exportFormats: Array<'excel' | 'csv' | 'pdf'>
  exportFilename: string
  exportPdfOptions: Omit<PDFExportOptions, 'filename' | 't' | 'locale'>
  onExport?: () => void
  // Saved Views
  enableSavedViews: boolean
  savedViews: SavedViewsControl
  // Column visibility
  enableColumnVisibility: boolean
  currentViewMode: 'table' | 'cards'
  // Header actions
  headerActions: DataTableHeaderActions<TData, TValue>
  // Refresh / Add
  enableRefresh: boolean
  onRefresh?: () => void
  loading: boolean
  enableAdd: boolean
  readOnly: boolean
  handleAdd: () => void
  // Actions menu (density / view mode)
  enableMobileCards: boolean
  setCurrentViewMode: (mode: 'table' | 'cards') => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  enableDensity: boolean
  // Fullscreen
  enableFullscreen: boolean
  toggleFullscreen: () => void
  isFullscreen: boolean
}

/**
 * DataTable toolbar row: global search, clear filters/sorts, bulk actions,
 * query builder dialog, export, saved views, column visibility popover,
 * custom header actions, refresh, add, actions menu, fullscreen toggle.
 *
 * @internal Extracted from DataTable.tsx (toolbar render)
 */
export function TableToolbar<TData, TValue>({
  tableId,
  table,
  columns,
  sorting,
  selectedRowCount,
  isFiltered,
  enableSearch,
  searchPlaceholder,
  storeGlobalFilter,
  setGlobalFilter,
  isSearching,
  manualPagination,
  clearFilters,
  setStoreSorting,
  enableBulkActions,
  bulkActions,
  setRowSelection,
  enableFilters,
  showFilters,
  setShowFilters,
  enableQueryBuilder,
  queryBuilderFields,
  queryBuilder,
  enableExport,
  exportFormats,
  exportFilename,
  exportPdfOptions,
  onExport,
  enableSavedViews,
  savedViews,
  enableColumnVisibility,
  currentViewMode,
  headerActions,
  enableRefresh,
  onRefresh,
  loading,
  enableAdd,
  readOnly,
  handleAdd,
  enableMobileCards,
  setCurrentViewMode,
  viewMode,
  setViewMode,
  enableDensity,
  enableFullscreen,
  toggleFullscreen,
  isFullscreen,
}: TableToolbarProps<TData, TValue>) {
  const t = useTelamonjsT()
  const {
    queryBuilderOpen,
    setQueryBuilderOpen,
    queryGroup,
    setQueryGroup,
    handleQueryBuilderApply,
    handleQueryBuilderClear,
  } = queryBuilder
  const { getCurrentViewConfig, handleLoadView, handleResetToDefault } =
    savedViews

  return (
    <div className='flex flex-row items-center justify-between gap-2'>
      {/* Left side - Search and filters */}
      <div className='flex flex-1 items-center space-x-2'>
        {enableSearch && (
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder={searchPlaceholder}
              value={storeGlobalFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setGlobalFilter(e.target.value)
              }
              className='pl-9 w-[140px] sm:w-[200px] lg:w-[300px]'
              data-testid='toolbar-search'
              aria-label='Search table'
            />
            {/* Loading indicator during search debounce */}
            {isSearching && manualPagination && (
              <div className='absolute right-1 top-1/2 -translate-y-1/2'>
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              </div>
            )}
            {/* Clear search button */}
            {storeGlobalFilter && !isSearching && (
              <Button
                variant='ghost'
                size='sm'
                className='absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0'
                onClick={() => setGlobalFilter('')}
                data-testid='toolbar-search-clear'
                aria-label='Clear search'
              >
                <X className='h-3 w-3' />
              </Button>
            )}
          </div>
        )}

        {isFiltered && (
          <Button
            variant='ghost'
            size='sm'
            onClick={clearFilters}
            className='h-8 px-2 lg:px-3'
            data-testid='toolbar-clear-filters'
          >
            {t('list.clearFilters')}
            <X className='ml-2 h-4 w-4' />
          </Button>
        )}

        {/* Clear all sorts button (multi-sort) */}
        {sorting.length > 1 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setStoreSorting([])}
            className='h-8 px-2 lg:px-3'
            data-testid='toolbar-clear-sorting'
          >
            {t('list.clearSorting')}
            <X className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>

      {/* Right side - Actions */}
      <div className='flex items-center space-x-2'>
        {/* Bulk actions toolbar */}
        {enableBulkActions &&
          selectedRowCount > 0 &&
          bulkActions.length > 0 && (
            <BulkActionsToolbar
              selectedCount={selectedRowCount}
              selectedRows={table
                .getFilteredSelectedRowModel()
                .rows.map(row => row.original)}
              actions={bulkActions}
              onClearSelection={() => setRowSelection({})}
            />
          )}

        {/* Toolbar buttons (visible on large screens) */}
        <div className='hidden lg:flex items-center space-x-2'>
          {/* Filters */}
          {enableFilters && (
            <Button
              variant='outline'
              size='sm'
              className='h-8'
              onClick={() => setShowFilters(!showFilters)}
              data-testid='toolbar-filters'
              aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <Filter className='h-4 w-4' />
              <span className='ml-1.5'>{t('list.filters')}</span>
              {showFilters && (
                <Badge
                  className='ml-1.5 h-5 px-1.5 text-xs'
                  variant='secondary'
                >
                  {t('list.active')}
                </Badge>
              )}
            </Button>
          )}

          {/* Advanced Filters (Query Builder) */}
          {enableQueryBuilder && queryBuilderFields.length > 0 && (
            <Dialog open={queryBuilderOpen} onOpenChange={setQueryBuilderOpen}>
              <DialogTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8'
                  data-testid='toolbar-query-builder-open'
                >
                  <Settings2 className='h-4 w-4' />
                  <span className='ml-1.5'>{t('list.advanced')}</span>
                  {queryGroup.conditions.length > 0 && (
                    <Badge
                      className='ml-1.5 h-5 px-1.5 text-xs'
                      variant='secondary'
                    >
                      {queryGroup.conditions.length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-3xl max-h-[80vh] overflow-y-auto'>
                <DialogHeader>
                  <DialogTitle>{t('list.advancedFilters')}</DialogTitle>
                  <DialogDescription>
                    {t('list.advancedFiltersDescription')}
                  </DialogDescription>
                </DialogHeader>
                <QueryBuilder
                  fields={queryBuilderFields}
                  value={queryGroup}
                  onChange={setQueryGroup}
                />
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={handleQueryBuilderClear}
                    disabled={queryGroup.conditions.length === 0}
                    data-testid='query-builder-clear-all'
                  >
                    {t('list.clearAll')}
                  </Button>
                  <Button
                    onClick={handleQueryBuilderApply}
                    data-testid='query-builder-apply'
                  >
                    {t('list.applyFilters')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Export */}
          {enableExport && !onExport && (
            <ExportMenu
              data={table.getFilteredRowModel().rows.map(row => row.original)}
              columns={columns as ColumnDef<TData>[]}
              selectedRows={table
                .getFilteredSelectedRowModel()
                .rows.map(row => row.original)}
              currentPageRows={table
                .getRowModel()
                .rows.map(row => row.original)}
              filename={exportFilename}
              formats={exportFormats}
              pdfOptions={exportPdfOptions}
              className='h-8'
            />
          )}

          {/* Custom export handler (backward compatibility) */}
          {enableExport && onExport && (
            <Button
              variant='outline'
              size='sm'
              className='h-8'
              onClick={onExport}
              data-testid='toolbar-export'
              aria-label='Export data'
            >
              <Download className='h-4 w-4' />
              <span className='ml-1.5'>{t('data.export')}</span>
            </Button>
          )}

          {/* Saved Views */}
          {enableSavedViews && (
            <ViewsMenu
              tableId={tableId}
              currentConfig={getCurrentViewConfig()}
              onLoadView={handleLoadView}
              onResetToDefault={handleResetToDefault}
              className='h-8'
            />
          )}

          {/* Column visibility */}
          {enableColumnVisibility && currentViewMode === 'table' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8'
                  data-testid='toolbar-columns'
                  aria-label='Toggle column visibility'
                >
                  <Eye className='h-4 w-4' />
                  <span className='ml-1.5'>{t('list.columns')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align='end' className='w-[200px]'>
                <div className='space-y-2'>
                  <h4 className='font-medium leading-none'>
                    {t('list.columnVisibility')}
                  </h4>
                  <div className='space-y-2'>
                    {table
                      .getAllColumns()
                      .filter(column => column.getCanHide())
                      .map(column => {
                        return (
                          <div
                            key={column.id}
                            className='flex items-center space-x-2'
                          >
                            <input
                              type='checkbox'
                              id={column.id}
                              checked={column.getIsVisible()}
                              onChange={e =>
                                column.toggleVisibility(e.target.checked)
                              }
                              className='h-4 w-4'
                            />
                            <label
                              htmlFor={column.id}
                              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                            >
                              {getColumnLabel(column.columnDef) ?? column.id}
                            </label>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Header Actions */}
          {headerActions.map(action => (
            <Button
              key={action.label}
              variant={action.variant || 'outline'}
              size='sm'
              className='h-8'
              onClick={action.onClick}
              disabled={action.loading}
              loading={action.loading}
              data-testid={`toolbar-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              aria-label={action.label}
            >
              {action.icon && React.isValidElement(action.icon) && (
                <span
                  className={cn('h-4 w-4', action.loading && 'animate-spin')}
                >
                  {action.icon}
                </span>
              )}
              <span className='ml-1.5'>{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Refresh */}
        {enableRefresh && (
          <Button
            variant='outline'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={onRefresh}
            disabled={loading}
            loading={loading}
            title={t('list.refresh')}
            data-testid='toolbar-refresh'
            aria-label='Refresh data'
          >
            {!loading && <RefreshCw className='h-4 w-4' />}
          </Button>
        )}

        {/* Add */}
        {enableAdd && !readOnly && (
          <Button
            size='sm'
            className='h-8 w-8 sm:w-auto sm:px-3'
            onClick={handleAdd}
            title={t('list.add')}
            data-testid='toolbar-add'
            aria-label='Add new item'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline ml-1.5'>{t('list.add')}</span>
          </Button>
        )}

        {/* Actions Menu (⋮) */}
        <ToolbarActionsMenu
          currentViewMode={currentViewMode}
          onViewModeChange={setCurrentViewMode}
          enableMobileCards={enableMobileCards}
          currentDensity={viewMode}
          onDensityChange={setViewMode}
          enableDensity={enableDensity}
          enableFilters={enableFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          filtersActive={showFilters}
          enableExport={enableExport}
          onExport={onExport}
          enableColumnVisibility={enableColumnVisibility}
          table={table}
          headerActions={headerActions}
          showHeaderActionsInMenu={true}
        />

        {/* Fullscreen toggle */}
        {enableFullscreen && (
          <Button
            variant='outline'
            size='sm'
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? t('list.exitFullscreen') : t('list.enterFullscreen')}
          >
            {isFullscreen ? (
              <Grid3X3 className='h-4 w-4' />
            ) : (
              <Grid3X3 className='h-4 w-4' />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
