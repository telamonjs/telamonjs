'use client'

import { Users } from 'lucide-react'
import { StatCard } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { StatCard } from '@telamonjs/ui'
import { Users } from 'lucide-react'

<StatCard
  label="Total Users"
  value={1234}
  icon={Users}
  color="blue"
  subtitle="since last month"
  badge={{ text: '+12.5%', variant: 'success' }}
/>`

type Variant = 'outlined' | 'tinted' | 'accent'
type Color = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray'

export function StatsCardPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'variant', type: 'select', options: ['outlined', 'tinted', 'accent'], default: 'outlined' },
        {
          prop: 'color',
          type: 'select',
          options: ['blue', 'green', 'yellow', 'red', 'purple', 'orange', 'gray'],
          default: 'blue',
        },
        { prop: 'animate', type: 'boolean', default: false },
      ]}
    >
      {values => (
        <div className='w-72'>
          <StatCard
            label='Total Users'
            value={1234}
            icon={Users}
            color={values.color as Color}
            variant={values.variant as Variant}
            animate={Boolean(values.animate)}
            subtitle='since last month'
            badge={{ text: '+12.5%', variant: 'success' }}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
