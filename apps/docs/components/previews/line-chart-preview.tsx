'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const LineChartDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.LineChartDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `import { LineChart } from '@telamonjs/ui'

const data = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  // ...
]

<LineChart data={data} dataKeys={['revenue', 'expenses']} height={300} />`

export function LineChartPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'showGrid', type: 'boolean', default: true },
        { prop: 'showLegend', type: 'boolean', default: true },
      ]}
    >
      {values => (
        <div className='w-full'>
          <LineChartDemo
            showGrid={Boolean(values.showGrid)}
            showLegend={Boolean(values.showLegend)}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
