'use client'

import { Users } from 'lucide-react'
import { BaseCard } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { BaseCard } from '@telamonjs/ui'
import { Users } from 'lucide-react'

<BaseCard title="Users" icon={Users}>
  <div className="text-2xl font-bold">1,234</div>
</BaseCard>`

export function BaseCardPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[{ prop: 'isLoading', type: 'boolean', default: false }]}
    >
      {values => (
        <BaseCard title='Users' icon={Users} isLoading={Boolean(values.isLoading)} className='w-64'>
          <div className='text-2xl font-bold'>1,234</div>
        </BaseCard>
      )}
    </ComponentPreview>
  )
}
