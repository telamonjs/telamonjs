import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { useMemo } from 'react'
import { SortField } from '../types/pagination'

// UI state types
type ViewMode = 'compact' | 'comfortable' | 'spacious'
type TableViewMode = 'table' | 'cards'
type VisibilityState = Record<string, boolean>

// State por tabela individual
interface TableState {
  // Data state
  // `any` kept intentionally: column filter values are genuinely heterogeneous
  // (string, number, boolean, array, range object) and this type is exported
  // publicly via useTableColumnFilters — narrowing would need a breaking-change review.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columnFilters: Record<string, any>
  globalFilter: string
  sorting: SortField[]
  page: number
  pageSize: number

  // UI state
  columnVisibility: VisibilityState
  rowSelection: Record<string, boolean>
  viewMode: ViewMode
  currentViewMode: TableViewMode
  isFullscreen: boolean
  showFilters: boolean
}

// Store global com todas as tabelas
interface DataTableStoreState {
  // State por table ID
  tables: Record<string, TableState>

  // Data actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see TableState.columnFilters
  setColumnFilter: (tableId: string, columnId: string, value: any) => void
  removeColumnFilter: (tableId: string, columnId: string) => void
  clearColumnFilters: (tableId: string) => void
  setGlobalFilter: (tableId: string, value: string) => void
  setSorting: (tableId: string, sorting: SortField[]) => void
  setPagination: (tableId: string, page: number, pageSize: number) => void
  setPage: (tableId: string, page: number) => void
  setPageSize: (tableId: string, pageSize: number) => void

  // UI actions
  setColumnVisibility: (tableId: string, visibility: VisibilityState) => void
  setRowSelection: (tableId: string, selection: Record<string, boolean>) => void
  setViewMode: (tableId: string, mode: ViewMode) => void
  setCurrentViewMode: (tableId: string, mode: TableViewMode) => void
  toggleFullscreen: (tableId: string) => void
  setShowFilters: (tableId: string, show: boolean) => void

  resetTable: (tableId: string) => void
  initTable: (tableId: string, initialState?: Partial<TableState>) => void

  // Computed getters
  getTableState: (tableId: string) => TableState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see TableState.columnFilters
  getColumnFilters: (tableId: string) => Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see TableState.columnFilters
  getColumnFilter: (tableId: string, columnId: string) => any
  getGlobalFilter: (tableId: string) => string
  getSorting: (tableId: string) => SortField[]
  getPage: (tableId: string) => number
  getPageSize: (tableId: string) => number
}

// Stable fallback constants (avoids creating new objects/arrays)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see TableState.columnFilters
const EMPTY_FILTERS: Record<string, any> = {}
const EMPTY_SORTING: SortField[] = []
const EMPTY_STRING = ''
const EMPTY_VISIBILITY: VisibilityState = {}
const EMPTY_SELECTION: Record<string, boolean> = {}

// Default state for a table
const defaultTableState: TableState = {
  // Data state
  columnFilters: EMPTY_FILTERS,
  globalFilter: EMPTY_STRING,
  sorting: EMPTY_SORTING,
  page: 1,
  pageSize: 10,

  // UI state
  columnVisibility: EMPTY_VISIBILITY,
  rowSelection: EMPTY_SELECTION,
  viewMode: 'comfortable',
  currentViewMode: 'table',
  isFullscreen: false,
  showFilters: false,
}

export const useDataTableStore = create<DataTableStoreState>()(
  subscribeWithSelector((set, get) => ({
    tables: {},

    // Initialize table with optional initial state
    initTable: (tableId, initialState = {}) => {
      set(state => {
        // Don't reinitialize if already exists
        if (state.tables[tableId]) {
          return state
        }
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...defaultTableState,
              ...initialState,
            },
          },
        }
      })
    },

    // Set individual column filter
    setColumnFilter: (tableId, columnId, value) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        const newFilters = { ...table.columnFilters }

        if (value === undefined || value === null || value === '') {
          delete newFilters[columnId]
        } else {
          newFilters[columnId] = value
        }

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columnFilters: newFilters,
              page: 1, // Reset to first page when filter changes
            },
          },
        }
      })
    },

    // Remove specific column filter
    removeColumnFilter: (tableId, columnId) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        const newFilters = { ...table.columnFilters }
        delete newFilters[columnId]

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columnFilters: newFilters,
            },
          },
        }
      })
    },

    // Clear all column filters
    clearColumnFilters: tableId => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columnFilters: {},
            },
          },
        }
      })
    },

    // Set global filter (search)
    setGlobalFilter: (tableId, value) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              globalFilter: value,
              page: 1, // Reset to first page when search changes
            },
          },
        }
      })
    },

    // Set sorting
    setSorting: (tableId, sorting) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              sorting,
              page: 1,
            },
          },
        }
      })
    },

    // Set pagination (both page and pageSize)
    setPagination: (tableId, page, pageSize) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              page,
              pageSize,
            },
          },
        }
      })
    },

    // Set page only
    setPage: (tableId, page) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              page,
            },
          },
        }
      })
    },

    // Set page size only
    setPageSize: (tableId, pageSize) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              pageSize,
              page: 1, // Reset to first page when page size changes
            },
          },
        }
      })
    },

    // UI Actions
    setColumnVisibility: (tableId, visibility) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columnVisibility: visibility,
            },
          },
        }
      })
    },

    setRowSelection: (tableId, selection) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              rowSelection: selection,
            },
          },
        }
      })
    },

    setViewMode: (tableId, mode) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              viewMode: mode,
            },
          },
        }
      })
    },

    setCurrentViewMode: (tableId, mode) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              currentViewMode: mode,
            },
          },
        }
      })
    },

    toggleFullscreen: tableId => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              isFullscreen: !table.isFullscreen,
            },
          },
        }
      })
    },

    setShowFilters: (tableId, show) => {
      set(state => {
        const table = state.tables[tableId] || defaultTableState
        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              showFilters: show,
            },
          },
        }
      })
    },

    // Reset table to default state
    resetTable: tableId => {
      set(state => {
        const newTables = { ...state.tables }
        delete newTables[tableId]
        return { tables: newTables }
      })
    },

    // Getters
    getTableState: tableId => {
      return get().tables[tableId] || defaultTableState
    },

    getColumnFilters: tableId => {
      return get().tables[tableId]?.columnFilters || {}
    },

    getColumnFilter: (tableId, columnId) => {
      return get().tables[tableId]?.columnFilters[columnId]
    },

    getGlobalFilter: tableId => {
      return get().tables[tableId]?.globalFilter || ''
    },

    getSorting: tableId => {
      return get().tables[tableId]?.sorting || []
    },

    getPage: tableId => {
      return get().tables[tableId]?.page || 1
    },

    getPageSize: tableId => {
      return get().tables[tableId]?.pageSize || 10
    },
  }))
)

