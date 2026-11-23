'use client'

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useDeferredValue,
  useId,
} from 'react'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import {
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Hash,
  FileText,
  Copy,
  Check,
  Activity,
  RefreshCw,
} from 'lucide-react'
import {
  useQueueEventsTimeline,
  useQueueStats,
  useQueueAction,
  useCopyToClipboard,
  useQueueHealth,
} from '../../hooks'
import { useQueueSSE } from '../../hooks/use-queue-sse'
import { useFormatter, useLocale } from 'next-intl'
import { cn } from '../../../utils/cn'
import { logger } from '../../../utils/logger'
import { toast } from 'sonner'
import { Badge } from '../../../ui/badge'
import JobStatsCards from '../JobStatsCards'
import QueuesTable, { type QueueAction } from '../QueuesTable'
import { TabToolbar } from '../../../components/toolbar/TabToolbar'
import { formatQueueName } from '../../lib/format'
import { useTelamonjsT } from '../../../i18n/use-t'
import { useFormat, useTickingNow } from '../../../i18n/use-format'

import type { TimelineJob } from '../../types'
import { actionDoneMessage } from '../../lib/action-message'

// ============================================================================
// HELPERS (module-level, no re-creation)
// ============================================================================

function getStatusConfig(t: ReturnType<typeof useTelamonjsT>) {
  return {
    active: {
      label: t('queue.stats.active'),
      color: 'bg-blue-500/10 text-blue-600',
      borderLight: 'border-l-blue-500',
      textLight: 'text-blue-600 dark:text-blue-400',
    },
    completed: {
      label: t('queue.status.completed'),
      color: 'bg-green-500/10 text-green-700',
      borderLight: 'border-l-green-500',
      textLight: 'text-green-700 dark:text-green-400',
    },
    failed: {
      label: t('queue.event.failed'),
      color: 'bg-red-500/10 text-red-600',
      borderLight: 'border-l-red-500',
      textLight: 'text-red-600 dark:text-red-400',
    },
  } as const
}

/** Locale-aware duration formatting (native Intl.NumberFormat, narrow unit). */
function formatDurationUnit(ms: number, locale: string): string {
  if (ms < 1000) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'millisecond',
      unitDisplay: 'narrow',
    }).format(ms)
  }
  if (ms < 60000) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
    }).format(Number((ms / 1000).toFixed(1)))
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'narrow',
  }).format(Number((ms / 60000).toFixed(0)))
}

function formatDuration(
  processedOn: number | undefined,
  finishedOn: number | undefined,
  locale: string
) {
  if (finishedOn && processedOn) {
    return formatDurationUnit(finishedOn - processedOn, locale)
  }
  if (processedOn) {
    return formatDurationUnit(Date.now() - processedOn, locale)
  }
  return '...'
}

function formatDurationMs(
  processedOn: number | undefined,
  finishedOn: number | undefined,
  locale: string
) {
  if (finishedOn && processedOn) {
    return formatDurationUnit(finishedOn - processedOn, locale)
  }
  return '—'
}

