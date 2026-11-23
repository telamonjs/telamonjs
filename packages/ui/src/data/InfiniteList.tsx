'use client'

import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import type { DataTableActionsConfig } from '../types/actions'
import { useSpecialColumns } from './datatable/useSpecialColumns'
import { BulkActionsToolbar, type BulkAction } from './BulkActionsToolbar'
import {
  Loader2,
  List,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../utils'
import { useTranslations } from 'next-intl'
import { useTelamonjsT, useText } from '../i18n/use-t'
import { isMessageRef, msg } from '../i18n/msg'
import { usesCount } from '../i18n/uses-count'
import type { I18nText } from '../i18n/msg'
import type { HeadingLevel } from '../ui/heading-level'
import { SkeletonTable } from '../components/skeletons/SkeletonTable'
import { useTableSorting, useDataTableActions } from '../stores/datatable-store'
import type { SortField } from '../types/pagination'

export interface InfiniteListProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- public prop; columns mix heterogeneous cell value types per-column (tanstack-table idiom), `unknown` breaks TValue-contravariant assignability for typed ColumnDef<TData, string>[] etc.
  columns: ColumnDef<TData, any>[]
  data: TData[]
  total: number
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  onRowClick?: (row: TData) => void
  actionsConfig?: DataTableActionsConfig<TData>
  tableId?: string
  emptyTitle?: string
  emptyDescription?: string
  /**
   * Plural of the domain for the footer ("100 of 129 {label}"); same shape as
   * `list.toolbar.counterLabel`. A MessageRef whose message uses `{count}` receives the total and
   * renders on its own. Default: localized "items".
   */
  counterLabel?: I18nText | ((count: number) => string)
  /** Semantic level of the empty/error state title (default 2). Visual size is unchanged. */
  headingLevel?: HeadingLevel
  /** Extra content in the status bar, after the counter (e.g. totals of the filtered list) */
  footerContent?: import('react').ReactNode
  /**
   * Query error. Renders an error state with "Try again" instead of the empty
   * state (a failed request is not an empty list).
   */
  error?: string
  /** "Try again" handler for the error state. */
  onRetry?: () => void
  className?: string
  estimatedRowHeight?: number
  /**
   * Renders a checkbox column (same one DataTable uses). The header checkbox
   * selects **all rows already loaded** — the infinite equivalent of "current
   * page"; rows not yet fetched are never selected. Selection is keyed by row
   * `id`: ids that leave the loaded data (refetch/invalidate) drop out of the
   * selection, exactly like DataTable.
   */
  enableSelection?: boolean
  /**
   * Bulk actions shown in the same `BulkActionsToolbar` DataTable uses
   * (`confirmDialog`/`variant` work identically). Requires `enableSelection`.
   * Selection is cleared after a successful action.
   */
  bulkActions?: BulkAction<TData>[]
}

