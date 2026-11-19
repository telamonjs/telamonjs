'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const BarChartDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.BarChartDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `import { BarChart } from '@telamonjs/ui'

const data = [
  { name: 'Electronics', sales: 4000, returns: 240 },
  { name: 'Clothing', sales: 3000, returns: 139 },
  // ...
]

<BarChart data={data} dataKeys={['sales', 'returns']} height={300} />`

export function BarChartPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'layout', type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal' },
        { prop: 'showLegend', type: 'boolean', default: true },
      ]}
    >
      {values => (
        <div className='w-full'>
          <BarChartDemo
            layout={values.layout as 'horizontal' | 'vertical'}
            showLegend={Boolean(values.showLegend)}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
