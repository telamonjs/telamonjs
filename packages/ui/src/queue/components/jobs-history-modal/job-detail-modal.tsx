'use client'

/**
 * Job detail modal (inspect a single job — metadata, error, stacktrace,
 * input/output data, retry/remove actions). Extracted from
 * JobsHistoryModal.tsx (Fase A2). See fullscreen-modal.tsx for why this is
 * module-level with explicit props.
 */

import {
  X,
  CheckCircle,
  Clock,
  Timer,
  RefreshCw,
  Hash,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Play,
  Trash2,
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import { useQueueLabels } from '../labels-context'
import { useLocale } from 'next-intl'
import { useTelamonjsT } from '../../../i18n/use-t'
import { useQueueReadOnly } from '../read-only-context'
import { useFormat } from '../../../i18n/use-format'
import {
  getStatusConfig,
  formatDuration,
  renderValue,
  type JobStatus,
  type JobInfo,
} from '../job-shared'

export interface JobDetailModalProps {
  job: JobInfo
  onClose: () => void
  onRetry: (jobId: string, queueName: string) => void
  onRemove: (jobId: string, queueName: string) => void
  copied: string | null
  onCopy: (text: string, key: string) => void
}

export function JobDetailModal({
  job,
  onClose,
  onRetry,
  onRemove,
  copied,
  onCopy,
}: JobDetailModalProps) {
  const t = useTelamonjsT()
  const { jobLabel } = useQueueLabels()
  const readOnly = useQueueReadOnly()
  const format = useFormat()
  const locale = useLocale()
  const statusConfig = getStatusConfig(t)
  return (
    <>
      {/* Detail Backdrop */}
      <div
        className='fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200'
        onClick={onClose}
      />

      {/* Detail Modal */}
      <div className='fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[85vh] bg-background rounded-xl shadow-2xl z-[60] flex flex-col animate-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'p-2 rounded-lg',
                statusConfig[job.status as JobStatus]?.bgColor,
                statusConfig[job.status as JobStatus]?.color
              )}
            >
              {statusConfig[job.status as JobStatus]?.icon}
            </div>
            <div>
              <h2 className='text-lg font-semibold'>
                {statusConfig[job.status as JobStatus]?.label}
              </h2>
              <p className='text-sm text-muted-foreground'>
                {jobLabel(job.queueName)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('queue.detail.closeJobDetails')}
            className='p-2 rounded-lg hover:bg-muted transition-colors'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {/* Basic Info */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Hash className='h-4 w-4' />
                {t('queue.detail.jobId')}
              </div>
              <div className='flex items-center gap-2'>
                <code className='flex-1 text-sm bg-muted px-2 py-1 rounded font-mono truncate'>
                  {job.id}
                </code>
                <button
                  onClick={() => onCopy(job.id, 'jobId')}
                  aria-label={t('queue.detail.copyIdJob')}
                  className='p-1.5 rounded hover:bg-muted transition-colors'
                  title={t('queue.detail.copyId')}
                >
                  {copied === 'jobId' ? (
                    <Check className='h-4 w-4 text-green-500' />
                  ) : (
                    <Copy className='h-4 w-4 text-muted-foreground' />
                  )}
                </button>
              </div>
            </div>

            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <FileText className='h-4 w-4' />
                {t('queue.detail.queue')}
              </div>
              <code className='block text-sm bg-muted px-2 py-1 rounded font-mono'>
                {job.queueName}
              </code>
            </div>

            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Clock className='h-4 w-4' />
                {t('queue.detail.createdAt')}
              </div>
              <div className='text-sm'>{format.dateTime(job.timestamp)}</div>
            </div>

            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <RefreshCw className='h-4 w-4' />
                {t('queue.detail.attempts')}
              </div>
              <div className='text-sm'>
                <span className='font-medium'>{job.attemptsMade}</span>
                <span className='text-muted-foreground'>
                  {' '}
                  / {job.attemptsMax}
                </span>
              </div>
            </div>

            {job.processedOn && job.finishedOn && (
              <div className='space-y-1 col-span-2'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Timer className='h-4 w-4' />
                  {t('queue.detail.duration')}
                </div>
                <div className='text-sm font-medium'>
                  {formatDuration(job.processedOn, job.finishedOn, locale)}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {job.failedReason && (
            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400'>
                <AlertTriangle className='h-4 w-4' />
                {t('queue.detail.error')}
              </div>
              <div className='bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4'>
                <pre className='text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono'>
                  {job.failedReason}
                </pre>
              </div>
            </div>
          )}

          {/* Stack Trace */}
          {job.stacktrace && job.stacktrace.length > 0 && (
            <div className='space-y-2'>
              <details className='group'>
                <summary className='cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2'>
                  <AlertTriangle className='h-4 w-4' />
                  {t('queue.detail.stackTrace')}
                </summary>
                <div className='mt-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 overflow-x-auto'>
                  <pre className='text-xs text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap'>
                    {job.stacktrace.join('\n')}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Input Data */}
          {job.data && Object.keys(job.data).length > 0 && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-sm font-medium'>
                  <FileText className='h-4 w-4' />
                  {t('queue.detail.inputData')}
                </div>
                <button
                  onClick={() => onCopy(renderValue(job.data), 'data')}
                  aria-label={t('queue.detail.copyInputData')}
                  className='p-1.5 rounded hover:bg-muted transition-colors'
                  title={t('queue.detail.copyData')}
                >
                  {copied === 'data' ? (
                    <Check className='h-4 w-4 text-green-500' />
                  ) : (
                    <Copy className='h-4 w-4 text-muted-foreground' />
                  )}
                </button>
              </div>
              <div className='bg-muted rounded-lg p-4 overflow-x-auto'>
                <pre className='text-sm font-mono whitespace-pre-wrap'>
                  {renderValue(job.data)}
                </pre>
              </div>
            </div>
          )}

          {/* Result */}
          {job.returnvalue !== undefined && job.returnvalue !== null && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400'>
                  <CheckCircle className='h-4 w-4' />
                  {t('queue.detail.result')}
                </div>
                <button
                  onClick={() => onCopy(renderValue(job.returnvalue), 'result')}
                  aria-label={t('queue.detail.copyResult')}
                  className='p-1.5 rounded hover:bg-muted transition-colors'
                  title={t('queue.detail.copyResult')}
                >
                  {copied === 'result' ? (
                    <Check className='h-4 w-4 text-green-500' />
                  ) : (
                    <Copy className='h-4 w-4 text-muted-foreground' />
                  )}
                </button>
              </div>
              <div className='bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 overflow-x-auto'>
                <pre className='text-sm text-green-700 dark:text-green-300 font-mono whitespace-pre-wrap'>
                  {renderValue(job.returnvalue)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between px-6 py-4 border-t bg-muted/30'>
          <div className='flex items-center gap-2'>
            {!readOnly && job.status === 'failed' && (
              <button
                onClick={() => onRetry(job.id, job.queueName)}
                data-testid='job-retry'
                className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors'
              >
                <Play className='h-4 w-4' />
                {t('queue.actions.retry')}
              </button>
            )}
            {!readOnly && (
            <button
              onClick={() => onRemove(job.id, job.queueName)}
              data-testid='job-remove'
              className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors'
            >
              <Trash2 className='h-4 w-4' />
              {t('queue.actions.remove')}
            </button>
            )}
          </div>
          <button
            onClick={onClose}
            data-testid='job-detail-close'
            className='px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors'
          >
            {t('queue.detail.close')}
          </button>
        </div>
      </div>
    </>
  )
}
