import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { useDataTableInstance } from './useDataTableInstance'
import { useDataTableStore } from '../../stores/datatable-store'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/orders',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

interface Order {
  id: string
  customer: { name: string }
}

const columns: ColumnDef<Order, unknown>[] = [
  { accessorKey: 'customer.name', header: 'Customer' },
]

let tableCounter = 0

function renderInstance(storedField: string) {
  tableCounter += 1
  const tableId = `sort-roundtrip-${tableCounter}`
  const hook = renderHook(() =>
    useDataTableInstance<Order, unknown>({
      tableId,
      data: [{ id: '1', customer: { name: 'Ana' } }],
      columns,
      pageSize: 10,
      manualPagination: true,
      enableMultiSort: true,
      enableSelection: false,
      enableSearch: false,
      defaultViewMode: 'table',
    })
  )
  act(() => {
    useDataTableStore
      .getState()
      .setSorting(tableId, [{ field: storedField, order: 'desc' }])
  })
  return { ...hook, tableId }
}

describe('useDataTableInstance - sort field round-trip', () => {
  it.each(['customer.name', 'customer_name'])(
    'maps a stored %s to the column and toggles that same column',
    storedField => {
      const { result, tableId } = renderInstance(storedField)

      expect(result.current.sorting).toEqual([
        { id: 'customer_name', desc: true },
      ])
      const column = result.current.table.getColumn('customer_name')
      expect(column?.getIsSorted()).toBe('desc')

      act(() => column?.toggleSorting(false))

      // One entry, not a second one for the "unknown" stored field
      expect(useDataTableStore.getState().tables[tableId]?.sorting).toEqual([
        { field: 'customer_name', order: 'asc' },
      ])
    }
  )
})
