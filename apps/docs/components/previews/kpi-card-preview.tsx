'use client'

import { DollarSign } from 'lucide-react'
import { KPICard } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { KPICard } from '@telamonjs/ui'
import { DollarSign } from 'lucide-react'

<KPICard
  title="Monthly Revenue"
  value="$45,231"
  change={12.5}
  trend="up"
  icon={<DollarSign className="w-5 h-5" />}
/>`

export function KpiCardPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'trend', type: 'select', options: ['up', 'down', 'neutral'], default: 'up' },
        { prop: 'loading', type: 'boolean', default: false },
      ]}
    >
      {values => (
        <KPICard
          title='Monthly Revenue'
          value='$45,231'
          change={values.trend === 'down' ? -8.2 : 12.5}
          trend={values.trend as 'up' | 'down' | 'neutral'}
          loading={Boolean(values.loading)}
          icon={<DollarSign className='w-5 h-5' />}
          className='w-72'
        />
      )}
    </ComponentPreview>
  )
}
