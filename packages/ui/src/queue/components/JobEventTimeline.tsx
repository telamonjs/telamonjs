'use client'

/**
 * JobEventTimeline - Real-time job events timeline with clickable items
 *
 * Features:
 * - Auto-polling every 2s with useQueueEventsTimeline hook
 * - Timeline of active/completed jobs
 * - Job rows are buttons (keyboard + screen reader) opening the details
 * - Row actions: retry a failed job, remove a job (confirmed), hidden when
 *   the dashboard is readOnly; retry also hidden for `manualRetry: false`
 * - Status indicators (active, completed, failed)
 * - Duration/processing time display
 * - Expandable full-screen mode
 * - Token authentication via cookies
 */

import { useState, useEffect, useId, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  X,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  RotateCcw,
  Hash,
  FileText,
  Copy,
  Check,
  Activity,
} from 'lucide-react'
import { useFormatter, useLocale } from 'next-intl'
import { cn } from '../../utils/cn'
import {
  useQueueEventsTimeline,
  useQueueStats,
  useQueueHealth,
  useCopyToClipboard,
} from '../hooks'
import { useEscapeToClose } from '../hooks/use-escape-to-close'
import { useQueueApi } from '../api/provider'
import { logger } from '../../utils/logger'
import { useQueueReadOnly } from './read-only-context'
import type { TimelineJob } from '../types'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'
import { formatDuration } from './job-shared'

interface JobEventTimelineProps {
  maxItems?: number
  className?: string
}

// Timeline rows round seconds/minutes coarser than job-shared's default (2
// decimals): 1 decimal for seconds, whole minutes.
const TIMELINE_DURATION_DIGITS = { seconds: 1, minutes: 0 }

// Module-level (not a closure inside the component) so `Date.now()` isn't
// reachable from the compiler's analysis of the component's render body —
// same convention as TempoRealTab.tsx's sibling `formatDuration`.
function formatEventDuration(
  processedOn: number | undefined,
  finishedOn: number | undefined,
  _timestamp: number | undefined,
  locale: string
): string {
  if (finishedOn && processedOn) {
    return formatDuration(processedOn, finishedOn, locale, TIMELINE_DURATION_DIGITS)
  }
  if (processedOn) {
    return formatDuration(processedOn, Date.now(), locale, TIMELINE_DURATION_DIGITS)
  }
  return '...'
}

