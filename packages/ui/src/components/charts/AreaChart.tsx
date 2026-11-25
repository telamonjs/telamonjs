'use client'

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '../../utils'
import { AXIS_PROPS, GRID_STROKE, TOOLTIP_CONTENT_STYLE } from './chart-theme'
import type { ChartData } from './LineChart'

/**
 * AreaChart props
 */
export interface AreaChartProps {
  data: ChartData[]
  dataKeys: string[]
  colors?: string[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  className?: string
  xAxisLabel?: string
  yAxisLabel?: string
  stacked?: boolean
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
]

/**
 * AreaChart - Responsive area chart
 *
 * @example
 * ```tsx
 * <AreaChart
 *   data={[
 *     { name: 'Jan', vendas: 4000, lucro: 2400 },
 *     { name: 'Fev', vendas: 3000, lucro: 1398 }
 *   ]}
 *   dataKeys={['vendas', 'lucro']}
 *   colors={['#3b82f6', '#10b981']}
 *   stacked
 * />
 * ```
 */
export function AreaChart({
  data,
  dataKeys,
  colors = DEFAULT_COLORS,
  height = 300,
  showGrid = true,
  showLegend = true,
  className,
  xAxisLabel,
  yAxisLabel,
  stacked = false,
}: AreaChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width='100%' height={height}>
        <RechartsAreaChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray='3 3' stroke={GRID_STROKE} />
          )}
          <XAxis
            {...AXIS_PROPS}
            dataKey='name'
            label={
              xAxisLabel
                ? { value: xAxisLabel, position: 'insideBottom', offset: -5 }
                : undefined
            }
          />
          <YAxis
            {...AXIS_PROPS}
            label={
              yAxisLabel
                ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                : undefined
            }
          />
          <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} />
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Area
              key={key}
              type='monotone'
              dataKey={key}
              stackId={stacked ? '1' : undefined}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.6}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
