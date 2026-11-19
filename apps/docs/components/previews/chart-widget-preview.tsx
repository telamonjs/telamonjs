'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const ChartWidgetDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.ChartWidgetDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `import { ChartWidget } from '@telamonjs/ui'

const data = [
  { name: 'Jan', value: 4000, target: 3500 },
  { name: 'Feb', value: 3000, target: 3500 },
  // ...
]

<ChartWidget
  title='Monthly Revenue'
  description='Revenue vs target, last 6 months'
  data={data}
  type='line'
  dataKeys={['value', 'target']}
  height={280}
/>`

export function ChartWidgetPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'type', type: 'select', options: ['line', 'bar', 'pie'], default: 'line' },
        { prop: 'showLegend', type: 'boolean', default: true },
      ]}
    >
      {values => (
        <div className='w-full max-w-2xl text-left'>
          <ChartWidgetDemo
            type={values.type as 'line' | 'bar' | 'pie'}
            showLegend={Boolean(values.showLegend)}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
