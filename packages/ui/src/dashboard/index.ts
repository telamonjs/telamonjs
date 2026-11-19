'use client'

/**
 * Dashboard System
 *
 * Grid layout and widget components for customizable dashboards
 */

export { DashboardGrid, generateDefaultLayout } from './DashboardGrid'
export type { DashboardGridProps, Widget } from './DashboardGrid'

// Widgets - explicit exports (Turbopack fix)
export { ChartWidget } from './widgets/ChartWidget'
export type {
  ChartWidgetProps,
  ChartType,
  ChartDataPoint,
} from './widgets/ChartWidget'
