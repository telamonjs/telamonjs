'use client'

import { Plus, Upload, Download, Mail } from 'lucide-react'
import { QuickActionCard, QuickActionGrid } from '@telamonjs/ui'
import { Callout } from 'fumadocs-ui/components/callout'
import { ComponentPreview } from '../component-preview'

const CODE = `import { QuickActionCard, QuickActionGrid } from '@telamonjs/ui'
import { Plus, Upload, Download, Mail } from 'lucide-react'

<QuickActionGrid columns={4}>
  <QuickActionCard title="New" icon={Plus} color="blue" href="/new" />
  <QuickActionCard title="Upload" icon={Upload} color="green" href="/upload" />
  <QuickActionCard title="Export" icon={Download} color="purple" href="/export" />
  <QuickActionCard title="Email" icon={Mail} color="orange" href="/email" />
</QuickActionGrid>`

export function QuickActionsPreview() {
  return (
    <>
      <Callout type='warn' title='Real exports are QuickActionCard + QuickActionGrid'>
        The barrel does not export a single <code>QuickActions</code>{' '}
        component. The examples below use the actual exports,{' '}
        <code>QuickActionCard</code> and <code>QuickActionGrid</code>.
      </Callout>
      <ComponentPreview
        code={CODE}
        controls={[
          { prop: 'columns', type: 'select', options: ['3', '4', '5', '6'], default: '4' },
        ]}
      >
        {values => (
          <div className='w-full max-w-lg'>
            <QuickActionGrid columns={Number(values.columns) as 3 | 4 | 5 | 6}>
              <QuickActionCard title='New' icon={Plus} color='blue' href='#' />
              <QuickActionCard title='Upload' icon={Upload} color='green' href='#' />
              <QuickActionCard title='Export' icon={Download} color='purple' href='#' />
              <QuickActionCard title='Email' icon={Mail} color='orange' href='#' />
            </QuickActionGrid>
          </div>
        )}
      </ComponentPreview>
    </>
  )
}
