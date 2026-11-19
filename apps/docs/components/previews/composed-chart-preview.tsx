'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const ComposedChartDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.ComposedChartDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `// telamonjs-ui does not export a ComposedChart wrapper — compose recharts directly
// (recharts is already a dependency of @telamonjs/ui)
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

<ResponsiveContainer width='100%' height={300}>
  <ComposedChart data={data}>
    <CartesianGrid strokeDasharray='3 3' />
    <XAxis dataKey='name' />
    <YAxis yAxisId='left' />
    <YAxis yAxisId='right' orientation='right' />
    <Tooltip />
    <Legend />
    <Bar yAxisId='left' dataKey='revenue' fill='#3b82f6' name='Revenue' />
    <Line yAxisId='right' type='monotone' dataKey='orders' stroke='#f59e0b' name='Orders' />
  </ComposedChart>
</ResponsiveContainer>`

export function ComposedChartPreview() {
  return (
    <ComponentPreview code={CODE}>
      <div className='w-full'>
        <ComposedChartDemo />
      </div>
    </ComponentPreview>
  )
}
