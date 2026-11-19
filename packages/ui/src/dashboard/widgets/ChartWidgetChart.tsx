'use client'

/**
 * ChartWidgetChart - Recharts rendering body of ChartWidget
 *
 * This file is the ONLY place in the dashboard graph that statically imports
 * recharts (~180 KB). It is loaded via React.lazy from ChartWidget so that
 * consumers who never render a chart do not pay the bundle cost.
 *
 * Do NOT import this file eagerly from anywhere except a dynamic import().
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint, ChartType } from './ChartWidget'

export interface ChartWidgetChartProps {
  data: ChartDataPoint[]
  type: ChartType
  xAxisKey: string
  dataKeys: string[]
  valueKey: string
  nameKey: string
  colors: string[]
  height: number
  showLegend: boolean
  showGrid: boolean
}

export function ChartWidgetChart({
  data,
  type,
  xAxisKey,
  dataKeys,
  valueKey,
  nameKey,
  colors,
  height,
  showLegend,
  showGrid,
}: ChartWidgetChartProps) {
  return (
    <ResponsiveContainer width='100%' height={height}>
      {type === 'line' && (
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray='3 3' />}
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type='monotone'
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      )}

      {type === 'bar' && (
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray='3 3' />}
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
          ))}
        </BarChart>
      )}

      {type === 'pie' && (
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx='50%'
            cy='50%'
            outerRadius={80}
            label
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      )}
    </ResponsiveContainer>
  )
}
