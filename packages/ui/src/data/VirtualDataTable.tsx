/**
 * VirtualDataTable Component
 *
 * Optimized DataTable for large datasets (> 1000 rows) using virtual scrolling.
 * Uses @tanstack/react-virtual for smooth rendering of thousands of rows.
 *
 * @example
 * // For datasets > 1000 rows, use VirtualDataTable instead of DataTable
 * <VirtualDataTable
 *   data={largeDataset} // 10,000+ rows
 *   columns={columns}
 *   height={600} // Container height
 * />
 */

'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { cn } from '../utils'
import { isOwnRowClick } from './row-click'

interface VirtualDataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  height?: number // Container height in pixels (default: 600)
  estimatedRowHeight?: number // Estimated row height for virtual scrolling (default: 48)
  overscan?: number // Number of rows to render outside viewport (default: 5)
  className?: string
  enableSorting?: boolean
  enableFiltering?: boolean
  onRowClick?: (row: TData) => void
}

/**
 * VirtualDataTable - Optimized for large datasets
 *
 * Performance characteristics:
 * - Renders only visible rows + overscan buffer
 * - Smooth scrolling with 60fps
 * - Memory efficient (constant memory usage regardless of dataset size)
 * - Recommended for datasets > 1000 rows
 *
 * Example usage:
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: 'name', header: 'Name' },
 *   { accessorKey: 'email', header: 'Email' },
 * ]
 *
 * <VirtualDataTable
 *   data={users} // 10,000 users
 *   columns={columns}
 *   height={800}
 *   estimatedRowHeight={52}
 * />
 * ```
 */
export function VirtualDataTable<TData>({
  data,
  columns,
  height = 600,
  estimatedRowHeight = 48,
  overscan = 5,
  className,
  enableSorting = true,
  enableFiltering = false,
  onRowClick,
}: VirtualDataTableProps<TData>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Setup TanStack Table
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable() returns functions the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
  })

  const { rows } = table.getRowModel()

  // Setup virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
    // Mede a altura real das linhas — estimate fixo + linhas mais altas
    // fazem o scroll anchoring do browser oscilar a scrollbar (ver InfiniteList)
    measureElement: el => el.getBoundingClientRect().height,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  // Calculate padding for virtual scrolling
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto border rounded-lg', className)}
      style={{ height: `${height}px`, overflowAnchor: 'none' }}
    >
      <Table>
        <TableHeader className='sticky top-0 z-10 bg-background'>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'h-12 border-b bg-muted/50 font-semibold',
                    header.column.getCanSort() && 'cursor-pointer select-none'
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} />
            </tr>
          )}
          {virtualRows.map(virtualRow => {
            const row = rows[virtualRow.index]
            return (
              <TableRow
                key={row.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className={cn(
                  'border-b transition-colors hover:bg-muted/50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={e => {
                  if (isOwnRowClick(e)) onRowClick?.(row.original)
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className='py-2'>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} />
            </tr>
          )}
        </TableBody>
      </Table>

      {/* Performance stats (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className='sticky bottom-0 left-0 right-0 bg-muted/90 backdrop-blur px-4 py-2 text-xs text-muted-foreground border-t'>
          <div className='flex items-center justify-between'>
            <div>
              📊 Virtual Scrolling: {virtualRows.length} rendered /{' '}
              {rows.length} total rows
            </div>
            <div>
              ⚡ Memory: ~
              {Math.round((virtualRows.length * estimatedRowHeight) / 1024)}KB
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

