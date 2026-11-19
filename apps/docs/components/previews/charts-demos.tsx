'use client'

// ponytail: single module for ALL recharts-dependent demos. Every chart
// preview reaches it through one next/dynamic boundary, so recharts lives in
// one async chunk instead of being hoisted into the shared route bundle.
// Charts imported non-lazy on purpose — this whole module is already lazy.

import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ChartWidget,
} from '@telamonjs/ui'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const trend = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  { name: 'Mar', revenue: 5000, expenses: 3200 },
  { name: 'Apr', revenue: 4780, expenses: 2908 },
  { name: 'May', revenue: 5890, expenses: 3800 },
  { name: 'Jun', revenue: 6390, expenses: 3500 },
]

export function LineChartDemo({
  showGrid,
  showLegend,
}: {
  showGrid: boolean
  showLegend: boolean
}) {
  return (
    <LineChart
      data={trend}
      dataKeys={['revenue', 'expenses']}
      height={300}
      showGrid={showGrid}
      showLegend={showLegend}
    />
  )
}

const categories = [
  { name: 'Electronics', sales: 4000, returns: 240 },
  { name: 'Clothing', sales: 3000, returns: 139 },
  { name: 'Home', sales: 2000, returns: 98 },
  { name: 'Sports', sales: 2780, returns: 190 },
  { name: 'Books', sales: 1890, returns: 48 },
]

export function BarChartDemo({
  layout,
  showLegend,
}: {
  layout: 'horizontal' | 'vertical'
  showLegend: boolean
}) {
  return (
    <BarChart
      data={categories}
      dataKeys={['sales', 'returns']}
      height={300}
      layout={layout}
      showLegend={showLegend}
    />
  )
}

const devices = [
  { name: 'Desktop', value: 4200 },
  { name: 'Mobile', value: 3100 },
  { name: 'Tablet', value: 900 },
  { name: 'Other', value: 300 },
]

export function PieChartDemo({
  showLabels,
  showLegend,
}: {
  showLabels: boolean
  showLegend: boolean
}) {
  return (
    <PieChart
      data={devices}
      dataKey='value'
      height={300}
      showLabels={showLabels}
      showLegend={showLegend}
    />
  )
}

const week = [
  { name: 'Mon', visits: 1200, signups: 240 },
  { name: 'Tue', visits: 1900, signups: 320 },
  { name: 'Wed', visits: 1500, signups: 280 },
  { name: 'Thu', visits: 2200, signups: 410 },
  { name: 'Fri', visits: 2600, signups: 480 },
  { name: 'Sat', visits: 1400, signups: 200 },
  { name: 'Sun', visits: 1100, signups: 170 },
]

export function AreaChartDemo({
  stacked,
  showGrid,
}: {
  stacked: boolean
  showGrid: boolean
}) {
  return (
    <AreaChart
      data={week}
      dataKeys={['visits', 'signups']}
      height={300}
      stacked={stacked}
      showGrid={showGrid}
    />
  )
}

const tasks = [
  { name: 'Completed', value: 620 },
  { name: 'In Progress', value: 210 },
  { name: 'Pending', value: 120 },
  { name: 'Cancelled', value: 50 },
]

export function DonutChartDemo({ showLegend }: { showLegend: boolean }) {
  return (
    <PieChart
      data={tasks}
      dataKey='value'
      innerRadius={60}
      outerRadius={90}
      height={300}
      showLabels={false}
      showLegend={showLegend}
    />
  )
}

const monthly = [
  { name: 'Jan', value: 4000, target: 3500 },
  { name: 'Feb', value: 3000, target: 3500 },
  { name: 'Mar', value: 5000, target: 4000 },
  { name: 'Apr', value: 4780, target: 4000 },
  { name: 'May', value: 5890, target: 4500 },
  { name: 'Jun', value: 6390, target: 4500 },
]

export function ChartWidgetDemo({
  type,
  showLegend,
}: {
  type: 'line' | 'bar' | 'pie'
  showLegend: boolean
}) {
  return (
    <ChartWidget
      title='Monthly Revenue'
      description='Revenue vs target, last 6 months'
      data={monthly}
      type={type}
      dataKeys={['value', 'target']}
      height={280}
      showLegend={showLegend}
    />
  )
}

const scorecard = [
  { metric: 'Speed', productA: 80, productB: 65 },
  { metric: 'Reliability', productA: 95, productB: 80 },
  { metric: 'Comfort', productA: 70, productB: 90 },
  { metric: 'Safety', productA: 90, productB: 85 },
  { metric: 'Efficiency', productA: 85, productB: 70 },
]

export function RadarChartDemo() {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <RadarChart data={scorecard}>
        <PolarGrid />
        <PolarAngleAxis dataKey='metric' />
        <PolarRadiusAxis />
        <Radar
          name='Product A'
          dataKey='productA'
          stroke='#3b82f6'
          fill='#3b82f6'
          fillOpacity={0.5}
        />
        <Radar
          name='Product B'
          dataKey='productB'
          stroke='#10b981'
          fill='#10b981'
          fillOpacity={0.5}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  )
}

const revenueOrders = [
  { name: 'Jan', revenue: 4000, orders: 120 },
  { name: 'Feb', revenue: 3000, orders: 98 },
  { name: 'Mar', revenue: 5000, orders: 150 },
  { name: 'Apr', revenue: 4780, orders: 139 },
  { name: 'May', revenue: 5890, orders: 171 },
  { name: 'Jun', revenue: 6390, orders: 185 },
]

export function ComposedChartDemo() {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <ComposedChart data={revenueOrders}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='name' />
        <YAxis yAxisId='left' />
        <YAxis yAxisId='right' orientation='right' />
        <Tooltip />
        <Legend />
        <Bar yAxisId='left' dataKey='revenue' fill='#3b82f6' name='Revenue' />
        <Line
          yAxisId='right'
          type='monotone'
          dataKey='orders'
          stroke='#f59e0b'
          name='Orders'
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
