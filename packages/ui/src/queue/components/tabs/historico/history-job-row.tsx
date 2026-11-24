'use client'

/**
 * Flat virtualized row for HistoricoTab's master-detail list. Extracted from
 * HistoricoTab.tsx (Fase A3). Status visuals (icon/color) come from the
 * shared `statusConfig`; `statusBorderL` (left-accent border) is specific to
 * this row design and stays local rather than joining job-shared.tsx.
 */

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import { useTelamonjsT } from '../../../../i18n/use-t'
import { getStatusConfig, type JobStatus, type JobInfo } from '../../job-shared'

const statusBorderL: Record<string, string> = {
  completed: 'border-l-green-500',
  failed: 'border-l-red-500',
  waiting: 'border-l-yellow-500',
  active: 'border-l-blue-500',
  delayed: 'border-l-purple-500',
}

export interface HistoryJobRowProps {
  job: JobInfo
  isSelected: boolean
  onClick: () => void
  formatDate: (ts: number) => string
  formatDuration: (start: number, end: number) => string
  formatQueueName: (name: string) => string
  truncateId: (id: string, max?: number) => string
}

export const HistoryJobRow = React.memo(function HistoryJobRow({
  job,
  isSelected,
  onClick,
  formatDate,
  formatDuration,
  formatQueueName,
  truncateId,
}: HistoryJobRowProps) {
  const t = useTelamonjsT()
  const config = getStatusConfig(t)[job.status as JobStatus]
  const duration =
    job.processedOn && job.finishedOn
      ? formatDuration(job.processedOn, job.finishedOn)
      : null

  return (
    <button
      onClick={onClick}
      data-testid={`job-row-${job.queueName}-${job.id}`}
      className={cn(
        'flex w-full items-center gap-3 border-b border-l-4 px-4 py-2.5 text-left transition-colors',
        statusBorderL[job.status] || 'border-l-gray-300',
        isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'
      )}
    >
      <span className={cn('shrink-0', config?.color)}>{config?.icon}</span>
      <span className='min-w-0 flex-1 truncate text-sm font-medium' title={formatQueueName(job.queueName)}>
        {formatQueueName(job.queueName)}
      </span>
      <span className='text-muted-foreground shrink-0 font-mono text-[11px]'>
        #{truncateId(job.id, 8)}
      </span>
      {duration && (
        <span className='text-muted-foreground shrink-0 text-[11px] tabular-nums'>
          {duration}
        </span>
      )}
      <span className='text-muted-foreground w-28 shrink-0 text-right text-[11px] tabular-nums'>
        {formatDate(job.finishedOn || job.timestamp)}
      </span>
      {job.status === 'failed' && (
        <AlertCircle className='h-3.5 w-3.5 shrink-0 text-red-500' />
      )}
    </button>
  )
})
