'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const RadarChartDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.RadarChartDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `// telamonjs-ui does not export a RadarChart wrapper — compose recharts directly
// (recharts is already a dependency of @telamonjs/ui)
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from 'recharts'

<ResponsiveContainer width='100%' height={300}>
  <RadarChart data={data}>
    <PolarGrid />
    <PolarAngleAxis dataKey='metric' />
    <PolarRadiusAxis />
    <Radar name='Product A' dataKey='productA' stroke='#3b82f6' fill='#3b82f6' fillOpacity={0.5} />
    <Radar name='Product B' dataKey='productB' stroke='#10b981' fill='#10b981' fillOpacity={0.5} />
    <Legend />
  </RadarChart>
</ResponsiveContainer>`

export function RadarChartPreview() {
  return (
    <ComponentPreview code={CODE}>
      <div className='w-full'>
        <RadarChartDemo />
      </div>
    </ComponentPreview>
  )
}
