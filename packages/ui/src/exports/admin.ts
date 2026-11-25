// ============================================================================
// ADMIN BUILDING BLOCKS — data-agnostic screens every admin hand-rolls
// (roles × permissions, audit trail). Pure UI: the app fetches and persists.
// ============================================================================

export { PermissionMatrix } from '../components/admin/PermissionMatrix'
export type {
  PermissionMatrixProps,
  PermissionMatrixRole,
  PermissionMatrixPermission,
} from '../components/admin/PermissionMatrix'
export { AuditChangesViewer } from '../components/admin/AuditChangesViewer'
export type { AuditChangesViewerProps } from '../components/admin/AuditChangesViewer'
