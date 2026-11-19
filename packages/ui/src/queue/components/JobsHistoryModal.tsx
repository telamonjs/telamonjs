'use client'

/**
 * JobsHistoryModal - Fullscreen modal for job execution history
 *
 * Hook: useQueueHistoryAll (staleTime: 10s, refetch on focus)
 * Local: debounce (300ms), UI state (modals, filters, search, pagination)
 *
 * Features:
 * - Fullscreen mode like JobEventTimeline
 * - Date range filtering (start/end)
 * - Status filters (completed, failed, all)
 * - Search
 * - Pagination
 * - Job detail viewing
 *
 * Fase A2: decomposed into jobs-history-modal/{fullscreen-modal,
 * job-detail-modal,clear-confirm-dialog}.tsx (module-level, explicit props)
 * + job-shared.tsx (status/filter config, types, formatting helpers). This
 * file stays the orchestrator: owns all state, data fetching, and mutation
 * handlers; renders the three pieces.
 */

import { Fragment, useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { useQueueApi } from '../api/provider'
import { useQueueHistoryAll, useCopyToClipboard } from '../hooks'
import { useTelamonjsT } from '../../i18n/use-t'
import {
  getFilterOptions,
  HISTORY_PAGE_SIZE,
  type FilterStatus,
  type JobInfo,
} from './job-shared'
import { FullscreenModal } from './jobs-history-modal/fullscreen-modal'
import { JobDetailModal } from './jobs-history-modal/job-detail-modal'
import { ClearConfirmDialog } from './jobs-history-modal/clear-confirm-dialog'

interface JobsHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function JobsHistoryModal({
  isOpen,
  onClose,
}: JobsHistoryModalProps) {
  const t = useTelamonjsT()
  const filterOptions = useMemo(() => getFilterOptions(t), [t])
  const api = useQueueApi()

  // UI State (modals, filters, interactions)
  const [selectedJob, setSelectedJob] = useState<JobInfo | null>(null)
  const { copied, copy: copyToClipboard, reset: resetCopied } = useCopyToClipboard()
  const [isClearing, setIsClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination
  const [offset, setOffset] = useState(0)

  // Debounce search (manual - React Query doesn't have built-in debounce)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset offset when filters change, computed during render (not an
  // effect) per React's "adjusting state when a prop changes" pattern.
  const filterKey = [debouncedSearch, filter, startDate, endDate].join('\u0000')
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setOffset(0)
  }

  // Build URLSearchParams for query (memoized to prevent unnecessary re-renders)
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()

    // Get statuses for current filter
    const selectedFilter = filterOptions.find(f => f.value === filter)
    if (selectedFilter) {
      params.set('statuses', selectedFilter.statuses.join(','))
    }

    params.set('limit', HISTORY_PAGE_SIZE.toString())
    params.set('offset', offset.toString())

    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim())
    }

    if (startDate) {
      params.set('startDate', startDate)
    }

    if (endDate) {
      params.set('endDate', endDate)
    }

    return params
  }, [filter, debouncedSearch, startDate, endDate, offset, filterOptions])

  // React Query hook - handles fetching, caching, retry
  const {
    data,
    isLoading: loading,
    refetch: fetchJobs,
  } = useQueueHistoryAll(queryParams)

  // Extract data with defaults
  const jobs = data?.jobs ?? []
  const total = data?.total ?? 0
  const stats = data?.stats ?? { completed: 0, failed: 0 }
  const approximate = data?.approximate === true

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return undefined

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedJob) {
          setSelectedJob(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, selectedJob, onClose])

  // Reset copied state when switching jobs
  useEffect(() => {
    resetCopied()
  }, [selectedJob?.id, resetCopied])

  const handleRetry = async (jobId: string, queueName: string) => {
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
  }

  const handleRemove = async (jobId: string, queueName: string) => {
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
  }

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

  if (!isOpen) return null

  return (
    <Fragment>
      <FullscreenModal
        onClose={onClose}
        approximate={approximate}
        total={total}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        debouncedSearch={debouncedSearch}
        loading={loading}
        onRefresh={() => fetchJobs()}
        onRequestClear={() => setShowClearConfirm(true)}
        jobs={jobs}
        onSelectJob={setSelectedJob}
        offset={offset}
        onOffsetChange={setOffset}
      />

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onRetry={handleRetry}
          onRemove={handleRemove}
          copied={copied}
          onCopy={copyToClipboard}
        />
      )}

      {showClearConfirm && (
        <ClearConfirmDialog
          stats={stats}
          isClearing={isClearing}
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={handleClearHistory}
        />
      )}
    </Fragment>
  )
}