export default function JobEventTimeline({
  maxItems = 30,
  className,
}: JobEventTimelineProps) {
  const t = useTelamonjsT()
  const format = useFormat()
  const intlFormat = useFormatter()
  const locale = useLocale()
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const { copied, copy: copyToClipboard, reset: resetCopied } = useCopyToClipboard()
  const api = useQueueApi()
  const queryClient = useQueryClient()
  const readOnly = useQueueReadOnly()
  const { data: health } = useQueueHealth()
  const detailTitleId = useId()

  // ESC closes the innermost layer: the details, then the expanded view
  useEscapeToClose(selectedJobId !== null, () => setSelectedJobId(null))
  useEscapeToClose(isExpanded, () => setIsExpanded(false))

  // Fetch jobs timeline
  const {
    data: timelineData,
    isLoading,
    isError,
    isFetching,
  } = useQueueEventsTimeline()
  // Also fetch stats for the overall counter (keeps the query active)
  useQueueStats()

  // Reset copied state when switching jobs
  useEffect(() => {
    resetCopied()
  }, [selectedJobId, resetCopied])

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return { date: '—', time: '—' }
    return {
      date: format.date(timestamp, 'short'),
      time: intlFormat.dateTime(new Date(timestamp), {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      }),
    }
  }

  const formatDurationMs = (processedOn?: number, finishedOn?: number) => {
    if (finishedOn && processedOn) {
      return `${format.number(finishedOn - processedOn)}ms`
    }
    return '—'
  }

  const jobs = useMemo(() => {
    if (!timelineData?.jobs) return []
    return timelineData.jobs.slice(0, maxItems)
  }, [timelineData, maxItems])

  const runJobAction = async (job: TimelineJob, action: 'retry' | 'remove') => {
    setPendingId(job.id)
    try {
      const params = { jobId: job.id, queueName: job.queueName }
      if (action === 'retry') await api.retryJob(params)
      else await api.removeJob(params)
      toast.success(
        t(action === 'retry' ? 'queue.jobsListModal.retrySent' : 'queue.jobsListModal.removed')
      )
      if (action === 'remove' && selectedJobId === job.id) setSelectedJobId(null)
      await Promise.all(
        [['queue', 'events-timeline'], ['queue', 'stats'], ['queue', 'jobs'], ['queue', 'history']].map(
          queryKey => queryClient.invalidateQueries({ queryKey })
        )
      )
    } catch (err) {
      logger.error(action === 'retry' ? 'Error retrying job' : 'Error removing job', {
        error: err instanceof Error ? err : String(err),
      })
      toast.error(
        t(action === 'retry' ? 'queue.jobsListModal.retryError' : 'queue.jobsListModal.removeError')
      )
    } finally {
      setPendingId(null)
      setConfirmRemoveId(null)
    }
  }

  const canRetry = (job: TimelineJob) =>
    !readOnly && job.status === 'failed' && health?.get(job.queueName)?.manualRetry !== false

  const isConnected = !isError && !isLoading
  const statusText = isLoading
    ? t('queue.eventTimeline.connecting')
    : isError
      ? t('queue.eventTimeline.disconnected')
      : isFetching
        ? t('queue.eventTimeline.updatingShort')
        : t('queue.eventTimeline.online')

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40'
      case 'completed':
        return 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40'
      case 'failed':
        return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40'
      default:
        return 'border-l-4 border-l-border bg-muted/50 hover:bg-muted'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Clock className='h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin' />
        )
      case 'completed':
        return (
          <CheckCircle className='h-4 w-4 text-green-700 dark:text-green-400' />
        )
      case 'failed':
        return (
          <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400' />
        )
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className='border-b border-border px-6 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-3 min-w-0'>
          <Zap className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0' />
          <h3 className='text-lg font-semibold truncate'>{t('queue.eventTimeline.title')}</h3>
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0',
              isConnected
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
            )}
          >
            {isConnected ? (
              <Wifi className='h-3 w-3' />
            ) : (
              <WifiOff className='h-3 w-3' />
            )}
            {statusText}
          </span>
        </div>

        {/* Header actions - Minimal icons only */}
        <div className='flex items-center gap-1 ml-2 flex-shrink-0'>
          {jobs.length > 0 && (
            <span className='text-xs font-medium text-muted-foreground px-2'>
              {jobs.length}
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='p-2 text-muted-foreground hover:bg-muted rounded'
            title={isExpanded ? t('queue.eventTimeline.collapse') : t('queue.eventTimeline.expand')}
            aria-label={isExpanded ? t('queue.eventTimeline.collapseTimeline') : t('queue.eventTimeline.expandTimeline')}
          >
            {isExpanded ? (
              <Minimize2 className='h-4 w-4' />
            ) : (
              <Maximize2 className='h-4 w-4' />
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          'p-6',
          isExpanded
            ? 'fixed inset-0 z-50 overflow-auto bg-card p-6 sm:inset-4 sm:rounded-lg sm:border sm:shadow-xl'
            : 'max-h-96 overflow-y-auto'
        )}
      >
        {/* Close button (expanded mode) */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className='absolute right-4 top-4 text-gray-400 hover:text-muted-foreground'
            aria-label={t('queue.eventTimeline.closeExpanded')}
          >
            <X className='h-5 w-5' />
          </button>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className='py-8 text-center'>
            <div className='inline-flex items-center gap-2 text-muted-foreground'>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-border border-t-blue-600 dark:border-t-blue-400' />
              {t('queue.eventTimeline.loadingJobs')}
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className='rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4'>
            <p className='text-sm text-red-700 dark:text-red-300'>
              {t('queue.eventTimeline.connectionError')}
            </p>
          </div>
        )}

        {/* Jobs timeline */}
        {!isLoading && !isError && jobs.length > 0 && (
          <ul className='space-y-2'>
            {jobs.map(job => {
              const confirming = confirmRemoveId === job.id
              const pending = pendingId === job.id
              return (
                <li
                  key={job.id}
                  className={cn(
                    'flex w-full items-start gap-2 rounded border transition-colors group',
                    getJobStatusColor(job.status)
                  )}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedJobId(job.id)}
                    aria-haspopup='dialog'
                    data-testid='job-timeline-row'
                    className='flex flex-1 min-w-0 items-start justify-between gap-3 rounded p-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
                  >
                    <span className='flex-1 min-w-0'>
                      <span className='flex items-center gap-2'>
                        {getStatusIcon(job.status)}
                        <span className='font-medium text-foreground truncate'>
                          {job.name}
                        </span>
                        {job.repeat && (
                          <span
                            className='text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded'
                            title={t('queue.eventTimeline.repeatHint')}
                          >
                            {t('queue.eventTimeline.repeat')}
                          </span>
                        )}
                      </span>
                      <span className='block text-xs text-muted-foreground mt-1 truncate'>
                        {job.queueName}
                      </span>
                    </span>

                    {/* Duration/Status */}
                    <span className='text-sm text-right'>
                      {job.status === 'active' ? (
                        <span className='text-blue-600 dark:text-blue-400 font-medium'>
                          {t('queue.eventTimeline.inProgress')}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'font-medium',
                            job.status === 'failed'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-700 dark:text-green-400'
                          )}
                        >
                          {formatEventDuration(
                            job.processedOn,
                            job.finishedOn,
                            job.timestamp,
                            locale
                          )}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Row actions: shown on hover and on keyboard focus */}
                  {!readOnly && (
                    <div
                      className={cn(
                        'flex items-center gap-1 self-center pr-3 transition-opacity',
                        confirming || pending
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      )}
                    >
                      {confirming ? (
                        <>
                          <span className='text-xs text-muted-foreground'>
                            {t('queue.detail.confirmDeleteQuestion')}
                          </span>
                          <button
                            type='button'
                            onClick={() => runJobAction(job, 'remove')}
                            disabled={pending}
                            data-testid='job-timeline-remove-confirm'
                            className='rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
                          >
                            {t('queue.actions.yes')}
                          </button>
                          <button
                            type='button'
                            onClick={() => setConfirmRemoveId(null)}
                            disabled={pending}
                            data-testid='job-timeline-remove-cancel'
                            className='rounded px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
                          >
                            {t('queue.actions.no')}
                          </button>
                        </>
                      ) : (
                        <>
                          {canRetry(job) && (
                            <button
                              type='button'
                              onClick={() => runJobAction(job, 'retry')}
                              disabled={pending}
                              className='p-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
                              title={t('queue.eventTimeline.retryJob')}
                              aria-label={t('queue.eventTimeline.retryJob')}
                            >
                              <RotateCcw className='h-3.5 w-3.5' />
                            </button>
                          )}
                          {/* An active job is locked by its worker: nothing to remove yet */}
                          {job.status !== 'active' && (
                            <button
                              type='button'
                              onClick={() => setConfirmRemoveId(job.id)}
                              disabled={pending}
                              className='p-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
                              title={t('queue.eventTimeline.removeJob')}
                              aria-label={t('queue.eventTimeline.removeJob')}
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Job details modal */}
        {selectedJobId &&
          jobs.find(j => j.id === selectedJobId) &&
          (() => {
            const job = jobs.find(j => j.id === selectedJobId)!

            const getStatusConfig = (
              status: 'active' | 'completed' | 'failed'
            ) => {
              switch (status) {
                case 'completed':
                  return {
                    label: t('queue.status.completed'),
                    icon: (
                      <CheckCircle className='h-5 w-5 text-green-700 dark:text-green-400' />
                    ),
                    color: 'text-green-700 dark:text-green-400',
                    bgColor: 'bg-green-100 dark:bg-green-950/30',
                  }
                case 'failed':
                  return {
                    label: t('queue.event.failed'),
                    icon: (
                      <AlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
                    ),
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-100 dark:bg-red-950/30',
                  }
                default:
                  return {
                    label: t('queue.eventTimeline.statusInProgress'),
                    icon: (
                      <Clock className='h-5 w-5 animate-spin text-blue-600 dark:text-blue-400' />
                    ),
                    color: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-100 dark:bg-blue-950/30',
                  }
              }
            }
            const config = getStatusConfig(job.status)
            const startTime = formatTimestamp(job.timestamp)
            const endTime = formatTimestamp(job.finishedOn)
            const duration = formatDurationMs(job.processedOn, job.finishedOn)

            return (
              <>
                {/* Backdrop */}
                <div
                  className='fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200'
                  onClick={() => setSelectedJobId(null)}
                />

                {/* Modal */}
                <div
                  role='dialog'
                  aria-modal='true'
                  aria-labelledby={detailTitleId}
                  className='fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[85vh] bg-card rounded-xl shadow-2xl z-50 flex flex-col animate-in zoom-in-95 duration-200'
                >
                  {/* Header */}
                  <div className='flex items-center justify-between px-6 py-4 border-b'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          config.bgColor,
                          config.color
                        )}
                      >
                        {config.icon}
                      </div>
                      <div>
                        <h2 id={detailTitleId} className='text-lg font-semibold'>
                          {config.label}
                        </h2>
                        <p className='text-sm text-muted-foreground'>
                          {job.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedJobId(null)}
                      className='p-2 rounded-lg hover:bg-muted transition-colors'
                      aria-label={t('queue.detail.close')}
                    >
                      <X className='h-5 w-5' />
                    </button>
                  </div>

                  {/* Content */}
                  <div className='flex-1 overflow-y-auto p-6 space-y-6'>
                    {/* Basic Info Grid */}
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
                            onClick={() => copyToClipboard(job.id, 'jobId')}
                            className='p-1.5 rounded hover:bg-gray-200 transition-colors'
                            title={t('queue.detail.copyId')}
                            aria-label={t('queue.detail.copyId')}
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
                          {t('queue.detail.start')}
                        </div>
                        <div className='text-sm'>
                          <span className='font-medium'>{startTime.date}</span>
                          <span className='text-muted-foreground ml-2'>
                            {startTime.time}
                          </span>
                        </div>
                      </div>

                      <div className='space-y-1'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Clock className='h-4 w-4' />
                          {t('queue.detail.end')}
                        </div>
                        <div className='text-sm'>
                          <span className='font-medium'>{endTime.date}</span>
                          <span className='text-muted-foreground ml-2'>
                            {endTime.time}
                          </span>
                        </div>
                      </div>

                      <div className='space-y-1'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Clock className='h-4 w-4' />
                          {t('queue.detail.duration')}
                        </div>
                        <p className='text-sm font-medium'>{duration}</p>
                      </div>

                      <div className='space-y-1'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Activity className='h-4 w-4' />
                          {t('queue.detail.events')}
                        </div>
                        <p className='text-sm font-medium'>
                          {t('queue.detail.eventsCount', { n: job.attemptsMade || 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Result - Always show */}
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400'>
                          <CheckCircle className='h-4 w-4' />
                          {t('queue.detail.result')}
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(job.returnvalue, null, 2),
                              'result'
                            )
                          }
                          className='p-1.5 rounded hover:bg-gray-200 transition-colors'
                          title={t('queue.detail.copyResult')}
                          aria-label={t('queue.detail.copyResult')}
                        >
                          {copied === 'result' ? (
                            <Check className='h-4 w-4 text-green-500' />
                          ) : (
                            <Copy className='h-4 w-4 text-muted-foreground' />
                          )}
                        </button>
                      </div>
                      <div className='bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg p-4 overflow-x-auto'>
                        <pre className='text-sm text-green-700 dark:text-green-300 font-mono whitespace-pre-wrap'>
                          {JSON.stringify(job.returnvalue || {}, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Error */}
                    {job.failedReason && (
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400'>
                          <AlertCircle className='h-4 w-4' />
                          {t('queue.detail.error')}
                        </div>
                        <div className='bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-4'>
                          <pre className='text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono'>
                            {job.failedReason}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Job Data */}
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2 text-sm font-medium'>
                          <FileText className='h-4 w-4' />
                          {t('queue.detail.jobData')}
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(job, null, 2),
                              'data'
                            )
                          }
                          className='p-1.5 rounded hover:bg-gray-200 transition-colors'
                          title={t('queue.detail.copyData')}
                          aria-label={t('queue.detail.copyData')}
                        >
                          {copied === 'data' ? (
                            <Check className='h-4 w-4 text-green-500' />
                          ) : (
                            <Copy className='h-4 w-4 text-muted-foreground' />
                          )}
                        </button>
                      </div>
                      <details className='group'>
                        <summary className='cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors'>
                          {t('queue.detail.expandToView')}
                        </summary>
                        <div className='mt-2 bg-muted rounded-lg p-4 overflow-x-auto'>
                          <pre className='text-xs font-mono whitespace-pre-wrap'>
                            {JSON.stringify(job, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/50'>
                    <button
                      onClick={() => setSelectedJobId(null)}
                      data-testid='job-timeline-modal-close'
                      className='px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors'
                    >
                      {t('queue.detail.close')}
                    </button>
                  </div>
                </div>
              </>
            )
          })()}

        {/* Empty state */}
        {!isLoading && !isError && jobs.length === 0 && (
          <div className='py-8 text-center'>
            <Zap className='mx-auto h-8 w-8 text-gray-400' />
            <p className='mt-2 text-sm text-muted-foreground'>
              {t('queue.eventTimeline.noJobsProcessing')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
