'use client'

import { CheckCircle, Clock, XCircle } from 'lucide-react'
import { DetailStatus, type StatusConfig } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const CODE = `import { DetailStatus } from '@telamonjs/ui'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

const statusConfig = {
  ACTIVE: { label: 'Active', variant: 'default', icon: CheckCircle },
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
}

<DetailStatus status="ACTIVE" statusConfig={statusConfig} />`

const STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: 'Active', variant: 'default', icon: CheckCircle },
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
}

export function DetailStatusPreview() {
  return (
    <ComponentPreview
      code={CODE}
      controls={[
        {
          prop: 'status',
          type: 'select',
          options: ['ACTIVE', 'PENDING', 'CANCELLED'],
          default: 'ACTIVE',
        },
      ]}
    >
      {values => (
        <DetailStatus status={String(values.status)} statusConfig={STATUS_CONFIG} />
      )}
    </ComponentPreview>
  )
}
