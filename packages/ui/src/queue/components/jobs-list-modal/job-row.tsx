'use client'

/**
 * Memoized virtualized list row for JobsListModal's left panel. Sibling
 * buttons (checkbox + row body), not a nested-button div-onClick, so the row
 * stays keyboard/axe accessible. Extracted so `useVirtualizer`'s per-frame
 * re-render only re-renders the rows whose props actually changed.
 */

import { memo } from 'react'
import { CheckSquare, Square, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { useQueueLabels } from '../labels-context'
import { useTelamonjsT } from '../../../i18n/use-t'
import type { JobState } from '../../types'
import { getStatusConfig, truncateId, type JobInfo } from '../job-shared'

export interface JobRowProps {
  job: JobInfo
  isSelected: boolean
  isActive: boolean
  status: JobState
  formatDate: (timestamp: number) => string
  onToggleSelect: (jobId: string, e: React.MouseEvent) => void
  onSelectJob: (job: JobInfo) => void
}

export const JobRow = memo(function JobRow({
  job,
  isSelected,
  isActive,
  status,
  formatDate,
  onToggleSelect,
  onSelectJob,
}: JobRowProps) {
  const t = useTelamonjsT()
  const { jobLabel } = useQueueLabels()
  const config = getStatusConfig(t)[status]

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 border-b hover:bg-muted/50 transition-colors',
        isActive && 'bg-primary/5 border-l-2 border-l-primary'
      )}
    >
      <button
        onClick={e => onToggleSelect(job.id, e)}
        aria-label={isSelected ? t('queue.detailPanel.deselectJob') : t('queue.detailPanel.selectJob')}
        data-testid={`job-select-${job.id}`}
        className='p-1 rounded hover:bg-muted transition-colors flex-shrink-0'
      >
        {isSelected ? (
          <CheckSquare className='h-4 w-4 text-primary' />
        ) : (
          <Square className='h-4 w-4 text-muted-foreground' />
        )}
      </button>

      <button
        onClick={() => onSelectJob(job)}
        data-testid={`job-row-${job.id}`}
        aria-pressed={isActive}
        className='flex-1 flex items-center gap-3 text-left min-w-0'
      >
        <div className={cn('p-1.5 rounded-lg flex-shrink-0', config.bgColor, config.color)}>
          {status === 'active' ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <span className='h-3.5 w-3.5 flex items-center justify-center'>{config.icon}</span>
          )}
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-sm truncate' title={jobLabel(job.queueName)}>{jobLabel(job.queueName)}</span>
            <span className='text-xs text-muted-foreground font-mono flex-shrink-0'>
              #{truncateId(job.id)}
            </span>
          </div>
          <div className='flex items-center gap-3 mt-0.5 text-xs text-muted-foreground'>
            <span>{formatDate(job.timestamp)}</span>
            {job.attemptsMade > 1 && (
              <span className='flex items-center gap-1'>
                <RefreshCw className='h-3 w-3' />
                {job.attemptsMade}x
              </span>
            )}
            {status === 'failed' && job.failedReason && (
              <span className='flex items-center gap-1 text-red-500 min-w-0'>
                <AlertCircle className='h-3 w-3 flex-shrink-0' />
                <span className='truncate'>{job.failedReason.slice(0, 30)}</span>
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  )
})
