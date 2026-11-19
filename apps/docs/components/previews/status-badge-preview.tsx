'use client'

import { StatusBadge } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { StatusBadge } from '@telamonjs/ui'

<StatusBadge type="status" label="Active" variant="success" />`

export function StatusBadgePreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        {
          prop: 'variant',
          type: 'select',
          options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'],
          default: 'success',
        },
        { prop: 'size', type: 'select', options: ['sm', 'md', 'lg'], default: 'sm' },
      ]}
    >
      {values => (
        <StatusBadge
          type='status'
          label='Active'
          variant={values.variant as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'}
          size={values.size as 'sm' | 'md' | 'lg'}
        />
      )}
    </ComponentPreview>
  )
}
