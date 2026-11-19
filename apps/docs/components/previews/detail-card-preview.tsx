'use client'

import { User } from 'lucide-react'
import { DetailCard } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { DetailCard } from '@telamonjs/ui'
import { User } from 'lucide-react'

<DetailCard
  title="Personal Information"
  icon={User}
  fields={[
    { label: 'Name', value: 'Jane Doe' },
    { label: 'Email', value: 'jane@example.com' },
    { label: 'Role', value: 'Administrator' },
  ]}
/>`

const FIELDS = [
  { label: 'Name', value: 'Jane Doe' },
  { label: 'Email', value: 'jane@example.com' },
  { label: 'Role', value: 'Administrator' },
]

export function DetailCardPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        {
          prop: 'density',
          type: 'select',
          options: ['compact', 'comfortable', 'spacious'],
          default: 'comfortable',
        },
      ]}
    >
      {values => (
        <div className='w-full max-w-md'>
          <DetailCard
            title='Personal Information'
            icon={User}
            fields={FIELDS}
            density={values.density as 'compact' | 'comfortable' | 'spacious'}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
