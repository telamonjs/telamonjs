'use client'

import React from 'react'
import {
  ColumnDef,
  SortingState,
  Table as TanStackTable,
  flexRender,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, List, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { cn } from '../../utils'
import type { HeadingLevel } from '../../ui/heading-level'
import { SkeletonTable } from '../../components/skeletons/SkeletonTable'
import { getDensityStyles } from './density'
import { ViewMode } from './types'

export interface TableDesktopViewProps<TData, TValue> {
  table: TanStackTable<TData>
  /** Original (user-provided) column definitions, used by SkeletonTable. */
  columns: ColumnDef<TData, TValue>[]
  sorting: SortingState
  loading: boolean
  manualPagination: boolean
  storePageSize: number
  pageSize: number
  viewMode: ViewMode
  expandedRows: Record<string, boolean>
  enableExpandableRows: boolean
  expandableRowContent?: (row: TData) => React.ReactNode
  handleRowClick: (row: TData) => void
  emptyTitle: string
  emptyDescription: string
  /** Semantic level of the empty-state title (default 2). Visual size is unchanged. */
  headingLevel?: HeadingLevel
  enableAdd: boolean
  readOnly: boolean
  handleAdd: () => void
}

/**
 * Desktop table rendering: header groups with multi-sort indicators,
 * animated body rows, expandable row content, skeleton loading, and
 * the empty state with optional "add item" action.
 *
 * @internal Extracted from DataTable.tsx (desktop table render)
 */
export function TableDesktopView<TData, TValue>({
  table,
  columns,
  sorting,
  loading,
  manualPagination,
  storePageSize,
  pageSize,
  viewMode,
  expandedRows,
  enableExpandableRows,
  expandableRowContent,
  handleRowClick,
  emptyTitle,
  emptyDescription,
  headingLevel = 2,
  enableAdd,
  readOnly,
  handleAdd,
}: TableDesktopViewProps<TData, TValue>) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className='overflow-x-auto'>
      <Table className='min-w-full'>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className='hover:bg-transparent'>
              {headerGroup.headers.map(header => {
                // Get sort index for multi-sort indicator
                const sortIndex = sorting.findIndex(
                  s => s.id === header.column.id
                )
                const isSorted = sortIndex !== -1
                const sortDirection = isSorted
                  ? sorting[sortIndex].desc
                    ? 'desc'
                    : 'asc'
                  : false

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      // no bg here: TableHeader already paints bg-muted/50 —
                      // a second layer drops the header text below 4.5:1
                      'h-12 border-b font-semibold',
                      header.column.getCanSort() && 'cursor-pointer select-none'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className='flex items-center space-x-2'>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanSort() && (
                        <div className='flex items-center gap-1'>
                          {/* Sort indicator */}
                          {sortDirection === 'desc' ? (
                            <ArrowDown className='h-3 w-3' />
                          ) : sortDirection === 'asc' ? (
                            <ArrowUp className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-50' />
                          )}
                          {/* Multi-sort badge (numbered indicator) */}
                          {isSorted && sorting.length > 1 && (
                            <Badge
                              variant='secondary'
                              className='h-4 w-4 p-0 flex items-center justify-center text-xs'
                            >
                              {sortIndex + 1}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        {loading ? (
          <SkeletonTable
            // Widening TValue -> unknown is safe (SkeletonTable only counts columns);
            // the explicit cast avoids a check-order-dependent TS variance failure
            // on the ColumnDef union (TS2322 that appears/disappears with unrelated files).
            columns={columns as ColumnDef<TData, unknown>[]}
            rows={
              manualPagination
                ? storePageSize
                : table.getState().pagination?.pageSize || pageSize
            }
          />
        ) : (
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => {
                const rowId =
                  table.options.getRowId?.(row.original, row.index) ||
                  String(row.index)
                const isExpanded = expandedRows[rowId]

                return (
                  <React.Fragment key={row.id}>
                    {/* Main row */}
                    <tr
                      className={cn(
                        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer group'
                      )}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={(e: React.MouseEvent<HTMLTableRowElement>) => {
                        // Prevent row click when clicking on checkboxes or action buttons
                        const target = e.target as HTMLElement
                        if (
                          target.closest('input[type="checkbox"]') ||
                          target.closest('button')
                        ) {
                          return
                        }
                        handleRowClick(row.original)
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'transition-colors whitespace-nowrap',
                            getDensityStyles(viewMode)
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </tr>

                    {/* Expanded content row */}
                    {enableExpandableRows &&
                      expandableRowContent &&
                      isExpanded && (
                        <TableRow>
                          <TableCell
                            colSpan={row.getVisibleCells().length}
                            className='p-0'
                          >
                            <div className='overflow-hidden animate-in fade-in-0 duration-200 motion-reduce:animate-none'>
                              <div className='p-4 bg-muted/30'>
                                {expandableRowContent(row.original)}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                  </React.Fragment>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className='h-32'
                >
                  <div className='flex flex-col items-center justify-center text-center'>
                    <List className='h-8 w-8 text-muted-foreground/50' />
                    <Heading className='mt-2 text-sm font-semibold'>
                      {emptyTitle}
                    </Heading>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {emptyDescription}
                    </p>
                    {enableAdd && !readOnly && (
                      <Button
                        variant='outline'
                        size='sm'
                        className='mt-4'
                        onClick={handleAdd}
                        data-testid='table-empty-add-item'
                      >
                        <Plus className='mr-2 h-4 w-4' />
                        Adicionar item
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        )}
      </Table>
    </div>
  )
}
