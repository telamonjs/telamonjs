// ============================================================================
// DASHBOARD SYSTEM
// ============================================================================
// Dashboard Grid
export { DashboardGrid, generateDefaultLayout } from '../dashboard'
export type { DashboardGridProps, Widget } from '../dashboard'

// Dashboard Widgets
export { ChartWidget } from '../dashboard'
export type { ChartWidgetProps, ChartType, ChartDataPoint } from '../dashboard'

// The one StatCard (also on ./cards). The dashboard-widget and
// DashboardStatCard variants were removed in 8.0.
export { StatCard } from '../components/cards'
export type { StatCardProps } from '../components/cards'

// ============================================================================
// DASHBOARD COMPONENTS
// ============================================================================
// Container & Shell
export { DashboardShell } from '../dashboard/DashboardShell'
export { DashboardHeader } from '../dashboard/DashboardHeader'
export { DashboardFullscreen } from '../dashboard/DashboardFullscreen'

// Hooks
export { useAnimatedCounter } from '../dashboard/hooks/useAnimatedCounter'

// Types
export type {
  DashboardShellProps,
  DashboardHeaderProps,
  DashboardFullscreenProps,
  DashboardStatus,
} from '../types/dashboard'

// ============================================================================
// CHARTS
// ============================================================================
export { LineChart } from '../components/charts/LineChart'
export type { LineChartProps } from '../components/charts/LineChart'

export { BarChart } from '../components/charts/BarChart'
export type { BarChartProps } from '../components/charts/BarChart'

export { PieChart } from '../components/charts/PieChart'
export type { PieChartProps } from '../components/charts/PieChart'

export { AreaChart } from '../components/charts/AreaChart'
export type { AreaChartProps } from '../components/charts/AreaChart'

// Lazy-loaded Charts (~80 KB savings via code splitting)
export {
  LineChartLazy,
  BarChartLazy,
  PieChartLazy,
  AreaChartLazy,
} from '../components/charts/lazy'

// ============================================================================
// ADVANCED COMPONENTS
// ============================================================================
// Business Components
export { Timeline } from '../components/business/Timeline'
export type {
  TimelineItem,
  TimelineProps,
} from '../components/business/Timeline'
export { KanbanBoard } from '../components/business/KanbanBoard'
export type {
  KanbanCard,
  KanbanColumn,
  KanbanBoardProps,
} from '../components/business/KanbanBoard'
export { CalendarWithEvents } from '../components/business/CalendarWithEvents'
export type {
  CalendarEvent,
  CalendarWithEventsProps,
} from '../components/business/CalendarWithEvents'

// Charts Components (NOTE: Some already exported above - LineChart, BarChart, PieChart, AreaChart)
export { KPICard } from '../components/charts/KPICard'
export type { KPICardProps } from '../components/charts/KPICard'
export { ProgressTracker } from '../components/charts/ProgressTracker'
export type {
  ProgressStep,
  ProgressTrackerProps,
} from '../components/charts/ProgressTracker'
export { ComparisonTable } from '../components/charts/ComparisonTable'
export type {
  ComparisonColumn,
  ComparisonRow,
  ComparisonTableProps,
} from '../components/charts/ComparisonTable'
