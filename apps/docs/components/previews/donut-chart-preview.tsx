'use client'

import dynamic from 'next/dynamic'
import { ComponentPreview } from '../component-preview'
import { ChartLoading } from './chart-loading'

const DonutChartDemo = dynamic(
  () => import('./charts-demos').then(m => ({ default: m.DonutChartDemo })),
  { ssr: false, loading: ChartLoading }
)

const CODE = `import { PieChart } from '@telamonjs/ui'

// Donut = PieChart with innerRadius > 0 (there is no separate DonutChart export)
<PieChart
  data={data}
  dataKey='value'
  innerRadius={60}
  outerRadius={90}
  height={300}
/>`

export function DonutChartPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[{ prop: 'showLegend', type: 'boolean', default: true }]}
    >
      {values => (
        <div className='w-full'>
          <DonutChartDemo showLegend={Boolean(values.showLegend)} />
        </div>
      )}
    </ComponentPreview>
  )
}