function formatTimestamp(
  format: ReturnType<typeof useFormat>,
  intlFormat: ReturnType<typeof useFormatter>,
  timestamp?: number
) {
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

// ============================================================================
// ISOLATED SUB-COMPONENTS (render boundaries)
// ============================================================================

/** QueuesPanel — subscribes to useQueueStats independently. Re-renders on SSE without affecting timeline. */
function QueuesPanel({
  onAction,
  moduleIcons,
}: {
  onAction: (action: QueueAction) => Promise<void>
  moduleIcons?: Record<string, string>
}) {
  const t = useTelamonjsT()
  const titleId = useId()
  const { data: stats, isLoading, refetch } = useQueueStats()
  // No-op (undefined) when the adapter has no getHealth — the table falls back to plain counts
  const { data: health } = useQueueHealth()

  return (
    <div className='flex flex-col overflow-hidden border-r'>
      <div className='shrink-0 border-b px-4 py-2.5'>
        <h2 id={titleId} className='text-sm font-semibold'>
          {t('queue.realtime.queuesTitle')}
        </h2>
      </div>
      <div
        tabIndex={0}
        role='region'
        aria-labelledby={titleId}
        className='flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
      >
        {isLoading || !stats ? (
          <div className='text-muted-foreground flex items-center justify-center py-8'>
            <RefreshCw className='mr-2 h-5 w-5 animate-spin' />
            <span className='text-sm'>{t('queue.realtime.loadingQueues')}</span>
          </div>
        ) : (
          <QueuesTable
            queues={stats.queues}
            health={health}
            moduleIcons={moduleIcons}
            onAction={onAction}
            onRefresh={() => refetch()}
          />
        )}
      </div>
    </div>
  )
}

/** StatsBar — subscribes to useQueueStats independently. Re-renders on SSE without affecting timeline. */
function StatsBar() {
  const t = useTelamonjsT()
  const { data: stats, isLoading } = useQueueStats()

  if (isLoading || !stats) {
    return (
      <div className='text-muted-foreground flex items-center justify-center py-4'>
        <RefreshCw className='mr-2 h-5 w-5 animate-spin' />
        <span className='text-sm'>{t('queue.realtime.loadingStats')}</span>
      </div>
    )
  }

  return <JobStatsCards stats={stats} />
}

// ============================================================================
// StatusFilterButtons (inline filter buttons for job status)
// ============================================================================

interface StatusFilterButtonsProps {
  statusFilter: string
  setStatusFilter: (v: string) => void
  stats: { total: number; active: number; completed: number; failed: number }
}

const StatusFilterButtons = React.memo(function StatusFilterButtons({
  statusFilter,
  setStatusFilter,
  stats,
}: StatusFilterButtonsProps) {
  const t = useTelamonjsT()
  const statusButtons = [
    {
      value: 'ALL',
      label: t('queue.statusPlural.all'),
      count: stats.total,
      color: '',
    },
    {
      value: 'active',
      label: t('queue.statusPlural.active'),
      count: stats.active,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      value: 'completed',
      label: t('queue.statusPlural.completed'),
      count: stats.completed,
      color: 'text-green-700 dark:text-green-400',
    },
    {
      value: 'failed',
      label: t('queue.statusPlural.failed'),
      count: stats.failed,
      color: 'text-red-600 dark:text-red-400',
    },
  ]

  return (
    <div className='bg-muted/50 flex flex-shrink-0 items-center gap-0.5 rounded-md p-0.5'>
      {statusButtons.map(btn => (
        <button
          key={btn.value}
          onClick={() => setStatusFilter(btn.value)}
          data-testid={`status-filter-${btn.value}`}
          className={cn(
            'whitespace-nowrap rounded-md px-2 py-1 text-xs',
            statusFilter === btn.value
              ? 'bg-background font-semibold shadow-sm'
              : 'hover:bg-background/50 text-muted-foreground',
            statusFilter === btn.value && btn.color
          )}
        >
          {btn.label}
          {btn.count > 0 && (
            <span className='ml-1 text-[10px]'>{btn.count}</span>
          )}
        </button>
      ))}
    </div>
  )
})

// ============================================================================
// JobRow (already memoized)
// ============================================================================

interface JobRowProps {
  job: TimelineJob
  isSelected: boolean
  onClick: () => void
}

const JobRow = React.memo(({ job, isSelected, onClick }: JobRowProps) => {
  const t = useTelamonjsT()
  const format = useFormat()
  const locale = useLocale()
  const now = useTickingNow()
  const config = getStatusConfig(t)[job.status]
  const duration = formatDuration(job.processedOn, job.finishedOn, locale)
  const relativeTs = job.finishedOn || job.processedOn || job.timestamp
  const timeAgo = relativeTs ? format.relative(relativeTs, now) : '—'
  const queueDisplay = formatQueueName(job.queueName)

  const StatusIcon =
    job.status === 'active'
      ? Clock
      : job.status === 'completed'
        ? CheckCircle
        : AlertCircle

  return (
    <div
      onClick={onClick}
      className={cn(
        'hover:bg-muted/50 cursor-pointer border-b border-l-4 px-3 py-1.5',
        config.borderLight,
        isSelected && 'bg-muted/50'
      )}
    >
      <div className='flex min-w-0 items-center gap-2'>
        <StatusIcon
          className={cn('h-3.5 w-3.5 flex-shrink-0', config.textLight)}
        />
        <span className='min-w-0 flex-1 truncate text-sm font-medium'>
          {job.name}
        </span>
        <span className='text-muted-foreground flex-shrink-0 text-xs'>
          {timeAgo}
        </span>
      </div>
      <div className='ml-[22px] mt-0.5 flex items-center gap-2'>
        <span className='text-muted-foreground truncate text-[11px]'>
          {queueDisplay}
        </span>
        <span className={cn('font-mono text-[11px]', config.textLight)}>
          {duration}
        </span>
        <Badge
          variant='outline'
          className={cn(
            'h-4 flex-shrink-0 px-1.5 py-0 text-[10px]',
            config.color
          )}
        >
          {config.label}
        </Badge>
      </div>
    </div>
  )
})

JobRow.displayName = 'JobRow'

// ============================================================================
// JobDetailPanel (extracted + memoized)
// ============================================================================

interface JobDetailPanelProps {
  job: TimelineJob | null
}

const JobDetailPanel = React.memo(function JobDetailPanel({
  job,
}: JobDetailPanelProps) {
  const t = useTelamonjsT()
  const format = useFormat()
  const intlFormat = useFormatter()
  const locale = useLocale()
  const { copied, copy: copyToClipboard } = useCopyToClipboard()

  if (!job) {
    return (
      <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2'>
        <FileText className='h-8 w-8' />
        <p className='text-sm'>{t('queue.realtime.selectJob')}</p>
      </div>
    )
  }

  const startTime = formatTimestamp(format, intlFormat, job.timestamp)
  const endTime = formatTimestamp(format, intlFormat, job.finishedOn)
  const duration = formatDurationMs(job.processedOn, job.finishedOn, locale)

  return (
    <div className='space-y-4 p-4'>
      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-0.5'>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Hash className='h-3 w-3' />
            {t('queue.realtime.field.jobId')}
          </div>
          <div className='flex items-center gap-1'>
            <code className='bg-muted flex-1 truncate rounded px-1.5 py-0.5 font-mono text-xs'>
              {job.id}
            </code>
            <button
              onClick={() => copyToClipboard(job.id, 'jobId')}
              className='hover:bg-muted rounded p-1'
              aria-label={t('queue.realtime.copyId')}
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
            {t('queue.realtime.field.queue')}
          </div>
          <code className='bg-muted block truncate rounded px-1.5 py-0.5 font-mono text-xs'>
            {job.queueName}
          </code>
        </div>

        <div className='space-y-0.5'>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Clock className='h-3 w-3' />
            {t('queue.realtime.field.start')}
          </div>
          <div className='text-xs'>
            <span className='font-medium'>{startTime.date}</span>
            <span className='text-muted-foreground ml-1'>{startTime.time}</span>
          </div>
        </div>

        <div className='space-y-0.5'>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Clock className='h-3 w-3' />
            {t('queue.realtime.field.end')}
          </div>
          <div className='text-xs'>
            <span className='font-medium'>{endTime.date}</span>
            <span className='text-muted-foreground ml-1'>{endTime.time}</span>
          </div>
        </div>

        <div className='space-y-0.5'>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Clock className='h-3 w-3' />
            {t('queue.realtime.field.duration')}
          </div>
          <p className='text-xs font-medium'>{duration}</p>
        </div>

        <div className='space-y-0.5'>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Activity className='h-3 w-3' />
            {t('queue.realtime.field.attempts')}
          </div>
          <p className='text-xs font-medium'>{job.attemptsMade || 0}</p>
        </div>
      </div>

      {/* Result */}
      <div className='space-y-1.5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400'>
            <CheckCircle className='h-3 w-3' />
            {t('queue.realtime.field.result')}
          </div>
          <button
            onClick={() =>
              copyToClipboard(
                JSON.stringify(job.returnvalue, null, 2),
                'result'
              )
            }
            className='hover:bg-muted rounded p-1'
            aria-label={t('queue.realtime.copyResult')}
          >
            {copied === 'result' ? (
              <Check className='h-3 w-3 text-green-500' />
            ) : (
              <Copy className='text-muted-foreground h-3 w-3' />
            )}
          </button>
        </div>
        <div className='overflow-x-auto rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30'>
          <pre className='whitespace-pre-wrap font-mono text-xs text-green-700 dark:text-green-300'>
            {JSON.stringify(job.returnvalue || {}, null, 2)}
          </pre>
        </div>
      </div>

      {/* Error */}
      {job.failedReason && (
        <div className='space-y-1.5'>
          <div className='flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400'>
            <AlertCircle className='h-3 w-3' />
            {t('queue.realtime.field.error')}
          </div>
          <div className='rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30'>
            <pre className='whitespace-pre-wrap font-mono text-xs text-red-700 dark:text-red-300'>
              {job.failedReason}
            </pre>
          </div>
        </div>
      )}

      {/* Raw JSON */}
      <div className='space-y-1.5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1.5 text-xs font-medium'>
            <FileText className='h-3 w-3' />
            {t('queue.realtime.field.jobData')}
          </div>
          <button
            onClick={() =>
              copyToClipboard(JSON.stringify(job, null, 2), 'data')
            }
            className='hover:bg-muted rounded p-1'
            aria-label={t('queue.realtime.copyData')}
          >
            {copied === 'data' ? (
              <Check className='h-3 w-3 text-green-500' />
            ) : (
              <Copy className='text-muted-foreground h-3 w-3' />
            )}
          </button>
        </div>
        <details className='group'>
          <summary className='text-muted-foreground hover:text-foreground cursor-pointer text-xs'>
            {t('queue.realtime.field.expandToView')}
          </summary>
          <div className='bg-muted mt-1.5 overflow-x-auto rounded-md p-3'>
            <pre className='whitespace-pre-wrap font-mono text-[11px]'>
              {JSON.stringify(job, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface TempoRealTabProps {
  /** Enable SSE real-time updates (default: true) */
  enableSSE?: boolean
  /** Module icons for the queues table (module name → emoji) */
  moduleIcons?: Record<string, string>
  /** This tab is the visible one — visited tabs stay mounted (default: true) */
  active?: boolean
  /** Timeline poll interval in ms while SSE is down (default: 2000) */
  pollInterval?: number
}

export default function TempoRealTab({
  enableSSE = true,
  moduleIcons,
  active = true,
  pollInterval,
}: TempoRealTabProps) {
  'use no memo' // useVirtualizer (TanStack) is incompatible with the compiler
  const t = useTelamonjsT()
  const maxItems = 50
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const deferredSearch = useDeferredValue(searchTerm)

  // SSE status — persists while tab is mounted
  const { status: sseStatus } = useQueueSSE(enableSSE)

  // Queue action mutation
  const queueActionMutation = useQueueAction()

  // Timeline data (right panel) — this is the ONLY query subscription in this component
  const {
    data: timelineData,
    isLoading,
    isError,
    isFetching,
    refetch: refetchTimeline,
  } = useQueueEventsTimeline({
    sseConnected: sseStatus === 'connected',
    active,
    pollInterval,
  })

  const handleQueueAction = useCallback(
    async (action: QueueAction) => {
      try {
        const result = await queueActionMutation.mutateAsync(action)
        if (result.success) {
          toast.success(actionDoneMessage(t, action, result))
        } else {
          toast.error(result.message || t('queue.dashboard.actionFailed'))
        }
      } catch (err) {
        toast.error(t('queue.dashboard.actionError'))
        logger.error('Action error', {
          error: err instanceof Error ? err : String(err),
        })
      }
    },
    [queueActionMutation, t]
  )

  const allJobs = useMemo(() => {
    if (!timelineData?.jobs) return []
    return timelineData.jobs.slice(0, maxItems)
  }, [timelineData?.jobs, maxItems])

  // Client-side filtering
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      if (deferredSearch) {
        const search = deferredSearch.toLowerCase()
        const matchName = job.name.toLowerCase().includes(search)
        const matchQueue = job.queueName.toLowerCase().includes(search)
        if (!matchName && !matchQueue) return false
      }
      if (statusFilter !== 'ALL' && job.status !== statusFilter) return false
      return true
    })
  }, [allJobs, deferredSearch, statusFilter])

  // Stats for FilterBar — derived from allJobs filtered ONLY by search (never
  // by statusFilter), so counts stay stable when a status filter is selected.
  const jobStats = useMemo(() => {
    const searchFiltered = deferredSearch
      ? allJobs.filter(job => {
          const search = deferredSearch.toLowerCase()
          return (
            job.name.toLowerCase().includes(search) ||
            job.queueName.toLowerCase().includes(search)
          )
        })
      : allJobs

    let active = 0,
      completed = 0,
      failed = 0
    for (const job of searchFiltered) {
      if (job.status === 'active') active++
      else if (job.status === 'completed') completed++
      else if (job.status === 'failed') failed++
    }
    return { total: searchFiltered.length, active, completed, failed }
  }, [allJobs, deferredSearch])

  // Memoize selectedJob lookup (used in detail panel)
  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null
    return allJobs.find(j => j.id === selectedJobId) ?? null
  }, [selectedJobId, allJobs])

  const handleRefresh = useCallback(() => {
    refetchTimeline()
  }, [refetchTimeline])

  // Virtual list for job rows
  const parentRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer (TanStack)
  const rowVirtualizer = useVirtualizer({
    count: filteredJobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  })

  return (
    <div className='grid h-full min-h-0 grid-cols-1 gap-0 lg:grid-cols-[2fr_3fr]'>
      {/* Left: Queues (isolated — subscribes to stats independently) */}
      <QueuesPanel onAction={handleQueueAction} moduleIcons={moduleIcons} />

      {/* Right: Stats + Timeline */}
      <div className='relative flex flex-col overflow-hidden'>
        <div className='shrink-0 p-4 pb-2'>
          <StatsBar />
        </div>
        <TabToolbar>
          <TabToolbar.Search
            placeholder={t('queue.realtime.searchPlaceholder')}
            value={searchTerm}
            onChange={setSearchTerm}
            className='w-52'
          />
          {/* eslint-disable-next-line telamonjs-accessibility/button-accessibility -- falso positivo: nome do componente contém "Buttons", mas os <button> internos já têm data-testid próprio */}
          <StatusFilterButtons
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            stats={jobStats}
          />
          {/* Abaixo de lg o TabToolbar é grid-cols-2: agrupar os controles finais numa linha flex. */}
          <div className='flex items-center gap-2 col-span-2 lg:contents'>
            <TabToolbar.Spacer />
            <TabToolbar.LiveIndicator connected={sseStatus === 'connected'} />
            <TabToolbar.Refresh onClick={handleRefresh} loading={isFetching} />
          </div>
        </TabToolbar>

        <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2'>
          {/* Job List (virtualized) */}
          <div
            ref={parentRef}
            tabIndex={0}
            role='region'
            aria-label={t('queue.realtime.jobsListRegion')}
            className='overflow-y-auto border-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
          >
            {/* Loading */}
            {isLoading && (
              <div className='text-muted-foreground flex items-center justify-center py-8'>
                <RefreshCw className='mr-2 h-5 w-5 animate-spin' />
                <span className='text-sm'>
                  {t('queue.realtime.loadingJobs')}
                </span>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className='m-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30'>
                <p className='text-sm text-red-700 dark:text-red-300'>
                  {t('queue.realtime.connectionError')}
                </p>
              </div>
            )}

            {/* Virtualized job rows */}
            {!isLoading && !isError && filteredJobs.length > 0 && (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer
                  .getVirtualItems()
                  .map((virtualRow: VirtualItem) => {
                    const job = filteredJobs[virtualRow.index]
                    return (
                      <div
                        key={job.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <JobRow
                          job={job}
                          isSelected={selectedJobId === job.id}
                          onClick={() => setSelectedJobId(job.id)}
                        />
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && filteredJobs.length === 0 && (
              <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2 py-8'>
                <Zap className='h-8 w-8' />
                <p className='text-sm'>
                  {allJobs.length > 0
                    ? t('queue.realtime.noJobsFiltered')
                    : t('queue.realtime.noJobsProcessing')}
                </p>
              </div>
            )}
          </div>

          {/* Job Detail (isolated via React.memo) */}
          <div
            tabIndex={0}
            role='region'
            aria-label={t('queue.realtime.jobDetailRegion')}
            className='overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
          >
            <JobDetailPanel job={selectedJob} />
          </div>
        </div>
      </div>
    </div>
  )
}
