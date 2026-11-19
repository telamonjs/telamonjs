// ============================================================================
// ADDITIONAL COMPONENTS
// ============================================================================
export { CardLink } from '../components/cards/CardLink'
export {
  ErrorBoundary,
  DefaultErrorFallback,
  withErrorBoundary,
} from '../components/utilities/ErrorBoundary'

// ============================================================================
// DETAIL PAGE COMPONENTS
// ============================================================================
// New Detail namespace
export {
  DetailLayout,
  DetailCard,
  DetailField,
  DetailAvatar,
  DetailStatsGrid,
  DetailAlert,
  DetailStatus,
  DetailActions,
} from '../components/detail'

export type {
  DetailLayoutProps,
  DetailLayoutMode,
  DetailCardProps,
  DetailFieldProps,
  DetailAvatarProps,
  StatConfig,
  DetailStatsGridProps,
  DetailAlertProps,
  StatusConfig,
  DetailStatusProps,
  ActionButton,
  DetailActionsProps,
} from '../components/detail'

// Detail: SemanticCard & SemanticField
// NOTE: ColoredCard/Field aliases live in deprecated-aliases.ts
export { SemanticCard, colorStyles } from '../components/detail/SemanticCard'
export type {
  SemanticCardProps,
  CardColor,
} from '../components/detail/SemanticCard'
export { SemanticField } from '../components/detail/SemanticField'
export type { SemanticFieldProps } from '../components/detail/SemanticField'

// ============================================================================
// REPORT COMPONENTS
// ============================================================================
export { ReportLayout } from '../components/reports/ReportLayout'
export type { ReportLayoutProps } from '../components/reports/ReportLayout'

// ============================================================================
// MIGRATED COMPONENTS: Cards
// ============================================================================
// Only QuickAction components exported here (StatCard/StatsGrid conflict with existing dashboard exports)
export { QuickActionCard, QuickActionGrid } from '../components/cards'
export type {
  QuickActionCardProps,
  QuickActionGridProps,
} from '../components/cards'
