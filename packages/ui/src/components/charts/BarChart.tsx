'use client'

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '../../utils'
import type { ChartData } from './LineChart'

/**
 * BarChart props
 */
export interface BarChartProps {
  data: ChartData[]
  dataKeys: string[]
  colors?: string[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  className?: string
  xAxisLabel?: string
  yAxisLabel?: string
  layout?: 'horizontal' | 'vertical'
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
 * BarChart - Responsive bar chart
 *
 * @example
 * ```tsx
 * <BarChart
 *   data={[
 *     { name: 'Jan', vendas: 4000, lucro: 2400 },
 *     { name: 'Fev', vendas: 3000, lucro: 1398 }
 *   ]}
 *   dataKeys={['vendas', 'lucro']}
 *   colors={['#3b82f6', '#10b981']}
 * />
 * ```
 */
export function BarChart({
  data,
  dataKeys,
  colors = DEFAULT_COLORS,
  height = 300,
  showGrid = true,
  showLegend = true,
  className,
  xAxisLabel,
  yAxisLabel,
  layout = 'horizontal',
}: BarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width='100%' height={height}>
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          {showGrid && <CartesianGrid strokeDasharray='3 3' />}
          {layout === 'horizontal' ? (
            <>
              <XAxis
                dataKey='name'
                label={
                  xAxisLabel
                    ? {
                        value: xAxisLabel,
                        position: 'insideBottom',
                        offset: -5,
                      }
                    : undefined
                }
              />
              <YAxis
                label={
                  yAxisLabel
                    ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                    : undefined
                }
              />
            </>
          ) : (
            <>
              <XAxis
                type='number'
                label={
                  xAxisLabel
                    ? {
                        value: xAxisLabel,
                        position: 'insideBottom',
                        offset: -5,
                      }
                    : undefined
                }
              />
              <YAxis
                dataKey='name'
                type='category'
                label={
                  yAxisLabel
                    ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                    : undefined
                }
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
          />
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
