'use client'

/**
 * Fullscreen job-history modal — backdrop, header, filters bar, job grid and
 * pagination footer. Extracted from JobsHistoryModal.tsx (Fase A2).
 *
 * Module-level with explicit props (no closures over the orchestrator's
 * state) so it reads as a standalone unit — same shape as the
 * `jobs-history-modal/job-detail-modal.tsx` and `clear-confirm-dialog.tsx`
 * siblings it's paired with.
 */

import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  Timer,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Search,
  Calendar,
  History,
  Filter,
  Trash2,
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import { formatQueueName } from '../../lib/format'
import { useLocale } from 'next-intl'
import { useTelamonjsT } from '../../../i18n/use-t'
import { useQueueReadOnly } from '../read-only-context'
import { useFormat } from '../../../i18n/use-format'
import {
  getStatusConfig,
  getFilterOptions,
  formatDuration,
  truncateId,
  HISTORY_PAGE_SIZE,
  type JobStatus,
  type JobInfo,
  type FilterStatus,
} from '../job-shared'

export interface FullscreenModalProps {
  onClose: () => void
  approximate: boolean
  total: number
  startDate: string
  endDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  stats: { completed?: number; failed?: number }
  filter: FilterStatus
  onFilterChange: (value: FilterStatus) => void
  search: string
  onSearchChange: (value: string) => void
  debouncedSearch: string
  loading: boolean
  onRefresh: () => void
  onRequestClear: () => void
  jobs: JobInfo[]
  onSelectJob: (job: JobInfo) => void
  offset: number
  onOffsetChange: (offset: number) => void
}

