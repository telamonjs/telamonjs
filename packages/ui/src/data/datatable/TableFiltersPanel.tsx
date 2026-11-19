'use client'

import { ColumnDef, Table } from '@tanstack/react-table'
import { usePresence } from '../../hooks/use-presence'
import { ColumnFilterConfig } from '../../types/filters'
import { DataTableColumnFilter } from '../../components/data/DataTableColumnFilter'
import { getColumnLabel } from '../column-label'

export interface TableFiltersPanelProps<TData> {
  table: Table<TData>
  tableId: string
  showFilters: boolean
  filterOptions?: ColumnFilterConfig
}

/**
 * Animated advanced-filters panel listing up to 6 filterable columns,
 * each rendered through DataTableColumnFilter (store-driven).
 *
 * @internal Extracted from DataTable.tsx (advanced filters render)
 */
export function TableFiltersPanel<TData>({
  table,
  tableId,
  showFilters,
  filterOptions,
}: TableFiltersPanelProps<TData>) {
  const { mounted, state } = usePresence(showFilters, 150)
  return (
    <>
      {mounted && (
        <div
          data-state={state}
          className='overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150 motion-reduce:animate-none'
        >
          <div className='rounded-lg border bg-muted/50 p-4'>
            <div className='grid gap-4 md:grid-cols-3'>
              {table
                .getAllColumns()
                .filter(column => {
                  // Filter out columns that explicitly disable filtering
                  const columnDef = column.columnDef as ColumnDef<
                    TData,
                    unknown
                  > & {
                    enableColumnFilter?: boolean
                  }
                  if (columnDef.enableColumnFilter === false) {
                    return false
                  }
                  return column.getCanFilter()
                })
                .slice(0, 6)
                .map(column => {
                  const columnHeader =
                    getColumnLabel(column.columnDef) ?? column.id

                  // Get filter options for this column (if provided)
                  const columnOptions = filterOptions?.[column.id]

                  return (
                    <div key={column.id} className='space-y-2'>
                      <label className='text-sm font-medium'>
                        {columnHeader}
                      </label>
                      <DataTableColumnFilter
                        column={column}
                        title={columnHeader}
                        options={columnOptions}
                        tableId={tableId}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
