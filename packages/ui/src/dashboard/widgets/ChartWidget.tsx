'use client'

import React, { ReactNode, Suspense } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../ui/card'
import { ChartSkeleton } from '../../components/charts/lazy'
import { cn } from '../../utils'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

// Recharts (~180 KB) is loaded lazily so dashboards that never render a
// chart widget do not pull it into the initial bundle.
const ChartWidgetChart = React.lazy(() =>
  import('./ChartWidgetChart').then(mod => ({ default: mod.ChartWidgetChart }))
)

export type ChartType = 'line' | 'bar' | 'pie'

export interface ChartDataPoint {
  [key: string]: string | number
}

export interface ChartWidgetProps {
  /**
   * Widget title
   */
  title: I18nText

  /**
   * Widget description
   */
  description?: I18nText

  /**
   * Chart data
   */
  data: ChartDataPoint[]

  /**
   * Chart type
   * @default 'line'
   */
  type?: ChartType

  /**
   * Data key for X axis
   * @default 'name'
   */
  xAxisKey?: string

  /**
   * Data keys for Y axis (for line/bar charts)
   * @default ['value']
   */
  dataKeys?: string[]

  /**
   * Data key for pie chart values
   * @default 'value'
   */
  valueKey?: string

  /**
   * Data key for pie chart labels
   * @default 'name'
   */
  nameKey?: string

  /**
   * Chart colors
   */
  colors?: string[]

  /**
   * Chart height in pixels
   * @default 300
   */
  height?: number

  /**
   * Additional content (e.g., filters, actions)
   */
  headerAction?: ReactNode

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Show legend
   * @default true
   */
  showLegend?: boolean

  /**
   * Show grid
   * @default true
   */
  showGrid?: boolean
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
]

/**
 * ChartWidget - Recharts wrapper widget
 *
 * Displays line, bar, or pie charts with customizable data.
 *
 * @example
 * ```tsx
 * const data = [
 *   { month: 'Jan', revenue: 4000, expenses: 2400 },
 *   { month: 'Feb', revenue: 3000, expenses: 1398 },
 *   { month: 'Mar', revenue: 2000, expenses: 9800 },
 * ]
 *
 * <ChartWidget
 *   title="Revenue Overview"
 *   type="line"
 *   data={data}
 *   xAxisKey="month"
 *   dataKeys={['revenue', 'expenses']}
 * />
 * ```
 */
export function ChartWidget({
  title,
  description,
  data,
  type = 'line',
  xAxisKey = 'name',
  dataKeys = ['value'],
  valueKey = 'value',
  nameKey = 'name',
  colors = DEFAULT_COLORS,
  height = 300,
  headerAction,
  className,
  showLegend = true,
  showGrid = true,
}: ChartWidgetProps) {
  const text = useText()
  return (
    <Card className={cn('chart-widget', className)}>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle>{text(title)}</CardTitle>
            {description && <CardDescription>{text(description)}</CardDescription>}
          </div>
          {headerAction && <div className='flex gap-2'>{headerAction}</div>}
        </div>
      </CardHeader>

      <CardContent>
        <Suspense fallback={<ChartSkeleton height={height} />}>
          <ChartWidgetChart
            data={data}
            type={type}
            xAxisKey={xAxisKey}
            dataKeys={dataKeys}
            valueKey={valueKey}
            nameKey={nameKey}
            colors={colors}
            height={height}
            showLegend={showLegend}
            showGrid={showGrid}
          />
        </Suspense>
      </CardContent>
    </Card>
  )
}