export function FullscreenModal({
  onClose,
  approximate,
  total,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  stats,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  debouncedSearch,
  loading,
  onRefresh,
  onRequestClear,
  jobs,
  onSelectJob,
  offset,
  onOffsetChange,
}: FullscreenModalProps) {
  const t = useTelamonjsT()
  const readOnly = useQueueReadOnly()
  const format = useFormat()
  const locale = useLocale()
  const statusConfig = getStatusConfig(t)
  const filterOptions = getFilterOptions(t)
  const totalPages = Math.ceil(total / HISTORY_PAGE_SIZE)
  const currentPage = Math.floor(offset / HISTORY_PAGE_SIZE) + 1

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200'
        onClick={onClose}
      />

      {/* Fullscreen Modal */}
      <div className='fixed inset-4 z-50 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300'>
        <div className='flex-1 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-background to-muted/30'>
            <div className='flex items-center gap-4'>
              <div className='p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg'>
                <History className='h-6 w-6 text-white' />
              </div>
              <div>
                <h2 className='text-xl font-bold'>{t('queue.history.title')}</h2>
                <p className='text-sm text-muted-foreground'>
                  {approximate ? '~' : ''}
                  {t('queue.history.jobsFoundCount', { count: total })}
                  {startDate || endDate ? ` ${t('queue.history.inPeriod')}` : ''}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              {/* Stats */}
              <div className='hidden md:flex items-center gap-2'>
                <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'>
                  <CheckCircle className='h-4 w-4 text-green-500' />
                  <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                    {stats.completed || 0}
                  </span>
                </div>
                <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'>
                  <XCircle className='h-4 w-4 text-red-500' />
                  <span className='text-sm font-medium text-red-700 dark:text-red-300'>
                    {stats.failed || 0}
                  </span>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                aria-label={t('queue.history.closeModal')}
                className='p-2 rounded-lg hover:bg-muted transition-colors'
                title={t('queue.history.closeEsc')}
              >
                <X className='h-5 w-5' />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className='flex flex-wrap items-center gap-4 px-6 py-3 border-b bg-muted/20'>
            {/* Date Range */}
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4 text-muted-foreground' />
              <input
                type='date'
                value={startDate}
                onChange={e => onStartDateChange(e.target.value)}
                className='px-2 py-1 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20'
                placeholder={t('queue.history.dateStart')}
              />
              <span className='text-muted-foreground'>{t('queue.history.dateTo')}</span>
              <input
                type='date'
                value={endDate}
                onChange={e => onEndDateChange(e.target.value)}
                className='px-2 py-1 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20'
                placeholder={t('queue.history.dateEnd')}
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    onStartDateChange('')
                    onEndDateChange('')
                  }}
                  data-testid='date-range-clear'
                  className='text-xs text-muted-foreground hover:text-foreground'
                >
                  {t('queue.history.clear')}
                </button>
              )}
            </div>

            <div className='w-px h-6 bg-border hidden md:block' />

            {/* Status Filter */}
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4 text-muted-foreground' />
              <div className='flex items-center gap-1'>
                {filterOptions.map(option => {
                  const count =
                    option.value === 'all'
                      ? (stats.completed ?? 0) + (stats.failed ?? 0)
                      : (stats[option.value as 'completed' | 'failed'] ?? 0)

                  return (
                    <button
                      key={option.value}
                      onClick={() => onFilterChange(option.value)}
                      data-testid={`filter-${option.value}`}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        filter === option.value
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {option.label}
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-xs',
                          filter === option.value
                            ? 'bg-white/20'
                            : 'bg-background'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className='w-px h-6 bg-border hidden md:block' />

            {/* Search */}
            <div className='relative flex-1 min-w-[200px] max-w-md'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <input
                type='text'
                placeholder={t('queue.history.searchPlaceholder')}
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                className='w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20'
              />
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={loading}
              aria-label={t('queue.history.refreshHistory')}
              className={cn(
                'p-2 rounded-lg hover:bg-muted transition-colors',
                loading && 'opacity-50'
              )}
              title={t('queue.history.refresh')}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>

            {/* Clear History */}
            {!readOnly && (
            <button
              onClick={onRequestClear}
              disabled={loading || total === 0}
              data-testid='clear-history-trigger'
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800',
                (loading || total === 0) && 'opacity-50 cursor-not-allowed'
              )}
              title={t('queue.history.clearHistory')}
            >
              <Trash2 className='h-4 w-4' />
              <span className='hidden md:inline'>{t('queue.history.clear')}</span>
            </button>
            )}
          </div>

          {/* Jobs List */}
          <div className='flex-1 overflow-y-auto p-6'>
            {loading ? (
              <div className='flex items-center justify-center py-16'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : jobs.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
                <div className='p-6 rounded-full bg-muted/50 mb-4'>
                  <History className='h-12 w-12 opacity-30' />
                </div>
                <p className='text-lg font-medium'>{t('queue.history.noJobsFound')}</p>
                <p className='text-sm mt-1'>
                  {debouncedSearch || startDate || endDate
                    ? t('queue.history.tryAdjustFilters')
                    : t('queue.history.noExecutionsRegistered')}
                </p>
              </div>
            ) : (
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {jobs.map((job: JobInfo) => {
                  const config = statusConfig[job.status as JobStatus]
                  const duration =
                    job.processedOn && job.finishedOn
                      ? formatDuration(job.processedOn, job.finishedOn, locale)
                      : null

                  return (
                    <button
                      key={`${job.queueName}-${job.id}`}
                      onClick={() => onSelectJob(job)}
                      data-testid={`job-card-${job.queueName}-${job.id}`}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-all hover:ring-2 hover:ring-offset-1',
                        config?.bgColor,
                        config?.borderColor,
                        'hover:ring-primary/20'
                      )}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3 min-w-0'>
                          <div
                            className={cn(
                              'p-2 rounded-lg text-white',
                              job.status === 'completed' && 'bg-green-500',
                              job.status === 'failed' && 'bg-red-500',
                              job.status === 'delayed' && 'bg-orange-500',
                              job.status === 'waiting' && 'bg-yellow-500',
                              job.status === 'active' && 'bg-blue-500'
                            )}
                          >
                            {config?.icon}
                          </div>
                          <div className='min-w-0'>
                            <p className='font-medium text-sm truncate'>
                              {formatQueueName(job.queueName)}
                            </p>
                            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                              <span className='font-mono'>
                                #{truncateId(job.id)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className='h-5 w-5 text-muted-foreground flex-shrink-0' />
                      </div>

                      <div className='flex items-center gap-3 mt-3 text-xs text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <Clock className='h-3 w-3' />
                          {format.dateTime(job.finishedOn || job.timestamp)}
                        </span>
                        {duration && (
                          <span className='flex items-center gap-1'>
                            <Timer className='h-3 w-3' />
                            {duration}
                          </span>
                        )}
                        {job.attemptsMade > 1 && (
                          <span className='flex items-center gap-1'>
                            <RefreshCw className='h-3 w-3' />
                            {job.attemptsMade}x
                          </span>
                        )}
                      </div>

                      {job.status === 'failed' && job.failedReason && (
                        <div className='mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400'>
                          <AlertCircle className='h-3 w-3 flex-shrink-0' />
                          <span className='truncate'>
                            {job.failedReason.slice(0, 60)}...
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {!loading && jobs.length > 0 && (
            <div className='flex items-center justify-between px-6 py-4 border-t bg-muted/30'>
              <div className='text-sm text-muted-foreground'>
                {t('queue.history.showingRange', {
                  from: offset + 1,
                  to: Math.min(offset + HISTORY_PAGE_SIZE, total),
                  total,
                })}
              </div>

              <div className='flex items-center gap-2'>
                <button
                  onClick={() =>
                    onOffsetChange(Math.max(0, offset - HISTORY_PAGE_SIZE))
                  }
                  disabled={offset === 0}
                  data-testid='pagination-previous'
                  className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <ChevronLeft className='h-4 w-4' />
                  {t('queue.history.previous')}
                </button>
                <span className='text-sm text-muted-foreground px-2'>
                  {t('queue.history.pageOf', { current: currentPage, total: totalPages })}
                </span>
                <button
                  onClick={() =>
                    onOffsetChange(
                      Math.min(
                        offset + HISTORY_PAGE_SIZE,
                        (totalPages - 1) * HISTORY_PAGE_SIZE
                      )
                    )
                  }
                  disabled={offset + HISTORY_PAGE_SIZE >= total}
                  data-testid='pagination-next'
                  className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {t('queue.history.next')}
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
