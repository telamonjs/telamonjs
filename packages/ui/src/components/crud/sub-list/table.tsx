'use client'

import { memo } from 'react'
import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../ui/table'
import {
  flexRender,
  type Cell,
  type ColumnDef,
  type Header,
  type HeaderGroup,
  type Row,
  type Table,
} from '@tanstack/react-table'
import { useTelamonjsT } from '../../../i18n/use-t'
import { cn } from '../../../utils'
import { EmptyState } from '../empty-state'

/**
 * Desktop table body for SubList — see toolbar.tsx for why this is
 * module-level with explicit props (plan A1 focus-loss fix).
 */
export interface SubListTableProps<TData extends Record<string, unknown>> {
  table: Table<TData>
  columns: ColumnDef<TData>[]
  useFullHeight?: boolean
  loadFn?: ((rowId: string) => void) | null
  handleLoadFn: (rowId: string) => Promise<void>
  emptyState?: {
    title?: string
    description?: string
    actionLabel?: string
    onAction?: () => void
  }
}

function SubListTableComponent<TData extends Record<string, unknown>>({
  table,
  columns,
  useFullHeight,
  loadFn,
  handleLoadFn,
  emptyState,
}: SubListTableProps<TData>) {
  const t = useTelamonjsT()
  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 overflow-hidden',
        useFullHeight && 'flex-1 min-h-0 overflow-y-auto'
      )}
    >
      <UiTable>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
            <TableRow
              key={headerGroup.id}
              className='bg-muted/30 hover:bg-muted/30 border-b border-border/50'
            >
              {headerGroup.headers.map((header: Header<TData, unknown>) => (
                <TableHead key={header.id} className='py-3'>
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row: Row<TData>, index: number) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className={cn(
                  index % 2 === 1 && 'bg-muted/20',
                  'hover:bg-muted/40',
                  loadFn && 'cursor-pointer group'
                )}
                onClick={async e => {
                  if (loadFn) {
                    e.preventDefault()
                    await handleLoadFn(
                      (row.original as Record<string, unknown>).id as string
                    )
                  }
                }}
              >
                {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                  <TableCell key={cell.id} className='py-2'>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className='hover:bg-transparent'>
              <TableCell colSpan={columns.length} className='h-48 text-center'>
                <EmptyState
                  title={emptyState?.title}
                  description={emptyState?.description}
                  action={
                    emptyState?.onAction
                      ? {
                          label: emptyState.actionLabel || t('common.add'),
                          onClick: emptyState.onAction,
                        }
                      : undefined
                  }
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </UiTable>
    </div>
  )
}

export const SubListTable = memo(
  SubListTableComponent
) as typeof SubListTableComponent
