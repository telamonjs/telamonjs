'use client'

// Standard exports (included in main bundle)
export { LineChart } from './LineChart'
export type { ChartData, LineChartProps } from './LineChart'

export { BarChart } from './BarChart'
export type { BarChartProps } from './BarChart'

export { PieChart } from './PieChart'
export type { PieChartProps } from './PieChart'

export { AreaChart } from './AreaChart'
export type { AreaChartProps } from './AreaChart'

export { KPICard } from './KPICard'
export type { KPICardProps } from './KPICard'

export { ProgressTracker } from './ProgressTracker'
export type { ProgressStep, ProgressTrackerProps } from './ProgressTracker'

export { ComparisonTable } from './ComparisonTable'
export type {
  ComparisonColumn,
  ComparisonRow,
  ComparisonTableProps,
} from './ComparisonTable'

// Lazy-loaded exports (code-split, ~80 KB savings)
export {
  LineChartLazy,
  BarChartLazy,
  PieChartLazy,
  AreaChartLazy,
} from './lazy'
