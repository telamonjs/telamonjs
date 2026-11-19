'use client'

/**
 * JobsListModal - 2-column list/detail layout with virtualized list (500 items)
 *
 * Desktop (>= md): left panel is a virtualized job list, right panel is an
 * inline detail pane (DetailPanel) — selecting a job never opens a second
 * modal. ArrowUp/ArrowDown move the selection and scroll the virtualizer.
 * Mobile (< md): list only; selecting a job opens JobDetailModal as a
 * stacked modal (same component/behavior as before).
 *
 * 2-column layout, limit 500 + virtualization, memoized JobRow, inline DetailPanel.
 * Both panels render unconditionally (responsive via CSS, not JS) — that's
 * why tests assert on wrapper classes rather than visibility.
 *
 * Hook: useQueueJobsAll (staleTime: 5s, refetch on focus)
 * Kept from v4: manual debounce (300ms), UI state (filters, search, bulk selection)
 */

import { Fragment, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { X, Loader2, Search, Square, CheckSquare, Trash2, Play, FastForward } from 'lucide-react'
import { cn } from '../../utils/cn'
import { logger } from '../../utils/logger'
import { toast } from 'sonner'
import { useEscapeToClose } from '../hooks/use-escape-to-close'
import { useFormatter } from 'next-intl'
import { useQueueApi } from '../api/provider'
import { useBulkJobAction, useQueueJobsAll, useCopyToClipboard } from '../hooks'
import { useTelamonjsT } from '../../i18n/use-t'
import { useQueueReadOnly } from './read-only-context'
import { useFormat } from '../../i18n/use-format'
import type { JobState } from '../types'
import { getStatusConfig, type JobInfo } from './job-shared'
import { JobRow } from './jobs-list-modal/job-row'
import { DetailPanel } from './jobs-list-modal/detail-panel'
import JobDetailModal from './JobDetailModal'

interface JobsListModalProps {
  status: JobState | null
  queueName?: string | null
  queueDisplayName?: string | null
  /**
   * `false` hides every retry action (bulk, detail panel, mobile detail) —
   * the queue's contract owns its retries (see `QueueHealth.manualRetry`).
   * Default `true`.
   */
  manualRetry?: boolean
  onClose: () => void
}

function formatDate(
  format: ReturnType<typeof useFormat>,
  intlFormat: ReturnType<typeof useFormatter>,
  timestamp: number
) {
  const date = new Date(timestamp)
  const isToday = date.toDateString() === new Date().toDateString()
  if (isToday) return intlFormat.dateTime(date, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return format.date(timestamp, 'short')
}

export default function JobsListModal({
  status,
  queueName,
  queueDisplayName,
  manualRetry = true,
  onClose,
}: JobsListModalProps) {
  'use no memo' // useVirtualizer (TanStack) is incompatible with the compiler
  const t = useTelamonjsT()
  const readOnly = useQueueReadOnly()
  const format = useFormat()
  const intlFormat = useFormatter()
  const statusConfig = getStatusConfig(t)
  const api = useQueueApi()

  // List/selection state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Detail panel state (shared by desktop DetailPanel and mobile JobDetailModal)
  const { copied, copy: copyToClipboard, reset: resetCopied } = useCopyToClipboard()
  const [retrying, setRetrying] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const bulkAction = useBulkJobAction()

  // ESC: closes the open job detail first, then the modal
  useEscapeToClose(status !== null, () => (selectedJobId ? setSelectedJobId(null) : onClose()))

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const queryParams = useMemo(() => {
    if (!status) return null
    const params = new URLSearchParams({ status, limit: '500' })
    if (queueName) params.set('queue', queueName)
    if (debouncedSearch?.trim()) params.set('search', debouncedSearch.trim())
    return params
  }, [status, debouncedSearch, queueName])

  const { data, isLoading: loading, refetch: fetchJobs } = useQueueJobsAll(queryParams)

  const jobs = useMemo(() => data?.jobs ?? [], [data])
  const total = data?.total ?? 0

  const activeJob = useMemo(() => {
    if (!selectedJobId) return null
    return (jobs as JobInfo[]).find(j => j.id === selectedJobId) ?? null
  }, [jobs, selectedJobId])

  // Clear stale selection when the selected job disappears from the list (e.g. after a refetch/action)
  useEffect(() => {
    if (selectedJobId && !activeJob) setSelectedJobId(null)
  }, [selectedJobId, activeJob])

  useEffect(() => {
    setConfirmRemove(false)
    resetCopied()
  }, [selectedJobId, resetCopied])

  // Clear bulk selection when data refetches
  useEffect(() => {
    if (data) setSelectedIds(new Set())
  }, [data])

  // Virtual list
  const listParentRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer (TanStack)
  const listVirtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  // ArrowUp/ArrowDown move the selection and scroll the virtualizer. Listener
  // registered once; reads latest state via ref to avoid add/removeEventListener
  // churn on every render.
  const keyboardStateRef = useRef({ selectedJobId, jobs, listVirtualizer })
  keyboardStateRef.current = { selectedJobId, jobs, listVirtualizer }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { selectedJobId, jobs, listVirtualizer } = keyboardStateRef.current
      if (!selectedJobId || jobs.length === 0) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

      e.preventDefault()
      const currentIndex = (jobs as JobInfo[]).findIndex(j => j.id === selectedJobId)
      if (currentIndex === -1) return

      const nextIndex =
        e.key === 'ArrowDown' ? Math.min(currentIndex + 1, jobs.length - 1) : Math.max(currentIndex - 1, 0)

      setSelectedJobId((jobs[nextIndex] as JobInfo).id)
      listVirtualizer.scrollToIndex(nextIndex, { align: 'auto' })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleSelect = useCallback((jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }, [])

  const selectJob = useCallback((job: JobInfo) => {
    setSelectedJobId(prev => (prev === job.id ? null : job.id))
  }, [])

  const toggleSelectAll = () => {
    if (selectedIds.size === jobs.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(jobs.map((j: JobInfo) => j.id)))
  }

  const handleRetry = async (jobId: string, jobQueueName: string) => {
    setRetrying(true)
    try {
      await api.retryJob({ jobId, queueName: jobQueueName })
      toast.success(t('queue.jobsListModal.retrySent'))
      setSelectedJobId(null)
      await fetchJobs()
    } catch (err) {
      logger.error('Error retrying job', { error: err instanceof Error ? err : String(err) })
      toast.error(t('queue.jobsListModal.retryError'))
    } finally {
      setRetrying(false)
    }
  }

  const handleRemove = async (jobId: string, jobQueueName: string) => {
    setRemoving(true)
    try {
      await api.removeJob({ jobId, queueName: jobQueueName })
      toast.success(t('queue.jobsListModal.removed'))
      setSelectedJobId(null)
      await fetchJobs()
    } catch (err) {
      logger.error('Error removing job', { error: err instanceof Error ? err : String(err) })
      toast.error(t('queue.jobsListModal.removeError'))
    } finally {
      setRemoving(false)
      setConfirmRemove(false)
    }
  }

  const handlePromote = async (jobId: string, jobQueueName: string) => {
    setPromoting(true)
    try {
      await api.promoteJob({ jobId, queueName: jobQueueName })
      toast.success(t('queue.jobsListModal.promoted'))
      setSelectedJobId(null)
      await fetchJobs()
    } catch (err) {
      logger.error('Error promoting job', { error: err instanceof Error ? err : String(err) })
      toast.error(t('queue.jobsListModal.promoteError'))
    } finally {
      setPromoting(false)
    }
  }

  const handleBulkAction = async (action: 'remove' | 'retry' | 'promote') => {
    if (selectedIds.size === 0) return

    try {
      const jobsToProcess = jobs
        .filter((job: JobInfo) => selectedIds.has(job.id))
        .map((job: JobInfo) => ({ id: job.id, queueName: queueName || job.queueName }))

      await bulkAction.mutateAsync({ action, jobs: jobsToProcess })

      const actionLabels = {
        remove: t('queue.jobsListModal.bulkRemoved'),
        retry: t('queue.jobsListModal.bulkRetried'),
        promote: t('queue.jobsListModal.bulkPromoted'),
      }
      toast.success(t('queue.jobsListModal.bulkResultCount', { count: jobsToProcess.length, label: actionLabels[action] }))

      setSelectedIds(new Set())
      await fetchJobs()
    } catch (err) {
      logger.error('Error executing bulk action', { error: err instanceof Error ? err : String(err) })
      toast.error(t('queue.jobsListModal.bulkError'))
    }
  }

  if (!status) return null

  const config = statusConfig[status]
  const canBulkRetry = !readOnly && status === 'failed' && manualRetry
  const canBulkPromote = !readOnly && status === 'delayed'
  const canBulkRemove =
    !readOnly && ['failed', 'completed', 'waiting', 'delayed'].includes(status)

  const canRetry = canBulkRetry
  const canRemove = canBulkRemove
  const canPromote = canBulkPromote

  return (
    <Fragment>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200' onClick={onClose} />

      {/* Modal */}
      <div className='fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-6xl md:max-h-[90vh] bg-background rounded-xl shadow-2xl z-50 flex flex-col animate-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='flex flex-col px-6 py-4 border-b gap-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className={cn('p-2 rounded-lg', config.bgColor, config.color)}>{config.icon}</div>
              <div>
                <h2 className='text-lg font-semibold'>
                  {t('queue.jobsListModal.jobsWithStatus', { status: config.label })}
                  {queueDisplayName && (
                    <span className='text-muted-foreground font-normal'> - {queueDisplayName}</span>
                  )}
                </h2>
                <p className='text-sm text-muted-foreground'>
                  {t('queue.jobsListModal.jobsFoundCount', { count: total })}
                  {queueName && <span className='font-mono text-xs ml-2'>({queueName})</span>}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label={t('queue.jobsListModal.close')} className='p-2 rounded-lg hover:bg-muted transition-colors'>
              <X className='h-5 w-5' />
            </button>
          </div>

          {/* Search */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <input
              type='text'
              placeholder={t('queue.jobsListModal.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20'
            />
          </div>
        </div>

        {/* Select All Bar */}
        {jobs.length > 0 && (
          <div className='flex items-center gap-3 px-6 py-2 bg-muted/30 border-b'>
            <button
              onClick={toggleSelectAll}
              data-testid='jobs-toggle-select-all'
              className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
            >
              {selectedIds.size === jobs.length ? (
                <CheckSquare className='h-4 w-4 text-primary' />
              ) : (
                <Square className='h-4 w-4' />
              )}
              {selectedIds.size === jobs.length ? t('queue.jobsListModal.deselectAll') : t('queue.jobsListModal.selectAll')}
            </button>
            {selectedIds.size > 0 && (
              <span className='text-xs text-muted-foreground'>
                {t('queue.jobsListModal.selectedCount', { count: selectedIds.size })}
              </span>
            )}
          </div>
        )}

        {/* Content: 2-column layout */}
        <div className='flex flex-1 min-h-0'>
          {/* Left Panel - List */}
          <div
            ref={listParentRef}
            tabIndex={0}
            role='region'
            aria-label={t('queue.realtime.jobsListRegion')}
            className='overflow-y-auto border-r w-full md:w-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
          >
            {loading ? (
              <div className='flex items-center justify-center py-16'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : jobs.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
                <div className={cn('p-4 rounded-full mb-4', config.bgColor)}>{config.icon}</div>
                <p className='text-sm'>
                  {debouncedSearch ? t('queue.jobsListModal.noResultsFound') : t('queue.jobsListModal.noJobsWithStatus', { status: config.label.toLowerCase() })}
                </p>
              </div>
            ) : (
              <div
                style={{ height: `${listVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
              >
                {listVirtualizer.getVirtualItems().map(virtualRow => {
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
                      <JobRow
                        job={job}
                        isSelected={selectedIds.has(job.id)}
                        isActive={selectedJobId === job.id}
                        status={status}
                        formatDate={ts => formatDate(format, intlFormat, ts)}
                        onToggleSelect={toggleSelect}
                        onSelectJob={selectJob}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Panel - inline detail (desktop only) */}
          <div
            className={cn('hidden md:flex flex-col md:w-1/2 overflow-y-auto', !activeJob && 'items-center justify-center')}
          >
            {!activeJob ? (
              <div className='flex flex-col items-center justify-center text-muted-foreground gap-3'>
                <div className={cn('p-4 rounded-full', config.bgColor, config.color)}>{config.icon}</div>
                <p className='text-sm'>{t('queue.jobsListModal.selectJobToView')}</p>
              </div>
            ) : (
              <DetailPanel
                job={activeJob}
                status={status}
                copied={copied}
                retrying={retrying}
                removing={removing}
                promoting={promoting}
                confirmRemove={confirmRemove}
                canRetry={canRetry}
                canRemove={canRemove}
                canPromote={canPromote}
                onClose={() => setSelectedJobId(null)}
                onCopy={copyToClipboard}
                onRetry={handleRetry}
                onRemove={handleRemove}
                onPromote={handlePromote}
                onConfirmRemove={setConfirmRemove}
              />
            )}
          </div>
        </div>

        {/* Footer with Bulk Actions */}
        <div className='flex items-center justify-between px-6 py-4 border-t bg-muted/30'>
          <div className='flex items-center gap-2'>
            {selectedIds.size > 0 && (
              <>
                {canBulkPromote && (
                  <button
                    onClick={() => handleBulkAction('promote')}
                    disabled={bulkAction.isPending}
                    data-testid='jobs-bulk-promote'
                    className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50'
                  >
                    {bulkAction.isPending ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <FastForward className='h-4 w-4' />
                    )}
                    {t('queue.jobsListModal.promote')}
                  </button>
                )}
                {canBulkRetry && (
                  <button
                    onClick={() => handleBulkAction('retry')}
                    disabled={bulkAction.isPending}
                    data-testid='jobs-bulk-retry'
                    className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50'
                  >
                    {bulkAction.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Play className='h-4 w-4' />}
                    {t('queue.jobsListModal.retry')}
                  </button>
                )}
                {canBulkRemove && (
                  <button
                    onClick={() => handleBulkAction('remove')}
                    disabled={bulkAction.isPending}
                    data-testid='jobs-bulk-remove'
                    className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50'
                  >
                    {bulkAction.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Trash2 className='h-4 w-4' />}
                    {t('queue.jobsListModal.remove')}
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            data-testid='jobs-list-modal-close'
            className='px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors'
          >
            {t('queue.jobsListModal.close')}
          </button>
        </div>
      </div>

      {/* Mobile fallback: JobDetailModal as a stacked modal */}
      <div className='md:hidden'>
        <JobDetailModal
          job={activeJob}
          onClose={() => setSelectedJobId(null)}
          onRetry={canRetry ? handleRetry : undefined}
          onRemove={canRemove ? handleRemove : undefined}
          onPromote={canPromote ? handlePromote : undefined}
        />
      </div>
    </Fragment>
  )
}
