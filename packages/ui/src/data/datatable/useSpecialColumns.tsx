'use client'

import React, { useMemo } from 'react'
import { ColumnDef, Row } from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils'
import { Checkbox } from '../../ui/checkbox'
import { DataTableActions } from '../../components/data/DataTableActions'
import { DataTableActionsConfig } from '../../types/actions'
import { useTelamonjsT } from '../../i18n/use-t'

/**
 * Expand state handed to the table through `useReactTable({ meta })` so the
 * expand cell reads it at render time instead of closing over it (which would
 * rebuild every column — and remount every special cell — on each toggle).
 * @internal
 */
export interface ExpandTableMeta {
  expandedRows: Record<string, boolean>
  setExpandedRows: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

function readExpandMeta(meta: unknown): ExpandTableMeta | undefined {
  if (typeof meta !== 'object' || meta === null) return undefined
  const m = meta as Partial<ExpandTableMeta>
  return m.expandedRows && m.setExpandedRows
    ? (m as ExpandTableMeta)
    : undefined
}

export interface UseSpecialColumnsOptions<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  enableRowSelection: boolean
  enableBulkActions: boolean
  enableSelection: boolean
  enableExpandableRows: boolean
  expandableRowContent?: (row: TData) => React.ReactNode
  enableActions: boolean
  actionsConfig?: DataTableActionsConfig<TData>
}

/**
 * Injects DataTable's special columns into the user-provided definitions:
 * 1. Selection checkbox column (first) when row selection is enabled
 * 2. Expand chevron column (second) when expandable rows are enabled
 * 3. Actions column (last) when actionsConfig is provided and no 'actions'
 *    column already exists
 *
 * @internal Extracted from DataTable.tsx (columnsWithSpecialColumns)
 */
export function useSpecialColumns<TData, TValue>({
  columns,
  enableRowSelection,
  enableBulkActions,
  enableSelection,
  enableExpandableRows,
  expandableRowContent,
  enableActions,
  actionsConfig,
}: UseSpecialColumnsOptions<TData, TValue>): ColumnDef<TData, TValue>[] {
  const t = useTelamonjsT()
  return useMemo(() => {
    let finalColumns = [...columns]

    // 1. Add checkbox column (first) if row selection is enabled
    if (enableRowSelection || (enableBulkActions && enableSelection)) {
      const checkboxColumn: ColumnDef<TData, TValue> = {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t('list.selectAll')}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label={t('list.selectRow')}
            onClick={e => e.stopPropagation()} // Prevent row click
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
      }
      finalColumns = [checkboxColumn, ...finalColumns]
    }

    // 2. Add expand column (second) if expandable rows are enabled
    if (enableExpandableRows && expandableRowContent) {
      const expandColumn: ColumnDef<TData, TValue> = {
        id: 'expand',
        header: () => null,
        cell: ({ row, table }) => {
          const rowId =
            table.options.getRowId?.(row.original, row.index) ||
            String(row.index)
          const expand = readExpandMeta(table.options.meta)
          const isExpanded = expand?.expandedRows[rowId]
          return (
            <button
              type='button'
              onClick={e => {
                e.stopPropagation()
                expand?.setExpandedRows(prev => ({
                  ...prev,
                  [rowId]: !prev[rowId],
                }))
              }}
              className='p-1 hover:bg-muted rounded transition-colors'
              aria-label={isExpanded ? 'Recolher linha' : 'Expandir linha'}
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </button>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
      }
      finalColumns = [finalColumns[0], expandColumn, ...finalColumns.slice(1)]
    }

    // 3. Add actions column (last) if enabled and not already present
    const hasActionsColumn = finalColumns.some(col => col.id === 'actions')
    if (!hasActionsColumn && enableActions && actionsConfig) {
      const actionsColumn: ColumnDef<TData, TValue> = {
        id: 'actions',
        // Screen-reader-only header: an empty <th> fails the axe rule
        // empty-table-header. Export ignores this column by id.
        header: () => (
          <span className='sr-only'>{t('list.actionsColumn')}</span>
        ),
        cell: ({ row }) => (
          <DataTableActions
            row={
              row as Row<TData> & {
                original: TData & { id: string | number | BigInt }
              }
            }
            config={actionsConfig}
          />
        ),
      }
      finalColumns = [...finalColumns, actionsColumn]
    }

    return finalColumns
  }, [
    columns,
    enableRowSelection,
    enableBulkActions,
    enableSelection,
    enableExpandableRows,
    expandableRowContent,
    enableActions,
    actionsConfig,
    t,
  ])
}
