// ============================================================================
// DATA COMPONENTS
// ============================================================================

export { DataTable } from '../data/DataTable'
export type { DataTableProps, DataTableExportMenuProps } from '../data/DataTable'
export { InfiniteList } from '../data/InfiniteList'
export type { InfiniteListProps } from '../data/InfiniteList'
export { useInfiniteListQuery } from '../hooks/useInfiniteListQuery'
export type { UseInfiniteListQueryReturn } from '../hooks/useInfiniteListQuery'

// Existing exports
export { MobileCard } from '../data/MobileCard'

export type { BulkAction } from '../data/BulkActionsToolbar'

export type { QueryBuilderField } from '../data/QueryBuilder'

export type { FieldType as QueryBuilderFieldType } from '../data/queryBuilderUtils'

// Export & Views
export { ExportMenu } from '../data/ExportMenu'
export type {
  ExportMenuProps,
  ExportFormat,
  ExportLoadAllContext,
} from '../data/ExportMenu'
export { fetchAllPages } from '../data/fetch-all-pages'
export type { FetchAllPagesOptions } from '../data/fetch-all-pages'

export {
  exportToExcel,
  exportToCSV,
  exportToPDF,
  exportTableData,
} from '../data/exportUtils'
export type { ExportOptions, PDFExportOptions } from '../data/exportUtils'

// Actions Architecture Types
export type {
  DataTableActionsConfig,
  ActionConfig,
  CustomAction,
  StandardActionsConfig,
  ActionsDisplayConfig,
  ConfirmDialogConfig,
  ConfirmDialogInput,
  ConfirmDialogOption,
  ActionContext,
  TooltipConfig,
  ButtonVariant,
  BadgeVariant,
} from '../types/actions'

// Virtual Scrolling
export { VirtualDataTable } from '../data/VirtualDataTable'

// ============================================================================
// CRUD COMPONENTS
// ============================================================================

export { withScope } from '../utils/with-scope'
export type { CrudScope } from '../utils/with-scope'
export { SubList } from '../components/crud/sub-list'
export type { SubListField, SubListProps } from '../components/crud/sub-list'
export { EmptyState } from '../components/crud/empty-state'
export type { EmptyStateProps } from '../components/crud/empty-state'
export { QueryErrorState } from '../components/utilities/QueryErrorState'
export type { QueryErrorStateProps } from '../components/utilities/QueryErrorState'

// DataBoundary (ErrorBoundary + Suspense + Empty State)
export { DataBoundary } from '../components/data/DataBoundary'
export type { DataBoundaryProps } from '../components/data/DataBoundary'

// ============================================================================
// MIGRATED COMPONENTS: Selectors, Pickers, Filters, Export
// ============================================================================

// Selectors
export { PopoverSelector } from '../components/selectors'
export type {
  SelectorItem,
  SelectorGroup,
  PopoverSelectorProps,
  PopoverSelectorSingleProps,
  PopoverSelectorMultiProps,
  PopoverSelectorLabels,
} from '../components/selectors'

export { RichSelector, RichSelectorField } from '../components/selectors'
export type {
  RichSelectorValue,
  RichSelectorItem,
  RichSelectorLabels,
  RichSelectorLoadContext,
  RichSelectorProps,
  RichSelectorCommonProps,
  RichSelectorSingleProps,
  RichSelectorMultipleProps,
  RichSelectorRemoteSource,
  RichSelectorLocalSource,
  RichSelectorFieldProps,
  RichSelectorFieldInjectedProps,
  RichSelectorFieldLoadContext,
} from '../components/selectors'

// Pickers (use sub-path `@telamonjs/ui/pickers` for DateRange type)
export {
  DateRangePickerDialog,
  DateTimePickerDialog,
} from '../components/pickers'
export type {
  DateRangePickerDialogProps,
  DateRangeLabels,
  DateTimePickerDialogProps,
  DateTimeLabels,
} from '../components/pickers'

// Filters
export { StatusFilter } from '../components/filters'
export type { StatusFilterProps, StatusOption } from '../components/filters'

// Export Components
export {
  ExportButtons,
  ExportPDFButton,
  ExportExcelButton,
} from '../components/export'
export type {
  ExportColumn,
  ExportLabels,
  ExportButtonsProps,
  ExportPDFButtonProps,
  ExportExcelButtonProps,
} from '../components/export'

// ReportTable (simple progressive-load table)
// NOTE: SimpleTable* aliases live in deprecated-aliases.ts
export { ReportTable } from '../components/data/report-table'

export type {
  ReportTableColumn,
  ReportTableProps,
  ReportTableLabels,
} from '../components/data/report-table'
