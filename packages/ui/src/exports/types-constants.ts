// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

export type { SystemConfig } from '../types/system-config'
export type { IconName } from '../utils/icon'

// Pagination Types
export type {
  PaginationParams,
  PaginatedResponse,
  SortField,
} from '../types/pagination'
export { createPaginatedResponse, asQueryFn } from '../types/pagination'

// Filter Types
export type { FilterOption, ColumnFilterConfig } from '../types/filters'

// CRUD Configuration Types
export type {
  ModuleMetadata,
  ListConfig,
  ExportAllOptions,
  CrudColumnDef,
  FormConfig,
  QueryConfig,
  MutationConfig,
  MutationsConfig,
  DialogConfig,
  DialogsConfig,
  PagesConfig,
  CrudConfig,
  CrudConfigWithAnyForm,
  CrudPermissions,
  ToolbarFilterOption,
  ToolbarFilterConfig,
  ToolbarConfig,
} from '../types/crud'

// Dialog Header Types
export type {
  ColorPreset,
  StatItem,
  HeaderBadgeConfig,
  HeaderStatsConfig,
  DialogHeaderConfig,
  DialogHeaderProps,
  StatsGridProps,
} from '../types/dialog-header'

// Menu Types
export type {
  MenuItem,
  SingleMenuItem,
  GroupMenuItem,
  SeparatorMenuItem,
  MenuItemType,
  MenuVariant,
  IconComponent,
} from '../types/menu'

// ============================================================================
// SPACING & DENSITY
// ============================================================================

export type {
  Density,
  GapSize,
  DialogSize,
  DialogHeight,
  FieldLayout,
  CardFieldLayout,
} from '../utils/spacing'

// ============================================================================
// VERSION
// ============================================================================
export const version = '1.5.1'
