'use client'

import React from 'react'
import { ColumnDef, Table } from '@tanstack/react-table'
import { Grid3X3 } from 'lucide-react'
import { SkeletonCard } from '../../components/skeletons/SkeletonCard'
import { PullToRefresh } from '../../components/utilities/PullToRefresh'
import { MobileCard } from '../MobileCard'
import { DataTableCardActions } from './types'
import type { HeadingLevel } from '../../ui/heading-level'

export interface TableCardsViewProps<TData, TValue> {
  table: Table<TData>
  /** Original (user-provided) column definitions, used by MobileCard. */
  columns: ColumnDef<TData, TValue>[]
  loading: boolean
  manualPagination: boolean
  storePageSize: number
  pageSize: number
  emptyTitle: string
  emptyDescription: string
  /** Semantic level of the empty-state title (default 2). Visual size is unchanged. */
  headingLevel?: HeadingLevel
  onRefresh?: () => void
  cardComponent?: React.ComponentType<{
    data: TData
    onClick?: (data: TData) => void
  }>
  cardActions: DataTableCardActions<TData, TValue>
  handleRowClick: (row: TData) => void
}

/**
 * Mobile/cards view: pull-to-refresh grid of MobileCard (or a custom card
 * component) with skeleton loading and empty state.
 *
 * @internal Extracted from DataTable.tsx (cards view render)
 */
export function TableCardsView<TData, TValue>({
  table,
  columns,
  loading,
  manualPagination,
  storePageSize,
  pageSize,
  emptyTitle,
  emptyDescription,
  headingLevel = 2,
  onRefresh,
  cardComponent: CustomCard,
  cardActions,
  handleRowClick,
}: TableCardsViewProps<TData, TValue>) {
  const Heading = `h${headingLevel}` as const
  return (
    <PullToRefresh
      onRefresh={async () => {
        if (onRefresh) {
          await Promise.resolve(onRefresh())
        }
      }}
    >
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4'>
        {loading ? (
          // Skeleton loading state
          Array.from({
            length: manualPagination
              ? storePageSize
              : table.getState().pagination?.pageSize || pageSize,
          }).map((_, i) => <SkeletonCard key={i} />)
        ) : table.getRowModel().rows.length === 0 ? (
          <div className='col-span-full flex flex-col items-center justify-center py-12 text-center'>
            <Grid3X3 className='h-8 w-8 text-muted-foreground/50' />
            <Heading className='mt-2 text-sm font-semibold'>{emptyTitle}</Heading>
            <p className='text-xs text-muted-foreground mt-1'>
              {emptyDescription}
            </p>
          </div>
        ) : (
          table.getRowModel().rows.map(row => {
            // Use custom card component if provided, otherwise use default MobileCard
            if (CustomCard) {
              return (
                <CustomCard
                  key={row.id}
                  data={row.original}
                  onClick={handleRowClick}
                />
              )
            }

            return (
              <MobileCard
                key={row.id}
                data={row.original}
                columns={columns}
                onSelect={handleRowClick}
                isSelected={row.getIsSelected()}
                actions={cardActions}
              />
            )
          })
        )}
      </div>
    </PullToRefresh>
  )
}
