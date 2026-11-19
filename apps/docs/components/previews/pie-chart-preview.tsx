'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const PieChartDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.PieChartDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `import { PieChart } from '@telamonjs/ui'

const data = [
  { name: 'Desktop', value: 4200 },
  { name: 'Mobile', value: 3100 },
  { name: 'Tablet', value: 900 },
  { name: 'Other', value: 300 },
]

<PieChart data={data} dataKey='value' height={300} />`

export function PieChartPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'showLabels', type: 'boolean', default: true },
        { prop: 'showLegend', type: 'boolean', default: true },
      ]}
    >
      {values => (
        <div className='w-full'>
          <PieChartDemo
            showLabels={Boolean(values.showLabels)}
            showLegend={Boolean(values.showLegend)}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
