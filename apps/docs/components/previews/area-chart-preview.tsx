'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const AreaChartDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.AreaChartDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `import { AreaChart } from '@telamonjs/ui'

const data = [
  { name: 'Mon', visits: 1200, signups: 240 },
  { name: 'Tue', visits: 1900, signups: 320 },
  // ...
]

<AreaChart data={data} dataKeys={['visits', 'signups']} height={300} stacked />`

export function AreaChartPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'stacked', type: 'boolean', default: true },
        { prop: 'showGrid', type: 'boolean', default: true },
      ]}
    >
      {values => (
        <div className='w-full'>
          <AreaChartDemo
            stacked={Boolean(values.stacked)}
            showGrid={Boolean(values.showGrid)}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
