'use client'

/**
 * JobDetailModal - Modal showing full job details from queue
 */

import { Fragment, useEffect, useState } from 'react'
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Hash,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Timer,
  Play,
  Trash2,
  FastForward
} from 'lucide-react'
import { useFormatter, useLocale } from 'next-intl'
import { cn } from '../../utils/cn'
import { useCopyToClipboard } from '../hooks'
import { useQueueLabels } from './labels-context'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'

export interface JobInfo {
  id: string
  name: string
  queueName: string
  data: Record<string, unknown>
  progress: number
  attemptsMade: number
  attemptsMax: number
  failedReason?: string
  stacktrace?: string[]
  returnvalue?: unknown
  timestamp: number
  processedOn?: number
  finishedOn?: number
  delay?: number
  status: string
}

interface JobDetailModalProps {
  job: JobInfo | null
  onClose: () => void
  onRetry?: (jobId: string, queueName: string) => Promise<void>
  onRemove?: (jobId: string, queueName: string) => Promise<void>
  onPromote?: (jobId: string, queueName: string) => Promise<void>
}

export default function JobDetailModal({
  job,
  onClose,
  onRetry,
  onRemove,
  onPromote
}: JobDetailModalProps) {
  const t = useTelamonjsT()
  const { jobLabel } = useQueueLabels()
  const format = useFormat()
  const intlFormat = useFormatter()
  const locale = useLocale()
  const { copied, copy: copyToClipboard, reset: resetCopied } = useCopyToClipboard()
  const [retrying, setRetrying] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Reset copied state when switching jobs
  useEffect(() => {
    resetCopied()
  }, [job?.id, resetCopied])

  if (!job) return null

  const handleRetry = async () => {
    if (!onRetry) return
    setRetrying(true)
    try {
      await onRetry(job.id, job.queueName)
      onClose()
    } finally {
      setRetrying(false)
    }
  }

  const handleRemove = async () => {
    if (!onRemove) return
    setRemoving(true)
    try {
      await onRemove(job.id, job.queueName)
      onClose()
    } finally {
      setRemoving(false)
      setConfirmRemove(false)
    }
  }

  const handlePromote = async () => {
    if (!onPromote) return
    setPromoting(true)
    try {
      await onPromote(job.id, job.queueName)
      onClose()
    } finally {
      setPromoting(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'waiting':
        return {
          icon: <Clock className="h-5 w-5" />,
          label: t('queue.status.waiting'),
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
        }
      case 'active':
        return {
          icon: <Activity className="h-5 w-5 animate-pulse" />,
          label: t('queue.status.active'),
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        }
      case 'completed':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          label: t('queue.status.completed'),
          color: 'text-green-700 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30'
        }
      case 'failed':
        return {
          icon: <XCircle className="h-5 w-5" />,
          label: t('queue.event.failed'),
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30'
        }
      case 'delayed':
        return {
          icon: <Timer className="h-5 w-5" />,
          label: t('queue.status.delayed'),
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30'
        }
      default:
        return {
          icon: <Activity className="h-5 w-5" />,
          label: status,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30'
        }
    }
  }

  const config = getStatusConfig(job.status)

  const formatTimestamp = (ts: number) => {
    return {
      date: format.date(ts, 'short'),
      time: intlFormat.dateTime(new Date(ts), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  }

  // Locale-aware duration formatting (native Intl.NumberFormat) instead of
  // hardcoded ms/s/min suffixes.
  const formatDuration = (start: number, end: number) => {
    const duration = end - start
    if (duration < 1000) {
      return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'millisecond',
        unitDisplay: 'narrow',
      }).format(duration)
    }
    if (duration < 60000) {
      return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'second',
        unitDisplay: 'narrow',
      }).format(Number((duration / 1000).toFixed(2)))
    }
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'minute',
      unitDisplay: 'narrow',
    }).format(Number((duration / 60000).toFixed(2)))
  }

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }

  const created = formatTimestamp(job.timestamp)

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[85vh] bg-background rounded-xl shadow-2xl z-50 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', config.bgColor, config.color)}>
              {config.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{config.label}</h2>
              <p className="text-sm text-muted-foreground">
                {jobLabel(job.queueName)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={t('queue.detail.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                {t('queue.detail.jobId')}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-2 py-1 rounded font-mono truncate">
                  {job.id}
                </code>
                <button
                  onClick={() => copyToClipboard(job.id, 'jobId')}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title={t('queue.detail.copyId')}
                  aria-label={t('queue.detail.copyId')}
                >
                  {copied === 'jobId' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {t('queue.detail.queue')}
              </div>
              <code className="block text-sm bg-muted px-2 py-1 rounded font-mono">
                {job.queueName}
              </code>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('queue.detail.createdAt')}
              </div>
              <div className="text-sm">
                <span className="font-medium">{created.date}</span>
                <span className="text-muted-foreground ml-2">
                  {created.time}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
                {t('queue.detail.attempts')}
              </div>
              <div className="text-sm">
                <span className="font-medium">{job.attemptsMade}</span>
                <span className="text-muted-foreground">
                  {' '}
                  / {job.attemptsMax}
                </span>
              </div>
            </div>

            {job.processedOn && job.finishedOn && (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  {t('queue.detail.duration')}
                </div>
                <div className="text-sm font-medium">
                  {formatDuration(job.processedOn, job.finishedOn)}
                </div>
              </div>
            )}

            {job.progress > 0 && job.progress < 100 && (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  {t('queue.detail.progress')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{job.progress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {job.failedReason && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {t('queue.detail.error')}
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
                <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">
                  {job.failedReason}
                </pre>
              </div>
            </div>
          )}

          {/* Stack Trace */}
          {job.stacktrace && job.stacktrace.length > 0 && (
            <div className="space-y-2">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t('queue.detail.stackTrace')}
                </summary>
                <div className="mt-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
                    {job.stacktrace.join('\n')}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Input Data */}
          {job.data && Object.keys(job.data).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  {t('queue.detail.inputData')}
                </div>
                <button
                  onClick={() => copyToClipboard(renderValue(job.data), 'data')}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title={t('queue.detail.copyData')}
                  aria-label={t('queue.detail.copyData')}
                >
                  {copied === 'data' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {renderValue(job.data)}
                </pre>
              </div>
            </div>
          )}

          {/* Result */}
          {job.returnvalue !== undefined && job.returnvalue !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  {t('queue.detail.result')}
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(renderValue(job.returnvalue), 'result')
                  }
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title={t('queue.detail.copyResult')}
                  aria-label={t('queue.detail.copyResult')}
                >
                  {copied === 'result' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-700 dark:text-green-300 font-mono whitespace-pre-wrap">
                  {renderValue(job.returnvalue)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {job.status === 'delayed' && onPromote && (
              <button
                onClick={handlePromote}
                disabled={promoting || removing}
                data-testid="job-detail-promote"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {promoting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FastForward className="h-4 w-4" />
                )}
                {t('queue.actions.executeNow')}
              </button>
            )}
            {job.status === 'failed' && onRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying || removing}
                data-testid="job-detail-retry"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {retrying ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {t('queue.actions.retry')}
              </button>
            )}
            {job.status === 'failed' &&
              onRemove &&
              (confirmRemove ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {t('queue.detail.confirmDeleteQuestion')}
                  </span>
                  <button
                    onClick={handleRemove}
                    disabled={removing}
                    data-testid="job-detail-remove-confirm"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {removing ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    {t('queue.actions.yes')}
                  </button>
                  <button
                    onClick={() => setConfirmRemove(false)}
                    disabled={removing}
                    data-testid="job-detail-remove-cancel"
                    className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {t('queue.actions.no')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRemove(true)}
                  disabled={retrying}
                  data-testid="job-detail-remove"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('queue.actions.delete')}
                </button>
              ))}
          </div>
          <button
            onClick={onClose}
            data-testid="job-detail-modal-close"
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
          >
            {t('queue.detail.close')}
          </button>
        </div>
      </div>
    </Fragment>
  )
}