// Selector factories - eliminate repetition in the hooks below
// Performance: primitive selectors use value comparison (===)
//              Shallow selectors use useShallow for shallow comparison of objects/arrays
function createPrimitiveSelector<T>(key: keyof TableState, defaultValue: T) {
  return (tableId: string) =>
    useDataTableStore(
      state => (state.tables[tableId]?.[key] ?? defaultValue) as T
    )
}

function createShallowSelector<T>(key: keyof TableState, defaultValue: T) {
  return (tableId: string) =>
    useDataTableStore(
      useShallow(state => (state.tables[tableId]?.[key] ?? defaultValue) as T)
    )
}

// Object/array selectors (useShallow - evita re-renders quando estruturalmente iguais)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see TableState.columnFilters
export const useTableColumnFilters = createShallowSelector<Record<string, any>>(
  'columnFilters',
  EMPTY_FILTERS
)
export const useTableSorting = createShallowSelector<SortField[]>(
  'sorting',
  EMPTY_SORTING
)
export const useTableColumnVisibility = createShallowSelector<VisibilityState>(
  'columnVisibility',
  EMPTY_VISIBILITY
)
export const useTableRowSelection = createShallowSelector<
  Record<string, boolean>
>('rowSelection', EMPTY_SELECTION)

// Primitive selectors (string, number, boolean - value comparison)
export const useTableGlobalFilter = createPrimitiveSelector<string>(
  'globalFilter',
  EMPTY_STRING
)
export const useTablePage = createPrimitiveSelector<number>('page', 1)
export const useTablePageSize = createPrimitiveSelector<number>('pageSize', 10)
export const useTableViewMode = createPrimitiveSelector<ViewMode>(
  'viewMode',
  'comfortable'
)
export const useTableCurrentViewMode = createPrimitiveSelector<TableViewMode>(
  'currentViewMode',
  'table'
)
export const useTableIsFullscreen = createPrimitiveSelector<boolean>(
  'isFullscreen',
  false
)
export const useTableShowFilters = createPrimitiveSelector<boolean>(
  'showFilters',
  false
)

// Special selectors (extra params or full state - cannot use factory)
export const useTableColumnFilter = (tableId: string, columnId: string) =>
  useDataTableStore(state => state.tables[tableId]?.columnFilters[columnId])

export const useTableState = (tableId: string) =>
  useDataTableStore(
    useShallow(state => state.tables[tableId] ?? defaultTableState)
  )

// Action hooks: Zustand actions are stable, so they come from getState()
// without subscribing. The object only changes with tableId (subscribing
// re-rendered every caller and rebuilt this object on any change to any table,
// re-running the effects that depend on it).
export const useDataTableActions = (tableId: string) => {
  return useMemo(() => {
    const store = useDataTableStore.getState()
    return {
      // Data actions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see TableState.columnFilters
      setColumnFilter: (columnId: string, value: any) =>
        store.setColumnFilter(tableId, columnId, value),
      removeColumnFilter: (columnId: string) =>
        store.removeColumnFilter(tableId, columnId),
      clearColumnFilters: () => store.clearColumnFilters(tableId),
      setGlobalFilter: (value: string) => store.setGlobalFilter(tableId, value),
      setSorting: (sorting: SortField[]) => store.setSorting(tableId, sorting),
      setPagination: (page: number, pageSize: number) =>
        store.setPagination(tableId, page, pageSize),
      setPage: (page: number) => store.setPage(tableId, page),
      setPageSize: (pageSize: number) => store.setPageSize(tableId, pageSize),

      // UI actions
      setColumnVisibility: (visibility: Record<string, boolean>) =>
        store.setColumnVisibility(tableId, visibility),
      setRowSelection: (selection: Record<string, boolean>) =>
        store.setRowSelection(tableId, selection),
      setViewMode: (mode: ViewMode) => store.setViewMode(tableId, mode),
      setCurrentViewMode: (mode: TableViewMode) =>
        store.setCurrentViewMode(tableId, mode),
      toggleFullscreen: () => store.toggleFullscreen(tableId),
      setShowFilters: (show: boolean) => store.setShowFilters(tableId, show),

      resetTable: () => store.resetTable(tableId),
      initTable: (initialState?: Partial<TableState>) =>
        store.initTable(tableId, initialState),
    }
  }, [tableId])
}
