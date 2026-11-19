'use client'

/**
 * HistoricoTab — job execution history with master-detail layout (virtual
 * list + inspection panel), date range/status/search filters, pagination,
 * and clear-history flow.
 *
 * Fase A3: decomposed into tabs/historico/{history-job-row,job-detail-panel}
 * (module-level, explicit props) + shared status/filter config & formatting
 * helpers hoisted to job-shared.tsx (dedup'd with JobsHistoryModal's copy,
 * Fase A2). This file stays the orchestrator: owns all state, data fetching,
 * and mutation handlers; renders the two pieces.
 */

import {
  Fragment,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import {
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  History,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import { logger } from '../../../utils/logger'
import { toast } from 'sonner'
import { subHours } from 'date-fns'
import { useQueueApi } from '../../api/provider'
import { useQueueHistoryAll, useCopyToClipboard } from '../../hooks'
import { TabToolbar } from '../../../components/toolbar/TabToolbar'
import { formatQueueName } from '../../lib/format'
import { useLocale } from 'next-intl'
import { useTelamonjsT } from '../../../i18n/use-t'
import { useQueueReadOnly } from '../read-only-context'
import { useFormat } from '../../../i18n/use-format'
import {
  getFilterOptions,
  formatDuration,
  truncateId,
  renderValue,
  type FilterStatus,
  type JobInfo,
} from '../job-shared'
import { HistoryJobRow } from './historico/history-job-row'
import { JobDetailPanel } from './historico/job-detail-panel'

interface DateRange {
  start: Date
  end: Date | null
}

/* ─── Main Component ─── */
export default function HistoricoTab() {
  'use no memo' // useVirtualizer (TanStack) is incompatible with the compiler
  const t = useTelamonjsT()
  const readOnly = useQueueReadOnly()
  const format = useFormat()
  const locale = useLocale()
  const filterOptions = useMemo(() => getFilterOptions(t), [t])
  const formatDate = (ts: number) => format.dateTime(ts)
  const formatJobDuration = useCallback(
    (start: number, end: number) => formatDuration(start, end, locale),
    [locale]
  )
  const api = useQueueApi()

  const [selectedJob, setSelectedJob] = useState<JobInfo | null>(null)
  const { copied, copy: copyToClipboard } = useCopyToClipboard()
  const [isClearing, setIsClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subHours(new Date(), 24),
    end: new Date(),
  })

  const [offset, setOffset] = useState(0)
  const limit = 50

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch, filter, dateRange])

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    const selectedFilter = filterOptions.find(f => f.value === filter)
    if (selectedFilter) {
      params.set('statuses', selectedFilter.statuses.join(','))
    }
    params.set('limit', limit.toString())
    params.set('offset', offset.toString())
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
    params.set('startDate', dateRange.start.toISOString())
    if (dateRange.end) params.set('endDate', dateRange.end.toISOString())
    else params.set('endDate', new Date().toISOString())
    return params
  }, [filter, debouncedSearch, dateRange, offset, filterOptions])

  const {
    data,
    isLoading: loading,
    refetch: fetchJobs,
  } = useQueueHistoryAll(queryParams)

  const jobs = data?.jobs ?? []
  const total = data?.total ?? 0
  const stats = data?.stats ?? { completed: 0, failed: 0 }
  const approximate = data?.approximate === true

  const handleRetry = useCallback(
    async (jobId: string, queueName: string) => {
      try {
        await api.retryJob({ jobId, queueName })
        toast.success(t('queue.jobsHistoryModal.retrySent'))
        setSelectedJob(null)
        await fetchJobs()
      } catch (err) {
        logger.error('Error retrying job', {
          error: err instanceof Error ? err : String(err),
        })
        toast.error(t('queue.jobsHistoryModal.retryError'))
      }
    },
    [api, fetchJobs, t]
  )

  const handleRemove = useCallback(
    async (jobId: string, queueName: string) => {
      try {
        await api.removeJob({ jobId, queueName })
        toast.success(t('queue.jobsHistoryModal.removed'))
        setSelectedJob(null)
        await fetchJobs()
      } catch (err) {
        logger.error('Error removing job', {
          error: err instanceof Error ? err : String(err),
        })
        toast.error(t('queue.jobsHistoryModal.removeError'))
      }
    },
    [api, fetchJobs, t]
  )

  const handleClearHistory = async () => {
    setIsClearing(true)
    try {
      const data = await api.clearHistory('completed,failed')
      // success === false only happens when ALL queues failed to clear —
      // not the same case as "there was nothing to remove", so don't show
      // the misleading toast.info here.
      if (data.totalRemoved === 0 && data.success !== false) {
        toast.info(t('queue.jobsHistoryModal.noJobsToRemove'))
      } else if (data.totalRemoved > 0) {
        const queueCount = Object.keys(data.byQueue || {}).length
        toast.success(
          t('queue.jobsHistoryModal.removedCount', { count: data.totalRemoved, queueCount })
        )
      }
      if (data.errors && data.errors.length > 0) {
        toast.warning(t('queue.jobsHistoryModal.clearFailure', { errors: data.errors.join(', ') }))
      }
      setShowClearConfirm(false)
      await fetchJobs()
    } catch (err) {
      logger.error('Error clearing history', {
        error: err instanceof Error ? err : String(err),
      })
      toast.error(t('queue.jobsHistoryModal.clearError'))
    } finally {
      setIsClearing(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  // Virtual list
  const listParentRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer (TanStack)
  const rowVirtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 42,
    overscan: 10,
  })

  return (
    <div className='flex h-full flex-col'>
      {/* Toolbar */}
      <TabToolbar>
        <TabToolbar.DateRange
          value={dateRange}
          onChange={setDateRange}
          maxDays={7}
        />
        <div className='flex items-center gap-1'>
          {filterOptions.map(option => {
            const count =
              option.value === 'all'
                ? (stats.completed ?? 0) + (stats.failed ?? 0)
                : (stats[option.value] ?? 0)

            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                data-testid={`filter-${option.value}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-all',
                  filter === option.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                )}
              >
                {option.icon}
                {option.label}
                <span
                  className={cn(
                    'ml-0.5 rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums',
                    filter === option.value
                      ? 'bg-white/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {format.number(count)}
                </span>
              </button>
            )
          })}
        </div>
        {/* Abaixo de lg o TabToolbar é grid-cols-2: agrupar os controles finais numa linha flex (mesmo padrão do ListPageToolbar). */}
        <div className='flex flex-wrap items-center gap-2 col-span-2 lg:contents'>
          <TabToolbar.Spacer />
          {approximate && !loading && (
            <span className='text-xs text-muted-foreground'>~</span>
          )}
          <TabToolbar.Counter
            count={total}
            label={n => (n === 1 ? t('queue.history.resultLabelOne') : t('queue.history.resultLabelOther'))}
            loading={loading}
            className='ml-0'
          />
          <TabToolbar.Search
            placeholder={t('queue.history.searchPlaceholderTab')}
            value={search}
            onChange={setSearch}
            className='w-64'
          />
          <TabToolbar.Refresh onClick={() => fetchJobs()} loading={loading} />
          {!readOnly && (
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={loading || total === 0}
            data-testid='clear-history-trigger'
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors h-8',
              'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30',
              (loading || total === 0) && 'cursor-not-allowed opacity-50'
            )}
            title={t('queue.history.clearHistoryShort')}
          >
            <Trash2 className='h-3.5 w-3.5' />
            <span className='hidden lg:inline'>{t('queue.history.clear')}</span>
          </button>
          )}
        </div>
      </TabToolbar>

      {/* Master-Detail */}
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        {/* Left: List */}
        <div
          className={cn(
            'flex min-h-0 flex-col border-r',
            selectedJob ? 'w-1/2' : 'w-full'
          )}
        >
          <div ref={listParentRef} className='flex-1 overflow-y-auto'>
            {loading ? (
              <div className='flex h-full flex-col items-center justify-center gap-2'>
                <Loader2 className='text-muted-foreground h-6 w-6 animate-spin' />
                <span className='text-muted-foreground text-xs'>
                  {t('queue.history.loadingHistory')}
                </span>
              </div>
            ) : jobs.length === 0 ? (
              <div className='text-muted-foreground flex flex-col items-center justify-center py-16'>
                <History className='mb-3 h-10 w-10 opacity-30' />
                <p className='text-sm font-medium'>{t('queue.history.noJobsFound')}</p>
                <p className='mt-1 text-xs'>
                  {debouncedSearch
                    ? t('queue.history.tryAdjustFilters')
                    : t('queue.history.noExecutionsInPeriod')}
                </p>
              </div>
            ) : (
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
                    const job = jobs[virtualRow.index] as JobInfo
                    return (
                      <div
                        key={`${job.queueName}-${job.id}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <HistoryJobRow
                          job={job}
                          isSelected={
                            selectedJob?.id === job.id &&
                            selectedJob?.queueName === job.queueName
                          }
                          onClick={() => setSelectedJob(job)}
                          formatDate={formatDate}
                          formatDuration={formatJobDuration}
                          formatQueueName={formatQueueName}
                          truncateId={truncateId}
                        />
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && jobs.length > 0 && (
            <div className='bg-muted/30 flex shrink-0 items-center justify-between border-t px-4 py-2'>
              <div className='text-muted-foreground text-xs tabular-nums'>
                {t('queue.history.showingRange', {
                  from: offset + 1,
                  to: Math.min(offset + limit, total),
                  total,
                })}
              </div>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  data-testid='pagination-previous'
                  className='hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <ChevronLeft className='h-3 w-3' />
                  {t('queue.history.previous')}
                </button>
                <span className='text-muted-foreground text-xs tabular-nums'>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setOffset(
                      Math.min(offset + limit, (totalPages - 1) * limit)
                    )
                  }
                  disabled={offset + limit >= total}
                  data-testid='pagination-next'
                  className='hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('queue.history.next')}
                  <ChevronRight className='h-3 w-3' />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Detail */}
        {selectedJob && (
          <div className='bg-background min-h-0 w-1/2'>
            <JobDetailPanel
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              onRetry={handleRetry}
              onRemove={handleRemove}
              formatDate={formatDate}
              formatDuration={formatJobDuration}
              formatQueueName={formatQueueName}
              copyToClipboard={copyToClipboard}
              copied={copied}
              renderValue={renderValue}
            />
          </div>
        )}
      </div>

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <Fragment>
          <div
            className='fixed inset-0 z-[60] bg-black/50'
            onClick={() => setShowClearConfirm(false)}
          />
          <div className='bg-background fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 shadow-2xl'>
            <div className='mb-4 flex items-center gap-4'>
              <div className='rounded-full bg-red-100 p-3 dark:bg-red-950/30'>
                <AlertTriangle className='h-6 w-6 text-red-600 dark:text-red-400' />
              </div>
              <div>
                <h3 className='text-lg font-semibold'>{t('queue.history.clearHistoryTitle')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t('queue.history.clearHistoryIrreversible')}
                </p>
              </div>
            </div>

            <p className='text-muted-foreground mb-4 text-sm'>
              {t('queue.history.clearHistoryConfirmBody')}
            </p>

            <div className='bg-muted/50 mb-6 flex items-center gap-4 rounded-lg p-3'>
              <div className='flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-500' />
                <span className='text-sm'>
                  <span className='font-semibold text-green-700'>
                    {stats.completed || 0}
                  </span>{' '}
                  {t('queue.history.completedCount')}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <XCircle className='h-4 w-4 text-red-500' />
                <span className='text-sm'>
                  <span className='font-semibold text-red-600'>
                    {stats.failed || 0}
                  </span>{' '}
                  {t('queue.history.failedCount')}
                </span>
              </div>
              <div className='ml-auto text-sm font-medium'>
                {t('queue.history.total', { count: (stats.completed || 0) + (stats.failed || 0) })}
              </div>
            </div>

            <div className='flex items-center justify-end gap-3'>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                data-testid='clear-history-cancel'
                className='hover:bg-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors'
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                data-testid='clear-history-confirm'
                className='inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50'
              >
                {isClearing ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 className='h-4 w-4' />
                )}
                {isClearing ? t('queue.history.clearing') : t('queue.history.clearHistoryTitle')}
              </button>
            </div>
          </div>
        </Fragment>
      )}
    </div>
  )
}
