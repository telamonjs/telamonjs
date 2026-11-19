'use client'

/**
 * Inline detail pane for JobsListModal's right panel (desktop, >= md).
 * Mirrors JobDetailModal's content but as a panel (no backdrop/close-on-click-outside)
 * with its own close button — same affordance HistoricoTab's JobDetailPanel already
 * has for its master-detail layout.
 *
 * testids are prefixed `detail-panel-` (distinct from JobDetailModal's
 * `job-detail-*`) because both this panel and the mobile stacked
 * JobDetailModal render simultaneously in jsdom (no CSS-driven hide) when the
 * same job is selected — colliding testids would break `getByTestId`.
 */

import {
  X,
  Hash,
  FileText,
  Clock,
  RefreshCw,
  Timer,
  Activity,
  AlertTriangle,
  Copy,
  Check,
  CheckCircle,
  FastForward,
  Play,
  Trash2,
} from 'lucide-react'
import { useFormatter, useLocale } from 'next-intl'
import type { JobState } from '../../types'
import { formatDuration, renderValue, type JobInfo } from '../job-shared'
import { useTelamonjsT } from '../../../i18n/use-t'
import { useFormat } from '../../../i18n/use-format'

export interface DetailPanelProps {
  job: JobInfo
  status: JobState
  copied: string | null
  retrying: boolean
  removing: boolean
  promoting: boolean
  confirmRemove: boolean
  canRetry: boolean
  canRemove: boolean
  canPromote: boolean
  onClose: () => void
  onCopy: (text: string, key: string) => void
  onRetry: (jobId: string, queueName: string) => void
  onRemove: (jobId: string, queueName: string) => void
  onPromote: (jobId: string, queueName: string) => void
  onConfirmRemove: (v: boolean) => void
}

export function DetailPanel({
  job,
  copied,
  retrying,
  removing,
  promoting,
  confirmRemove,
  canRetry,
  canRemove,
  canPromote,
  onClose,
  onCopy,
  onRetry,
  onRemove,
  onPromote,
  onConfirmRemove,
}: DetailPanelProps) {
  const t = useTelamonjsT()
  const format = useFormat()
  const intlFormat = useFormatter()
  const locale = useLocale()
  const created = {
    date: format.date(job.timestamp, 'short'),
    time: intlFormat.dateTime(new Date(job.timestamp), { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }

  return (
    <div className='flex flex-col h-full' data-testid='detail-panel'>
      {/* Header */}
      <div className='flex items-center justify-between px-5 py-3 border-b flex-shrink-0'>
        <h3 className='text-sm font-semibold'>{t('queue.detailPanel.title')}</h3>
        <button
          onClick={onClose}
          aria-label={t('queue.detailPanel.close')}
          data-testid='detail-panel-close'
          className='p-1.5 rounded hover:bg-muted transition-colors'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-5 space-y-5'>
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
                data-testid='detail-panel-copy-id'
                className='p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0'
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
            <code className='block text-sm bg-muted px-2 py-1 rounded font-mono'>{job.queueName}</code>
          </div>

          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Clock className='h-4 w-4' />
              {t('queue.detail.createdAt')}
            </div>
            <div className='text-sm'>
              <span className='font-medium'>{created.date}</span>
              <span className='text-muted-foreground ml-2'>{created.time}</span>
            </div>
          </div>

          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <RefreshCw className='h-4 w-4' />
              {t('queue.detail.attempts')}
            </div>
            <div className='text-sm'>
              <span className='font-medium'>{job.attemptsMade}</span>
              <span className='text-muted-foreground'> / {job.attemptsMax}</span>
            </div>
          </div>

          {job.processedOn && job.finishedOn && (
            <div className='space-y-1 col-span-2'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Timer className='h-4 w-4' />
                {t('queue.detail.duration')}
              </div>
              <div className='text-sm font-medium'>{formatDuration(job.processedOn, job.finishedOn, locale)}</div>
            </div>
          )}

          {job.progress > 0 && job.progress < 100 && (
            <div className='space-y-1 col-span-2'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Activity className='h-4 w-4' />
                {t('queue.detail.progress')}
              </div>
              <div className='flex items-center gap-2'>
                <div className='flex-1 h-2 bg-muted rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-blue-500 rounded-full transition-all'
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <span className='text-sm font-medium'>{job.progress}%</span>
              </div>
            </div>
          )}
        </div>

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

        {job.stacktrace && job.stacktrace.length > 0 && (
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
        )}

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
                data-testid='detail-panel-copy-data'
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
              <pre className='text-sm font-mono whitespace-pre-wrap'>{renderValue(job.data)}</pre>
            </div>
          </div>
        )}

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
                data-testid='detail-panel-copy-result'
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

      {/* Actions */}
      {(canRetry || canRemove || canPromote) && (
        <div className='flex items-center gap-2 px-5 py-3 border-t bg-muted/30 flex-shrink-0'>
          {canPromote && (
            <button
              onClick={() => onPromote(job.id, job.queueName)}
              disabled={promoting || removing}
              data-testid='detail-panel-promote'
              className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50'
            >
              {promoting ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <FastForward className='h-4 w-4' />
              )}
              {t('queue.actions.executeNow')}
            </button>
          )}
          {canRetry && (
            <button
              onClick={() => onRetry(job.id, job.queueName)}
              disabled={retrying || removing}
              data-testid='detail-panel-retry'
              className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50'
            >
              {retrying ? <RefreshCw className='h-4 w-4 animate-spin' /> : <Play className='h-4 w-4' />}
              {t('queue.actions.retry')}
            </button>
          )}
          {canRemove &&
            (confirmRemove ? (
              <div className='flex items-center gap-2'>
                <span className='text-sm text-red-600 dark:text-red-400'>{t('queue.detail.confirmQuestion')}</span>
                <button
                  onClick={() => onRemove(job.id, job.queueName)}
                  disabled={removing}
                  data-testid='detail-panel-remove-confirm'
                  className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50'
                >
                  {removing ? (
                    <RefreshCw className='h-3 w-3 animate-spin' />
                  ) : (
                    <Trash2 className='h-3 w-3' />
                  )}
                  {t('queue.actions.yes')}
                </button>
                <button
                  onClick={() => onConfirmRemove(false)}
                  disabled={removing}
                  data-testid='detail-panel-remove-cancel'
                  className='px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-50'
                >
                  {t('queue.actions.no')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => onConfirmRemove(true)}
                disabled={retrying}
                data-testid='detail-panel-remove'
                className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50'
              >
                <Trash2 className='h-4 w-4' />
                {t('queue.actions.delete')}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
