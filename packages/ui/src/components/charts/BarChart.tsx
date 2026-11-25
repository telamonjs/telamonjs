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
import { AXIS_PROPS, GRID_STROKE, TOOLTIP_CONTENT_STYLE } from './chart-theme'
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
  /**
   * Whether the value axis may show fractional ticks (recharts
   * `allowDecimals`). Pass `false` for counts. Default: `true`
   */
  allowDecimals?: boolean
  /**
   * Width in px of the category axis (the `name` labels) in `vertical`
   * layout — widen it for long labels. In `horizontal` layout the category
   * axis is the X axis and this is ignored. Default: recharts' 60
   */
  categoryAxisWidth?: number
}

// Round only the bar's end: the top in `horizontal` layout (vertical bars), the
// right in `vertical` layout (horizontal bars). Recharts order: TL, TR, BR, BL.
const BAR_RADIUS = {
  horizontal: [4, 4, 0, 0],
  vertical: [0, 4, 4, 0],
} satisfies Record<
  NonNullable<BarChartProps['layout']>,
  [number, number, number, number]
>

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
  allowDecimals = true,
  categoryAxisWidth,
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
          {showGrid && (
            <CartesianGrid strokeDasharray='3 3' stroke={GRID_STROKE} />
          )}
          {layout === 'horizontal' ? (
            <>
              <XAxis
                {...AXIS_PROPS}
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
                {...AXIS_PROPS}
                allowDecimals={allowDecimals}
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
                {...AXIS_PROPS}
                type='number'
                allowDecimals={allowDecimals}
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
                {...AXIS_PROPS}
                dataKey='name'
                type='category'
                width={categoryAxisWidth}
                label={
                  yAxisLabel
                    ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                    : undefined
                }
              />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} />
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={BAR_RADIUS[layout]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
