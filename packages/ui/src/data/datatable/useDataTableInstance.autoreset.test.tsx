/**
 * Regression: "Can't perform a React state update on a component that hasn't
 * mounted yet" on every ListPage/DataTable first load (Next 15 dev overlay).
 *
 * TanStack Table's `autoResetPageIndex` is wired into the row-model memos:
 * the FIRST computation of each row model calls `table._autoResetPageIndex()`,
 * which only *registers* (via microtask) on the first call and schedules a
 * `resetPageIndex()` (→ React setState) on subsequent calls. That assumes all
 * row models are first computed in the same task. With React's time-sliced
 * (concurrent/hydration) rendering, the DataTable fiber renders (registering),
 * React yields (the registration microtask runs), and then child fibers
 * (TableToolbar → getFilteredRowModel, TableDesktopView → getRowModel) compute
 * the remaining row models for the first time → a `resetPageIndex()` setState
 * is scheduled against a DataTable fiber that has not been committed yet.
 *
 * The fix eagerly computes the full row-model chain inside the hook's own
 * render, so every `_autoResetPageIndex` registration happens in ONE task and
 * later child reads are cache hits.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { useDataTableInstance } from './useDataTableInstance'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/users',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

interface Row {
  id: string
  name: string
}

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
]
const data: Row[] = [
  { id: '1', name: 'A' },
  { id: '2', name: 'B' },
]

const flushMicrotasks = () => new Promise<void>(r => setTimeout(r, 0))

describe('useDataTableInstance - autoResetPageIndex timing', () => {
  it('does not schedule a page-index reset when a child reads the row model after a yield', async () => {
    const { result } = renderHook(() => {
      const instance = useDataTableInstance<Row, unknown>({
        tableId: 'autoreset-test',
        data,
        columns,
        pageSize: 10,
        manualPagination: false,
        enableMultiSort: false,
        enableSelection: false,
        enableSearch: true,
      })
      // What DataTable itself reads during its own render (selection count):
      // first computation of the filtered + core row models.
      instance.table.getFilteredSelectedRowModel()
      return instance
    })
    const { table } = result.current

    // Simulates React yielding between the DataTable render and its children:
    // TanStack's registration microtask runs here.
    await flushMicrotasks()

    const resetSpy = vi.spyOn(table, 'resetPageIndex')

    // Child fibers (TableToolbar / TableDesktopView) read the row models.
    table.getFilteredRowModel()
    table.getRowModel()
    await flushMicrotasks()

    expect(resetSpy).not.toHaveBeenCalled()
  })
})
