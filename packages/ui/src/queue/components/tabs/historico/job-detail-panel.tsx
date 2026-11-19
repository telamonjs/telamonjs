'use client'

/**
 * Master-detail right pane for HistoricoTab — single job inspection with
 * retry/remove actions. Extracted from HistoricoTab.tsx (Fase A3).
 *
 * Uses the shared `statusConfig` for icon/color, overridden with
 * `historicoStatusLabels` for the singular per-job label (shared's
 * `statusConfig.label` is plural, built for JobsHistoryModal's summary UI).
 */

import {
  X,
  Clock,
  RefreshCw,
  Hash,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Play,
  Trash2,
  Timer,
  CheckCircle,
} from 'lucide-react'
import { cn } from '../../../../utils/cn'
import { useTelamonjsT } from '../../../../i18n/use-t'
import { useQueueReadOnly } from '../../read-only-context'
import {
  getStatusConfig,
  getHistoricoStatusLabels,
  type JobStatus,
  type JobInfo,
} from '../../job-shared'

export interface JobDetailPanelProps {
  job: JobInfo
  onClose: () => void
  onRetry: (id: string, queue: string) => void
  onRemove: (id: string, queue: string) => void
  formatDate: (ts: number) => string
  formatDuration: (start: number, end: number) => string
  formatQueueName: (name: string) => string
  copyToClipboard: (text: string, key: string) => void
  copied: string | null
  renderValue: (value: unknown) => string
}

