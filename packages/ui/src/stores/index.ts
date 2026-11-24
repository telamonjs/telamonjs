// ============================================================================
// App Store (Global State - Auth & Config Only)
// ============================================================================
export {
  useAppStore,
  appStore,
  getAppState,
  subscribeToStore,
} from './app-store'

// Export types
export type {
  AppStore,
  AuthSlice,
  ConfigSlice,
  User,
  Session,
  AppConfig,
} from './app-store'

// ============================================================================
// UI State Stores (Specialized - Sidebar & Menu)
// ============================================================================

// Sidebar Store
export { useSidebarStore } from './sidebar-store'
export type { SidebarStoreState, SidebarState } from './sidebar-store'

// Sidebar hooks (re-export for convenience)
export {
  useSidebarState,
  useIsMobileOpen,
  useIsCompact,
  useIsExpanded,
  useIsHidden,
  useSidebarActions,
} from './sidebar-store'

// Menu Store
export { useMenuStore } from './menu-store'
export type { MenuState, MenuLevel, MenuStackItem } from './menu-store'

// Menu hooks (re-export for convenience)
export {
  useMenuStack,
  useCurrentSection,
  useIsNavigating,
  useMenuActions,
  useMenuDebug,
} from './menu-store'

// ============================================================================
// DataTable store (component-specific UI state)
// ============================================================================
export {
  useDataTableStore,
  useTableColumnFilters,
  useTableColumnFilter,
  useTableGlobalFilter,
  useTableSorting,
  useTablePage,
  useTablePageSize,
  useTableState,
  useTableColumnVisibility,
  useTableRowSelection,
  useTableViewMode,
  useTableCurrentViewMode,
  useTableIsFullscreen,
  useTableShowFilters,
  useDataTableActions,
} from './datatable-store'
