'use client'

/**
 * JobEventModal - Modal showing full event details
 */

import { Fragment, useEffect } from 'react'
import {
  X,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Activity,
  Clock,
  Hash,
  FileText,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react'
import { useFormatter } from 'next-intl'
import { cn } from '../../utils/cn'
import { useCopyToClipboard } from '../hooks'
import { formatQueueName as formatJobName } from '../lib/format'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'
import type { JobEvent } from './types'

interface JobEventModalProps {
  event: JobEvent | null
  onClose: () => void
}

export default function JobEventModal({ event, onClose }: JobEventModalProps) {
  const t = useTelamonjsT()
  const format = useFormat()
  const intlFormat = useFormatter()
  const { copied, copy: copyToClipboard, reset: resetCopied } = useCopyToClipboard()

  // Reset copied state when switching events
  useEffect(() => {
    resetCopied()
  }, [event?.jobId, event?.timestamp, resetCopied])

  if (!event) return null

  const getEventConfig = (type: JobEvent['type']) => {
    switch (type) {
      case 'job:started':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          label: t('queue.event.started'),
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        }
      case 'job:progress':
        return {
          icon: <RefreshCw className="h-5 w-5" />,
          label: t('queue.event.progress'),
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
        }
      case 'job:completed':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          label: t('queue.event.completed'),
          color: 'text-green-700 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30'
        }
      case 'job:failed':
        return {
          icon: <XCircle className="h-5 w-5" />,
          label: t('queue.event.failed'),
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30'
        }
      case 'job:retrying':
        return {
          icon: <RefreshCw className="h-5 w-5" />,
          label: t('queue.event.retrying'),
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30'
        }
      default:
        return {
          icon: <Activity className="h-5 w-5" />,
          label: t('queue.event.generic'),
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30'
        }
    }
  }

  const config = getEventConfig(event.type)

  const formatTimestamp = (timestamp: string) => {
    return {
      date: format.date(timestamp, 'short'),
      time: intlFormat.dateTime(new Date(timestamp), {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      })
    }
  }

  const timestamp = formatTimestamp(event.timestamp)

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }

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
                {formatJobName(event.jobName)}
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
                  {event.jobId}
                </code>
                <button
                  onClick={() => copyToClipboard(event.jobId, 'jobId')}
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
                {event.jobName}
              </code>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('queue.event.dataHeading')}
              </div>
              <div className="text-sm">
                <span className="font-medium">{timestamp.date}</span>
                <span className="text-muted-foreground ml-2">
                  {timestamp.time}
                </span>
              </div>
            </div>

            {event.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  {t('queue.detail.progress')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${event.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{event.progress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {event.error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {t('queue.detail.error')}
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
                <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">
                  {event.error}
                </pre>
              </div>
            </div>
          )}

          {/* Input Data */}
          {event.data !== undefined && event.data !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  {t('queue.detail.inputData')}
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(renderValue(event.data), 'data')
                  }
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
                  {renderValue(event.data)}
                </pre>
              </div>
            </div>
          )}

          {/* Result */}
          {event.result !== undefined && event.result !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  {t('queue.detail.result')}
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(renderValue(event.result), 'result')
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
                  {renderValue(event.result)}
                </pre>
              </div>
            </div>
          )}

          {/* Raw Event */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                {t('queue.detail.rawEvent')}
              </div>
              <button
                onClick={() =>
                  copyToClipboard(JSON.stringify(event, null, 2), 'raw')
                }
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title={t('queue.detail.copyFullJson')}
                aria-label={t('queue.detail.copyFullJson')}
              >
                {copied === 'raw' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('queue.detail.expandToView')}
              </summary>
              <div className="mt-2 bg-muted rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <button
            onClick={onClose}
            data-testid="job-event-modal-close"
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
          >
            {t('queue.detail.close')}
          </button>
        </div>
      </div>
    </Fragment>
  )
}
