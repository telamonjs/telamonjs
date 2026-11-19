'use client'

import { ComparisonTable } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { ComparisonTable } from '@telamonjs/ui'

<ComparisonTable
  columns={[
    { label: 'Basic', key: 'basic' },
    { label: 'Pro', key: 'pro', highlight: true, badge: 'Popular' },
    { label: 'Enterprise', key: 'enterprise' },
  ]}
  rows={[
    { feature: 'Users', basic: '5', pro: '20', enterprise: 'Unlimited' },
    { feature: 'Support', basic: false, pro: true, enterprise: true },
  ]}
/>`

const COLUMNS = [
  { label: 'Basic', key: 'basic' },
  { label: 'Pro', key: 'pro', highlight: true, badge: 'Popular' },
  { label: 'Enterprise', key: 'enterprise' },
]

const ROWS = [
  { feature: 'Users', basic: '5', pro: '20', enterprise: 'Unlimited' },
  { feature: 'Support', basic: false, pro: true, enterprise: true },
  { feature: 'API access', basic: false, pro: true, enterprise: true },
]

export function ComparisonTablePreview() {
  return (
    <ComponentPreview code={CODE}>
      <div className='w-full max-w-2xl'>
        <ComparisonTable columns={COLUMNS} rows={ROWS} />
      </div>
    </ComponentPreview>
  )
}