export function JobDetailPanel({
  job,
  onClose,
  onRetry,
  onRemove,
  formatDate,
  formatDuration,
  formatQueueName,
  copyToClipboard,
  copied,
  renderValue,
}: JobDetailPanelProps) {
  const t = useTelamonjsT()
  const readOnly = useQueueReadOnly()
  const config = getStatusConfig(t)[job.status as JobStatus]
  const label = getHistoricoStatusLabels(t)[job.status as JobStatus]

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex shrink-0 items-center justify-between border-b px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <div
            className={cn('rounded-md p-1.5', config?.bgColor, config?.color)}
          >
            {config?.icon}
          </div>
          <div className='min-w-0'>
            <h3 className='truncate text-sm font-semibold'>
              {formatQueueName(job.queueName)}
            </h3>
            <p className={cn('text-xs', config?.color)}>{label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label={t('queue.detail.closeJobDetails')}
          className='hover:bg-muted shrink-0 rounded-md p-1.5 transition-colors'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      {/* Body */}
      <div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-4'>
        {/* Metadata grid */}
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-0.5'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <Hash className='h-3 w-3' />
              {t('queue.detail.jobId')}
            </div>
            <div className='flex items-center gap-1'>
              <code className='bg-muted flex-1 truncate rounded px-1.5 py-0.5 font-mono text-xs'>
                {job.id}
              </code>
              <button
                onClick={() => copyToClipboard(job.id, 'jobId')}
                aria-label={t('queue.detail.copyIdJob')}
                className='hover:bg-muted shrink-0 rounded p-1 transition-colors'
              >
                {copied === 'jobId' ? (
                  <Check className='h-3 w-3 text-green-500' />
                ) : (
                  <Copy className='text-muted-foreground h-3 w-3' />
                )}
              </button>
            </div>
          </div>

          <div className='space-y-0.5'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <FileText className='h-3 w-3' />
              {t('queue.detail.queue')}
            </div>
            <code className='bg-muted block truncate rounded px-1.5 py-0.5 font-mono text-xs'>
              {job.queueName}
            </code>
          </div>

          <div className='space-y-0.5'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <Clock className='h-3 w-3' />
              {t('queue.detail.createdAt')}
            </div>
            <div className='text-xs'>{formatDate(job.timestamp)}</div>
          </div>

          <div className='space-y-0.5'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <RefreshCw className='h-3 w-3' />
              {t('queue.detail.attempts')}
            </div>
            <div className='text-xs'>
              <span className='font-medium'>{job.attemptsMade}</span>
              <span className='text-muted-foreground'>
                {' '}
                / {job.attemptsMax}
              </span>
            </div>
          </div>

          {job.processedOn && job.finishedOn && (
            <div className='col-span-2 space-y-0.5'>
              <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                <Timer className='h-3 w-3' />
                {t('queue.detail.duration')}
              </div>
              <div className='text-xs font-medium'>
                {formatDuration(job.processedOn, job.finishedOn)}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {job.failedReason && (
          <div className='space-y-1.5'>
            <div className='flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400'>
              <AlertTriangle className='h-3 w-3' />
              {t('queue.detail.error')}
            </div>
            <div className='rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30'>
              <pre className='whitespace-pre-wrap font-mono text-xs text-red-700 dark:text-red-300'>
                {job.failedReason}
              </pre>
            </div>
          </div>
        )}

        {/* Stacktrace */}
        {job.stacktrace && job.stacktrace.length > 0 && (
          <details className='group'>
            <summary className='flex cursor-pointer items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400'>
              <AlertTriangle className='h-3 w-3' />
              {t('queue.detail.stackTrace')}
            </summary>
            <div className='mt-1.5 overflow-x-auto rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30'>
              <pre className='whitespace-pre-wrap font-mono text-[10px] text-red-700 dark:text-red-300'>
                {job.stacktrace.join('\n')}
              </pre>
            </div>
          </details>
        )}

        {/* Input Data */}
        {job.data && Object.keys(job.data).length > 0 && (
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5 text-xs font-medium'>
                <FileText className='h-3 w-3' />
                {t('queue.detail.inputData')}
              </div>
              <button
                onClick={() => copyToClipboard(renderValue(job.data), 'data')}
                aria-label={t('queue.detail.copyInputData')}
                className='hover:bg-muted rounded p-1 transition-colors'
              >
                {copied === 'data' ? (
                  <Check className='h-3 w-3 text-green-500' />
                ) : (
                  <Copy className='text-muted-foreground h-3 w-3' />
                )}
              </button>
            </div>
            <div className='bg-muted overflow-x-auto rounded-lg p-3'>
              <pre className='whitespace-pre-wrap font-mono text-xs'>
                {renderValue(job.data)}
              </pre>
            </div>
          </div>
        )}

        {/* Return Value */}
        {job.returnvalue !== undefined && job.returnvalue !== null && (
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400'>
                <CheckCircle className='h-3 w-3' />
                {t('queue.detail.result')}
              </div>
              <button
                onClick={() =>
                  copyToClipboard(renderValue(job.returnvalue), 'result')
                }
                aria-label={t('queue.detail.copyResult')}
                className='hover:bg-muted rounded p-1 transition-colors'
              >
                {copied === 'result' ? (
                  <Check className='h-3 w-3 text-green-500' />
                ) : (
                  <Copy className='text-muted-foreground h-3 w-3' />
                )}
              </button>
            </div>
            <div className='overflow-x-auto rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30'>
              <pre className='whitespace-pre-wrap font-mono text-xs text-green-700 dark:text-green-300'>
                {renderValue(job.returnvalue)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {!readOnly && (
      <div className='bg-muted/30 flex shrink-0 items-center gap-2 border-t px-4 py-3'>
        {job.status === 'failed' && (
          <button
            onClick={() => onRetry(job.id, job.queueName)}
            data-testid='job-retry'
            className='inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600'
          >
            <Play className='h-3 w-3' />
            {t('queue.actions.retry')}
          </button>
        )}
        <button
          onClick={() => onRemove(job.id, job.queueName)}
          data-testid='job-remove'
          className='inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30'
        >
          <Trash2 className='h-3 w-3' />
          {t('queue.actions.remove')}
        </button>
      </div>
      )}
    </div>
  )
}
