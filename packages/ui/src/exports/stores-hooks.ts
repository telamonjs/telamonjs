// ──────────────────────────────────────────────────────────────────────────
// GLOBAL STATE (Auth + Config)
// ──────────────────────────────────────────────────────────────────────────

export type { Session, User, AppConfig } from '../stores/app-store'

// ──────────────────────────────────────────────────────────────────────────
// UI STATE (Sidebar + Menu) - Specialized Stores
// ──────────────────────────────────────────────────────────────────────────
// Re-export from stores (single import path)
export { useTableSorting, useTableState } from '../stores'

// ============================================================================
// HOOKS
// ============================================================================
// All hooks explicitly exported (no wildcards)

export { useUrlSync } from '../hooks/useUrlSync'
export { useTabUrlSync } from '../hooks/useTabUrlSync'
export type {
  UseTabUrlSyncOptions,
  UseTabUrlSyncResult,
} from '../hooks/useTabUrlSync'

export { useCrudMutations } from '../hooks/useCrudMutations'

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================
export { useIsMobile } from '../hooks/use-mobile'

// ============================================================================
// FORM STORE (Zustand Forms)
// ============================================================================
export { useForm, useForms, useFormStore } from '../stores/form-store'

// Hooks
export { useHoverPopover } from '../hooks/use-hover-popover'
export { useDebounce } from '../hooks/use-debounce'

// Unsaved-changes guard
export { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'

/**
 * Reloads the record behind the nearest dialog that provides one (e.g.
 * ViewPortalDialog). Returns `null` outside such a dialog — call sites must
 * handle that case. Typical use: a nested 1:N list (CrudField/SubList) that
 * changes a counter shown in the parent dialog's header.
 */
export { useRecordRefresh } from '../contexts/RecordRefreshContext'
