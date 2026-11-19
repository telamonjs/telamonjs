'use client'

import { Timeline, type TimelineItem } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { Timeline } from '@telamonjs/ui'

<Timeline
  items={[
    {
      id: '1',
      title: 'Order created',
      description: 'Order #1234 was created',
      timestamp: new Date(),
      user: { name: 'Jane Doe' },
      variant: 'success',
    },
  ]}
/>`

// ponytail: fixed past dates (not `new Date()`) so the relative-time text
// formatDistanceToNow renders is identical on server and client hydration.
const ITEMS: TimelineItem[] = [
  {
    id: '1',
    title: 'Order created',
    description: 'Order #1234 was created',
    timestamp: new Date('2024-01-10T09:00:00Z'),
    user: { name: 'Jane Doe' },
    variant: 'success',
  },
  {
    id: '2',
    title: 'Payment pending',
    description: 'Waiting for payment confirmation',
    timestamp: new Date('2024-01-08T14:30:00Z'),
    user: { name: 'System' },
    variant: 'warning',
  },
  {
    id: '3',
    title: 'Order failed',
    description: 'Payment was declined',
    timestamp: new Date('2024-01-05T11:15:00Z'),
    user: { name: 'System' },
    variant: 'error',
  },
]

export function TimelinePreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        { prop: 'variant', type: 'select', options: ['vertical', 'horizontal'], default: 'vertical' },
      ]}
    >
      {values => (
        <div className='w-full max-w-md'>
          <Timeline items={ITEMS} variant={values.variant as 'vertical' | 'horizontal'} />
        </div>
      )}
    </ComponentPreview>
  )
}
