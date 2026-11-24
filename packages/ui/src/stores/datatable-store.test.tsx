import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useDataTableStore,
  useTableColumnFilters,
  useTableColumnFilter,
  useTableGlobalFilter,
  useTablePage,
  useTablePageSize,
  useTableSorting,
  useTableState,
  useTableViewMode,
  useTableIsFullscreen,
} from './datatable-store'

const store = () => useDataTableStore.getState()
const table = (id = 't1') => store().getTableState(id)

beforeEach(() => {
  useDataTableStore.setState({ tables: {} })
})

describe('datatable-store', () => {
  describe('State Management', () => {
    it('initTable seeds defaults merged with the initial state', () => {
      store().initTable('t1', { pageSize: 25, viewMode: 'compact' })

      expect(table()).toMatchObject({
        page: 1,
        pageSize: 25,
        viewMode: 'compact',
        currentViewMode: 'table',
        globalFilter: '',
        columnFilters: {},
        sorting: [],
        isFullscreen: false,
        showFilters: false,
      })
    })

    it('initTable does not overwrite a table that already exists', () => {
      store().initTable('t1')
      store().setPage('t1', 4)
      store().initTable('t1', { page: 1, pageSize: 50 })

      expect(table().page).toBe(4)
      expect(table().pageSize).toBe(10)
    })

    it('setColumnFilter stores the value and returns to the first page', () => {
      store().setPage('t1', 3)
      store().setColumnFilter('t1', 'status', 'active')

      expect(table().columnFilters).toEqual({ status: 'active' })
      expect(table().page).toBe(1)
    })

    it.each([undefined, null, ''])(
      'setColumnFilter with %j removes the filter',
      empty => {
        store().setColumnFilter('t1', 'status', 'active')
        store().setColumnFilter('t1', 'status', empty)

        expect(table().columnFilters).toEqual({})
      }
    )

    it('setColumnFilter keeps falsy but meaningful values (0, false)', () => {
      store().setColumnFilter('t1', 'count', 0)
      store().setColumnFilter('t1', 'archived', false)

      expect(table().columnFilters).toEqual({ count: 0, archived: false })
    })

    it('removeColumnFilter drops only that column; clearColumnFilters drops all', () => {
      store().setColumnFilter('t1', 'a', 1)
      store().setColumnFilter('t1', 'b', 2)

      store().removeColumnFilter('t1', 'a')
      expect(table().columnFilters).toEqual({ b: 2 })

      store().clearColumnFilters('t1')
      expect(table().columnFilters).toEqual({})
    })

    it('search, sorting and page size changes reset to the first page', () => {
      const changes: Array<() => void> = [
        () => store().setGlobalFilter('t1', 'ana'),
        () => store().setSorting('t1', [{ field: 'name', order: 'desc' }]),
        () => store().setPageSize('t1', 50),
      ]
      for (const change of changes) {
        store().setPage('t1', 5)
        change()
        expect(table().page).toBe(1)
      }
      expect(table()).toMatchObject({
        globalFilter: 'ana',
        sorting: [{ field: 'name', order: 'desc' }],
        pageSize: 50,
      })
    })

    it('setPage and setPagination move without resetting anything else', () => {
      store().setGlobalFilter('t1', 'ana')
      store().setPage('t1', 3)
      expect(table()).toMatchObject({ page: 3, globalFilter: 'ana' })

      store().setPagination('t1', 7, 100)
      expect(table()).toMatchObject({ page: 7, pageSize: 100, globalFilter: 'ana' })
    })

    it('UI actions update their own slice', () => {
      store().setColumnVisibility('t1', { email: false })
      store().setRowSelection('t1', { '1': true })
      store().setViewMode('t1', 'spacious')
      store().setCurrentViewMode('t1', 'cards')
      store().setShowFilters('t1', true)

      expect(table()).toMatchObject({
        columnVisibility: { email: false },
        rowSelection: { '1': true },
        viewMode: 'spacious',
        currentViewMode: 'cards',
        showFilters: true,
      })
    })

    it('toggleFullscreen flips the flag each call', () => {
      store().toggleFullscreen('t1')
      expect(table().isFullscreen).toBe(true)
      store().toggleFullscreen('t1')
      expect(table().isFullscreen).toBe(false)
    })

    it('keeps tables isolated from each other', () => {
      store().setGlobalFilter('t1', 'ana')
      store().setPage('t2', 9)

      expect(table('t1')).toMatchObject({ globalFilter: 'ana', page: 1 })
      expect(table('t2')).toMatchObject({ globalFilter: '', page: 9 })
    })

    it('resetTable drops the table so the next read is the default state', () => {
      store().setGlobalFilter('t1', 'ana')
      store().setPage('t2', 2)
      store().resetTable('t1')

      expect(store().tables['t1']).toBeUndefined()
      expect(table('t1').globalFilter).toBe('')
      expect(table('t2').page).toBe(2)
    })

    it('getters return defaults for an unknown table', () => {
      expect(store().getColumnFilters('nope')).toEqual({})
      expect(store().getColumnFilter('nope', 'x')).toBeUndefined()
      expect(store().getGlobalFilter('nope')).toBe('')
      expect(store().getSorting('nope')).toEqual([])
      expect(store().getPage('nope')).toBe(1)
      expect(store().getPageSize('nope')).toBe(10)
    })

    it('getters read the current values', () => {
      store().setColumnFilter('t1', 'status', 'active')
      store().setSorting('t1', [{ field: 'name', order: 'asc' }])
      store().setPagination('t1', 2, 20)

      expect(store().getColumnFilter('t1', 'status')).toBe('active')
      expect(store().getSorting('t1')).toEqual([{ field: 'name', order: 'asc' }])
      expect(store().getPage('t1')).toBe(2)
      expect(store().getPageSize('t1')).toBe(20)
    })
  })

  describe('Rendering (selector hooks)', () => {
    it('return defaults for a table that was never initialised', () => {
      const { result } = renderHook(() => ({
        page: useTablePage('t1'),
        pageSize: useTablePageSize('t1'),
        search: useTableGlobalFilter('t1'),
        viewMode: useTableViewMode('t1'),
        fullscreen: useTableIsFullscreen('t1'),
        sorting: useTableSorting('t1'),
        filters: useTableColumnFilters('t1'),
      }))

      expect(result.current).toEqual({
        page: 1,
        pageSize: 10,
        search: '',
        viewMode: 'comfortable',
        fullscreen: false,
        sorting: [],
        filters: {},
      })
    })

    it('follow store updates', () => {
      const { result } = renderHook(() => ({
        page: useTablePage('t1'),
        status: useTableColumnFilter('t1', 'status'),
      }))

      act(() => {
        store().setColumnFilter('t1', 'status', 'active')
        store().setPage('t1', 4)
      })

      expect(result.current).toEqual({ page: 4, status: 'active' })
    })

    // Regression guard: a fresh {} / [] fallback per render makes
    // useSyncExternalStore loop ("getSnapshot should be cached").
    it('keep the same fallback reference across renders for unknown tables', () => {
      const { result, rerender } = renderHook(() => ({
        filters: useTableColumnFilters('t1'),
        sorting: useTableSorting('t1'),
        state: useTableState('t1'),
      }))
      const first = result.current
      rerender()

      expect(result.current.filters).toBe(first.filters)
      expect(result.current.sorting).toBe(first.sorting)
      expect(result.current.state).toBe(first.state)
    })

    it('do not re-render when another table changes', () => {
      let renders = 0
      renderHook(() => {
        renders++
        return [useTablePage('t1'), useTableColumnFilters('t1'), useTableState('t1')]
      })
      const before = renders

      act(() => {
        store().setPage('t2', 3)
        store().setColumnFilter('t2', 'x', 1)
      })

      expect(renders).toBe(before)
    })

    it('useTableColumnFilters does not re-render on a structurally equal update', () => {
      store().setColumnFilter('t1', 'status', 'active')
      let renders = 0
      const { result } = renderHook(() => {
        renders++
        return useTableColumnFilters('t1')
      })
      const before = renders

      // Same filter again: a new object with the same entries
      act(() => store().setColumnFilter('t1', 'status', 'active'))

      expect(renders).toBe(before)
      expect(result.current).toEqual({ status: 'active' })
    })
  })
})