export function InfiniteList<TData>({
  columns,
  data,
  total,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onRowClick,
  actionsConfig,
  tableId,
  emptyTitle: emptyTitleProp,
  emptyDescription: emptyDescriptionProp,
  counterLabel,
  headingLevel = 2,
  footerContent,
  error,
  onRetry,
  className,
  estimatedRowHeight = 36,
  enableSelection = false,
  bulkActions = [],
}: InfiniteListProps<TData>) {
  const t = useTelamonjsT()
  const text = useText()
  const tAll = useTranslations()
  const Heading = `h${headingLevel}` as const
  const emptyTitle = emptyTitleProp ?? t('list.empty')
  const emptyDescription =
    emptyDescriptionProp ?? t('list.emptyDescriptionNewItem')
  // Footer counter: ICU messages only, the domain label is a value, never concatenated
  const footerCounter = (() => {
    const count = data.length
    if (!counterLabel) return t('data.itemsOfTotal', { count, total })
    if (typeof counterLabel === 'function') {
      return t('data.itemsOfTotalLabel', {
        count,
        total,
        label: counterLabel(total),
      })
    }
    if (
      isMessageRef(counterLabel) &&
      usesCount(
        tAll.has(counterLabel.key as never)
          ? tAll.raw(counterLabel.key as never)
          : null
      )
    ) {
      const counted =
        text(msg(counterLabel.key, { ...counterLabel.values, count: total })) ??
        ''
      return t('data.itemsOfTotalCounted', { count, counted })
    }
    return t('data.itemsOfTotalLabel', {
      count,
      total,
      label: text(counterLabel) ?? '',
    })
  })()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Auto-inject selection (first) + actions (last) columns — shared with DataTable
  const finalColumns = useSpecialColumns({
    columns,
    enableRowSelection: enableSelection,
    enableBulkActions: false,
    enableSelection,
    enableExpandableRows: false,
    enableActions: true,
    actionsConfig,
  })

  // ponytail: local state, not the datatable-store — nothing outside reads it
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Sorting state from Zustand store (only when tableId is provided)
  const storeSorting = useTableSorting(tableId ?? '')
  const { setSorting: setStoreSorting } = useDataTableActions(tableId ?? '')

  const sorting: SortingState = useMemo(
    () => storeSorting.map(s => ({ id: s.field, desc: s.order === 'desc' })),
    [storeSorting]
  )

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      if (!tableId) return
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater
      const sortFields: SortField[] = newSorting.map(s => ({
        field: s.id,
        order: s.desc ? ('desc' as const) : ('asc' as const),
      }))
      setStoreSorting(sortFields)
    },
    [tableId, sorting, setStoreSorting]
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable() returns functions the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it.
  const table = useReactTable({
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: TData) =>
      (row as Record<string, unknown>).id?.toString() ?? '',
    state: { sorting, rowSelection },
    manualSorting: true,
    onSortingChange: tableId ? handleSortingChange : undefined,
    enableMultiSort: false,
    enableSortingRemoval: false,
    enableRowSelection: enableSelection,
    onRowSelectionChange: setRowSelection,
  })

  const { rows } = table.getRowModel()
  // Only ids present in the loaded data count (stale ids are ignored)
  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const clearSelection = useCallback(() => setRowSelection({}), [])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
    // Measures the real height of each rendered row (via ref on the <tr>s).
    // Without this, rows taller than the estimate make the browser's scroll
    // anchoring fight the virtualizer → scrollbar oscillating in a loop.
    measureElement: el => el.getBoundingClientRect().height,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // IntersectionObserver for sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '200px',
      }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className={cn('flex-1 min-h-0 overflow-hidden', className)}>
        <Table>
          <SkeletonTable columns={columns} rows={10} />
        </Table>
      </div>
    )
  }

  if (error && data.length === 0) {
    return (
      <div
        role='alert'
        className={cn(
          'flex-1 min-h-0 flex flex-col items-center justify-center text-center p-8',
          className
        )}
      >
        <AlertCircle className='h-8 w-8 text-destructive/70' />
        <Heading className='mt-2 text-sm font-semibold'>
          {t('dialog.loadDataError')}
        </Heading>
        <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
        {onRetry && (
          <Button
            variant='outline'
            size='sm'
            className='mt-4'
            onClick={onRetry}
            data-testid='list-retry'
          >
            <RefreshCw className='mr-2 h-4 w-4' />
            {t('common.retry')}
          </Button>
        )}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex-1 min-h-0 flex flex-col items-center justify-center text-center p-8',
          className
        )}
      >
        <List className='h-8 w-8 text-muted-foreground/50' />
        <Heading className='mt-2 text-sm font-semibold'>{emptyTitle}</Heading>
        <p className='mt-1 text-sm text-muted-foreground'>{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className={cn('flex-1 min-h-0 flex flex-col', className)}>
      {enableSelection && selectedCount > 0 && bulkActions.length > 0 && (
        <div className='flex-shrink-0 px-3 py-2'>
          <BulkActionsToolbar
            selectedCount={selectedCount}
            selectedRows={selectedRows.map(row => row.original)}
            actions={bulkActions}
            onClearSelection={clearSelection}
          />
        </div>
      )}
      <div
        ref={scrollContainerRef}
        tabIndex={0}
        role='region'
        aria-label={t('list.recordsRegion')}
        className='flex-1 min-h-0 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        // The virtualizer manages positions; native scroll anchoring
        // conflicts with the virtual paddings and causes scrollbar jitter
        style={{ overflowAnchor: 'none' }}
      >
        {/* border-separate fixes position:sticky on thead in Chrome (border-collapse breaks it) */}
        <Table className='border-separate border-spacing-0'>
          <TableHeader className='sticky top-0 z-10 bg-background [&_tr]:border-b-0'>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'h-8 px-3 text-xs uppercase tracking-wider font-medium text-muted-foreground border-b border-border/50',
                      tableId &&
                        header.column.getCanSort() &&
                        'cursor-pointer select-none hover:text-foreground'
                    )}
                    onClick={
                      tableId
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div className='flex items-center gap-1'>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {tableId &&
                          header.column.getCanSort() &&
                          (header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className='h-3 w-3' />
                          ) : header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-30' />
                          ))}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {/* Virtual padding top */}
            {virtualRows.length > 0 && virtualRows[0].start > 0 && (
              <tr>
                <td style={{ height: virtualRows[0].start }} />
              </tr>
            )}

            {virtualRows.map(virtualRow => {
              const row = rows[virtualRow.index]
              return (
                <TableRow
                  key={row.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className={cn(
                    'border-0 transition-colors hover:bg-primary/5 even:bg-muted/40',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={e => {
                    const target = e.target as HTMLElement
                    if (
                      target.closest('input[type="checkbox"]') ||
                      target.closest('button')
                    )
                      return
                    onRowClick?.(row.original)
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className='py-1.5 px-3 text-xs whitespace-nowrap tabular-nums'
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}

            {/* Virtual padding bottom */}
            {virtualRows.length > 0 && (
              <tr>
                <td
                  style={{
                    height: totalSize - virtualRows[virtualRows.length - 1].end,
                  }}
                />
              </tr>
            )}
          </TableBody>
        </Table>

        {/* Sentinel for IntersectionObserver + loading indicator */}
        <div ref={sentinelRef} className='h-1' />
        {isFetchingNextPage && (
          <div className='flex items-center justify-center py-4'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            <span className='ml-2 text-sm text-muted-foreground'>
              {t('common.loading')}
            </span>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className='flex-shrink-0 flex items-center justify-between px-3 py-1 border-t bg-muted/30 text-xs text-muted-foreground'>
        <span className='flex items-center gap-2'>
          <span>{footerCounter}</span>
          {footerContent}
          {selectedCount > 0 && (
            <span
              className='font-medium text-foreground'
              data-testid='infinite-list-selection-counter'
            >
              {t('data.loadedOfTotal', {
                selected: selectedCount,
                loaded: data.length,
              })}
            </span>
          )}
        </span>
        {isFetchingNextPage && (
          <span className='flex items-center gap-1'>
            <Loader2 className='h-3 w-3 animate-spin' />
            {t('common.loading')}
          </span>
        )}
        {!hasNextPage && data.length > 0 && !isFetchingNextPage && (
          <span>{t('pagination.allLoaded')}</span>
        )}
      </div>
    </div>
  )
}
