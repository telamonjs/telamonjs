'use client'

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '../../utils'
import type { ChartData } from './LineChart'

/**
 * PieChart props
 */
export interface PieChartProps {
  data: ChartData[]
  dataKey: string
  nameKey?: string
  colors?: string[]
  height?: number
  showLegend?: boolean
  className?: string
  innerRadius?: number
  outerRadius?: number
  showLabels?: boolean
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

/**
 * PieChart - Responsive pie chart
 *
 * @example
 * ```tsx
 * <PieChart
 *   data={[
 *     { name: 'Desktop', value: 4000 },
 *     { name: 'Mobile', value: 3000 },
 *     { name: 'Tablet', value: 2000 }
 *   ]}
 *   dataKey="value"
 * />
 * ```
 */
export function PieChart({
  data,
  dataKey,
  nameKey = 'name',
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  className,
  innerRadius = 0,
  outerRadius = 80,
  showLabels = true,
}: PieChartProps) {
  const renderLabel = showLabels ? undefined : (false as false)

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width='100%' height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx='50%'
            cy='50%'
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label={renderLabel}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={String(entry[nameKey])}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
          />
          {showLegend && <Legend />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
