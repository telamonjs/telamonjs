'use client'

import { ProgressTracker } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { ProgressTracker } from '@telamonjs/ui'

<ProgressTracker
  steps={[
    { label: 'Information', status: 'completed' },
    { label: 'Payment', status: 'current' },
    { label: 'Confirmation', status: 'pending' },
  ]}
/>`

const STEPS = [
  { label: 'Information', status: 'completed' as const },
  { label: 'Payment', status: 'current' as const },
  { label: 'Confirmation', status: 'pending' as const },
]

export function ProgressTrackerPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'variant', type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal' },
      ]}
    >
      {values => (
        <div className='w-full max-w-md'>
          <ProgressTracker steps={STEPS} variant={values.variant as 'horizontal' | 'vertical'} />
        </div>
      )}
    </ComponentPreview>
  )
}
