'use client'

import { LoadingSkeleton } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { LoadingSkeleton } from '@telamonjs/ui'

<LoadingSkeleton shape="card" count={1} />`

export function LoadingSkeletonPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        {
          prop: 'shape',
          type: 'select',
          options: ['card', 'table', 'text', 'stat', 'avatar'],
          default: 'card',
        },
      ]}
    >
      {values => (
        <div className='w-full max-w-sm'>
          <LoadingSkeleton
            shape={values.shape as 'card' | 'table' | 'text' | 'stat' | 'avatar'}
            count={1}
          />
        </div>
      )}
    </ComponentPreview>
  )
}
