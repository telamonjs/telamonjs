'use client'

/**
 * QueuesTable - Flat accordion queue listing grouped by module
 */

import React, { useState, useMemo } from 'react'
import {
  Play,
  Pause,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Zap,
  Droplets
} from 'lucide-react'
import { cn } from '../../utils/cn'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../../ui/alert-dialog'
import type { QueueHealth, QueueHealthStatus, QueueStats } from '../types'
import DispatchJobModal from './DispatchJobModal'
import JobsListModal from './JobsListModal'
import FailureGroupsModal from './FailureGroupsModal'
import { useQueueLabels } from './labels-context'
import { ModuleIcon, type QueueModuleIcon } from './module-icon'
import { useQueueApi } from '../api/provider'
import { useQueueReadOnly } from './read-only-context'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat, useTickingNow } from '../../i18n/use-format'

type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'

interface QueueJobsFilter {
  status: JobStatus
  queueName: string
  displayName: string
}

interface QueuesTableProps {
  queues: QueueStats[]
  /**
   * Per-queue health (`useQueueHealth`). When present: status dots/badges,
   * "Last success" and "1h" columns, failures in the last hour, next-run
   * tooltip, and retry hidden for `manualRetry: false`. Absent (older
   * adapters, or while loading) → the plain counts table.
   */
  health?: Map<string, QueueHealth>
  onAction?: (action: QueueAction) => Promise<void>
  onRefresh?: () => void
  className?: string
  /** Custom module icons (emoji, node or icon component) for visual differentiation */
  moduleIcons?: Record<string, QueueModuleIcon>
}

export type QueueAction =
  | { type: 'pause'; queueName: string }
  | { type: 'resume'; queueName: string }
  | { type: 'clean'; queueName: string; status: 'completed' | 'failed' }
  | { type: 'retry-all'; queueName: string }
  | { type: 'drain'; queueName: string }

/** Action awaiting confirmation + how many jobs it affects (for the dialog text). */
type PendingAction = { action: QueueAction; count: number }

/** Backend caps for clean/retry-all per call (telamonjs-queue actions.ts). */
const ACTION_LIMIT = 1000

const statusMeta: Record<
  QueueHealthStatus,
  { labelKey: 'statusOk' | 'statusLate' | 'statusFailing' | 'paused'; dot: string; badge: string; rank: number }
> = {
  late: {
    labelKey: 'statusLate',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    rank: 3
  },
  failing: {
    labelKey: 'statusFailing',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    rank: 2
  },
  paused: {
    labelKey: 'paused',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    rank: 1
  },
  ok: { labelKey: 'statusOk', dot: 'bg-green-500', badge: '', rank: 0 }
}

/** "4s ago" / "in 12s" — second granularity: crons may run every 5s. */
function relative(
  t: ReturnType<typeof useTelamonjsT>,
  ts: number | null | undefined,
  now: number
): string {
  if (!ts) return '—'
  const diff = Math.round((now - ts) / 1000)
  const abs = Math.abs(diff)
  const value =
    abs < 60
      ? `${abs}s`
      : abs < 3600
        ? `${Math.floor(abs / 60)}min`
        : abs < 86400
          ? `${Math.floor(abs / 3600)}h`
          : `${Math.floor(abs / 86400)}d`
  return diff >= 0 ? t('queue.queuesTable.ago', { value }) : t('queue.queuesTable.in', { value })
}

/** Title, description and confirm label of each bulk action. */
function confirmTexts(
  t: ReturnType<typeof useTelamonjsT>,
  jobLabel: (name: string) => string,
  { action, count }: PendingAction
) {
  const values = { name: jobLabel(action.queueName), count, limit: ACTION_LIMIT }
  switch (action.type) {
    case 'retry-all':
      return {
        title: t('queue.queuesTable.retryAllTitle'),
        description: t('queue.queuesTable.retryAllDescription', values),
        confirm: t('queue.queuesTable.retryAll')
      }
    case 'clean':
      return action.status === 'failed'
        ? {
            title: t('queue.queuesTable.cleanFailedTitle'),
            description: t('queue.queuesTable.cleanFailedDescription', values),
            confirm: t('queue.queuesTable.clean')
          }
        : {
            title: t('queue.queuesTable.cleanTitle'),
            description: t('queue.queuesTable.cleanDescription', values),
            confirm: t('queue.queuesTable.clean')
          }
    default:
      return {
        title: t('queue.queuesTable.drainTitle'),
        description: t('queue.queuesTable.drainDescription', values),
        confirm: t('queue.queuesTable.drain')
      }
  }
}

const defaultModuleIcons: Record<string, QueueModuleIcon> = {
  gateway: '🔌',
  imports: '📥',
  roteamento: '🗺️',
  operacoes: '⚙️',
  sync: '🔄',
  sms: '💬',
  webhooks: '🔗',
  core: '🏠'
}

export default React.memo(function QueuesTable({
  queues,
  health,
  onAction,
  onRefresh,
  className,
  moduleIcons: moduleIconsProp
}: QueuesTableProps) {
  const t = useTelamonjsT()
  const readOnly = useQueueReadOnly()
  const format = useFormat()
  const now = useTickingNow(5_000).getTime()
  // Grouped failures need the optional adapter method; older adapters keep the plain failed list.
  const api = useQueueApi()
  const hasFailureGroups = 'getFailureGroups' in api
  const icons = moduleIconsProp ?? defaultModuleIcons
  const { jobLabel, moduleLabel, orderModules } = useQueueLabels()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [loadingAction, setLoadingAction] = useState<{
    queue: string
    action: string
  } | null>(null)
  const [selectedQueue, setSelectedQueue] = useState<QueueStats | null>(null)
  const [jobsFilter, setJobsFilter] = useState<QueueJobsFilter | null>(null)
  const [confirmAction, setConfirmAction] = useState<PendingAction | null>(null)
  const [failuresQueue, setFailuresQueue] = useState<string | null>(null)

  const groupedQueues = useMemo(() => {
    const grouped = (queues || []).reduce(
      (acc, queue) => {
        const queueModule = queue.module || 'other'
        if (!acc[queueModule]) acc[queueModule] = []
        acc[queueModule].push(queue)
        return acc
      },
      {} as Record<string, QueueStats[]>
    )
    // Same group order as the Configuration tab
    return orderModules(Object.keys(grouped)).map(m => [m, grouped[m]] as const)
  }, [queues, orderModules])

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(module)) {
      newExpanded.delete(module)
    } else {
      newExpanded.add(module)
    }
    setExpandedModules(newExpanded)
  }

  const handleAction = async (action: QueueAction, count = 0) => {
    if (!onAction) return

    // Bulk actions (everything but pause/resume) go through the confirm dialog
    if (action.type !== 'pause' && action.type !== 'resume') {
      setConfirmAction({ action, count })
      return
    }

    await executeAction(action)
  }

  const executeAction = async (action: QueueAction) => {
    if (!onAction) return

    setLoadingAction({ queue: action.queueName, action: action.type })
    try {
      await onAction(action)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleConfirm = async () => {
    if (!confirmAction) return
    const { action } = confirmAction
    setConfirmAction(null)
    await executeAction(action)
  }

  const getModuleStats = (moduleQueues: QueueStats[]) => {
    return {
      active: moduleQueues.reduce((sum, q) => sum + q.active, 0),
      waiting: moduleQueues.reduce((sum, q) => sum + q.waiting, 0),
      failed: moduleQueues.reduce((sum, q) => sum + q.failed, 0),
      dispatchable: moduleQueues.filter((q) => q.dispatchable).length,
      // Worst status of the module — visible with the accordion closed
      worst: moduleQueues
        .map((q) => health?.get(q.name)?.status ?? 'ok')
        .reduce<QueueHealthStatus>(
          (w, st) => (statusMeta[st].rank > statusMeta[w].rank ? st : w),
          'ok'
        )
    }
  }

  return (
    <>
      <div className={cn('divide-y', className)}>
        {groupedQueues.map(([module, moduleQueues]) => {
          const isExpanded = expandedModules.has(module)
          const stats = getModuleStats(moduleQueues)
          const moduleIcon = icons[module] || '📦'
          const label = moduleLabel(module)

          return (
            <div key={module}>
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module)}
                data-testid={`queue-module-toggle-${module}`}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {health && (
                    <span
                      data-testid={`queue-module-status-${module}`}
                      className={cn('h-2 w-2 rounded-full shrink-0', statusMeta[stats.worst].dot)}
                      title={t(`queue.queuesTable.${statusMeta[stats.worst].labelKey}`)}
                    />
                  )}
                  <span className="text-sm">
                    <ModuleIcon icon={moduleIcon} className="h-3.5 w-3.5" />
                  </span>
                  <span className={cn('font-medium text-sm', !label && 'capitalize')}>
                    {label ?? module}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {moduleQueues.length}
                  </span>
                  {stats.dispatchable > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 ml-1">
                      <Zap className="h-3 w-3" />
                      {format.number(stats.dispatchable)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {stats.active > 0 && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {format.number(stats.active)}
                    </span>
                  )}
                  {stats.waiting > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {format.number(stats.waiting)} {t('queue.queuesTable.columnWaiting').toLowerCase()}
                    </span>
                  )}
                  {stats.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {format.number(stats.failed)}
                    </span>
                  )}
                </div>
              </button>

              {/* Queue Items */}
              {isExpanded && (
                <div className="border-t bg-muted/10 overflow-x-auto">
                  {/* Fixed layout + fixed column widths: every group's columns line up */}
                  <table className={cn('w-full table-fixed text-sm', health ? 'min-w-[44rem]' : 'min-w-[36rem]')}>
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left px-4 py-1.5 font-medium">
                          {t('queue.queuesTable.columnQueue')}
                        </th>
                        {health && (
                          <>
                            <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap w-24">
                              {t('queue.queuesTable.columnLastSuccess')}
                            </th>
                            <th className="text-center px-2 py-1.5 font-medium w-12">
                              {t('queue.queuesTable.columnLastHour')}
                            </th>
                          </>
                        )}
                        <th className="text-center px-2 py-1.5 font-medium w-14">
                          {t('queue.queuesTable.columnWaiting')}
                        </th>
                        <th className="text-center px-2 py-1.5 font-medium w-14">
                          {t('queue.queuesTable.columnActive')}
                        </th>
                        <th className="text-center px-2 py-1.5 font-medium w-14">
                          {t('queue.queuesTable.columnCompleted')}
                        </th>
                        <th className="text-center px-2 py-1.5 font-medium w-14">
                          {t('queue.queuesTable.columnFailed')}
                        </th>
                        <th className="text-center px-2 py-1.5 font-medium w-14">
                          {t('queue.queuesTable.columnDelayed')}
                        </th>
                        <th className="text-right px-3 py-1.5 font-medium w-40">
                          {t('queue.queuesTable.columnActions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {moduleQueues.map((queue) => {
                        const h = health?.get(queue.name)
                        const meta = statusMeta[h?.status ?? 'ok']
                        return (
                        <tr
                          key={queue.name}
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            queue.paused && 'opacity-50'
                          )}
                        >
                          <td className="px-4 py-1.5">
                            <button
                              onClick={() => setSelectedQueue(queue)}
                              data-testid={`queue-detail-${queue.name}`}
                              className="text-left group max-w-full"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {h && (
                                  <span
                                    data-testid={`queue-status-${queue.name}`}
                                    className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)}
                                  />
                                )}
                                <span className="font-medium text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {jobLabel(queue.name, queue.displayName)}
                                </span>
                                {queue.dispatchable && (
                                  <span title={t('queue.queuesTable.executableManually')}>
                                    <Zap className="h-3 w-3 text-blue-500" />
                                  </span>
                                )}
                                {queue.paused && (
                                  <span className="px-1 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                    {t('queue.queuesTable.paused')}
                                  </span>
                                )}
                                {(h?.status === 'late' || h?.status === 'failing') && (
                                  <span className={cn('px-1 py-0.5 rounded text-[10px]', meta.badge)}>
                                    {t(`queue.queuesTable.${meta.labelKey}`)}
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>
                          {health && (
                            <>
                              <td
                                className={cn(
                                  'px-2 py-1.5 text-xs whitespace-nowrap',
                                  h?.status === 'late'
                                    ? 'text-red-600 dark:text-red-400 font-medium'
                                    : 'text-muted-foreground'
                                )}
                                title={
                                  h?.nextRunAt
                                    ? h.schedule
                                      ? t('queue.queuesTable.nextRunSchedule', {
                                          date: format.dateTime(h.nextRunAt),
                                          schedule: h.schedule
                                        })
                                      : t('queue.queuesTable.nextRun', { date: format.dateTime(h.nextRunAt) })
                                    : t('queue.queuesTable.noSchedule')
                                }
                              >
                                {relative(t, h?.lastCompletedAt, now)}
                              </td>
                              <td
                                className="text-center px-2 py-1.5 text-xs text-green-700 dark:text-green-400"
                                title={t('queue.queuesTable.completedLastHour')}
                              >
                                {h ? format.number(h.completedLastHour) : '—'}
                              </td>
                            </>
                          )}
                          <td className="text-center px-2 py-1.5">
                            <button
                              onClick={() =>
                                queue.waiting > 0 &&
                                setJobsFilter({
                                  status: 'waiting',
                                  queueName: queue.name,
                                  displayName: jobLabel(queue.name, queue.displayName)
                                })
                              }
                              disabled={queue.waiting === 0}
                              aria-label={t('queue.queuesTable.viewWaiting', { name: queue.name })}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs transition-colors',
                                queue.waiting > 0 &&
                                  'text-yellow-600 dark:text-yellow-400 font-medium hover:bg-yellow-100 dark:hover:bg-yellow-900/30 cursor-pointer',
                                queue.waiting === 0 && 'cursor-default'
                              )}
                            >
                              {format.number(queue.waiting)}
                            </button>
                          </td>
                          <td className="text-center px-2 py-1.5">
                            <button
                              onClick={() =>
                                queue.active > 0 &&
                                setJobsFilter({
                                  status: 'active',
                                  queueName: queue.name,
                                  displayName: jobLabel(queue.name, queue.displayName)
                                })
                              }
                              disabled={queue.active === 0}
                              aria-label={t('queue.queuesTable.viewActive', { name: queue.name })}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs transition-colors',
                                queue.active > 0 &&
                                  'text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer',
                                queue.active === 0 && 'cursor-default'
                              )}
                            >
                              {format.number(queue.active)}
                            </button>
                          </td>
                          <td className="text-center px-2 py-1.5">
                            <button
                              onClick={() =>
                                queue.completed > 0 &&
                                setJobsFilter({
                                  status: 'completed',
                                  queueName: queue.name,
                                  displayName: jobLabel(queue.name, queue.displayName)
                                })
                              }
                              disabled={queue.completed === 0}
                              aria-label={t('queue.queuesTable.viewCompleted', { name: queue.name })}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs transition-colors',
                                queue.completed > 0 &&
                                  'text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer',
                                queue.completed === 0 && 'cursor-default'
                              )}
                            >
                              {format.number(queue.completed)}
                            </button>
                          </td>
                          <td className="text-center px-2 py-1.5">
                            <button
                              onClick={() => {
                                if (queue.failed === 0) return
                                if (hasFailureGroups) {
                                  setFailuresQueue(queue.name)
                                  return
                                }
                                setJobsFilter({
                                  status: 'failed',
                                  queueName: queue.name,
                                  displayName: jobLabel(queue.name, queue.displayName)
                                })
                              }}
                              disabled={queue.failed === 0}
                              aria-label={
                                hasFailureGroups
                                  ? t('queue.queuesTable.viewFailureGroups', { name: queue.name })
                                  : t('queue.queuesTable.viewFailed', { name: queue.name })
                              }
                              title={
                                h
                                  ? h.failedLastHour
                                    ? t('queue.queuesTable.failedLastHour', { count: h.failedLastHour })
                                    : t('queue.queuesTable.failedRetained')
                                  : undefined
                              }
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs transition-colors',
                                queue.failed > 0 &&
                                  'text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer',
                                queue.failed === 0 && 'cursor-default'
                              )}
                            >
                              {format.number(queue.failed)}
                              {!!h?.failedLastHour && (
                                <sup className="ml-0.5 text-[9px]">+{format.number(h.failedLastHour)}</sup>
                              )}
                            </button>
                          </td>
                          <td className="text-center px-2 py-1.5">
                            <button
                              onClick={() =>
                                queue.delayed > 0 &&
                                setJobsFilter({
                                  status: 'delayed',
                                  queueName: queue.name,
                                  displayName: jobLabel(queue.name, queue.displayName)
                                })
                              }
                              disabled={queue.delayed === 0}
                              aria-label={t('queue.queuesTable.viewDelayed', { name: queue.name })}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs transition-colors',
                                queue.delayed > 0 &&
                                  'text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 cursor-pointer',
                                queue.delayed === 0 &&
                                  'text-muted-foreground cursor-default'
                              )}
                            >
                              {format.number(queue.delayed)}
                            </button>
                          </td>
                          <td className="text-right px-3 py-1.5">
                            {!readOnly && (
                            <div className="flex items-center justify-end gap-0.5">
                              {queue.dispatchable && (
                                <button
                                  onClick={() => setSelectedQueue(queue)}
                                  className="p-1 rounded-md hover:bg-muted transition-colors"
                                  title={t('queue.queuesTable.dispatchManually')}
                                  aria-label={t('queue.queuesTable.dispatchManuallyIn', { name: queue.name })}
                                >
                                  <Play className="h-3.5 w-3.5 text-blue-600" />
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  handleAction({
                                    type: queue.paused ? 'resume' : 'pause',
                                    queueName: queue.name
                                  })
                                }
                                disabled={loadingAction?.queue === queue.name}
                                className={cn(
                                  'p-1 rounded-md hover:bg-muted transition-colors',
                                  loadingAction?.queue === queue.name &&
                                    loadingAction.action ===
                                      (queue.paused ? 'resume' : 'pause') &&
                                    'opacity-50'
                                )}
                                title={
                                  queue.paused ? t('queue.queuesTable.resumeQueue') : t('queue.queuesTable.pauseQueue')
                                }
                                aria-label={
                                  queue.paused
                                    ? t('queue.queuesTable.resumeQueueName', { name: queue.name })
                                    : t('queue.queuesTable.pauseQueueName', { name: queue.name })
                                }
                              >
                                {queue.paused ? (
                                  <Play className="h-3.5 w-3.5 text-green-700" />
                                ) : (
                                  <Pause className="h-3.5 w-3.5 text-yellow-600" />
                                )}
                              </button>

                              {queue.failed > 0 && h?.manualRetry !== false && (
                                <button
                                  onClick={() =>
                                    handleAction(
                                      { type: 'retry-all', queueName: queue.name },
                                      queue.failed
                                    )
                                  }
                                  disabled={loadingAction?.queue === queue.name}
                                  className="p-1 rounded-md hover:bg-muted transition-colors"
                                  title={t('queue.queuesTable.retryFailed')}
                                  aria-label={t('queue.queuesTable.retryFailedName', { name: queue.name })}
                                >
                                  <RefreshCw
                                    className={cn(
                                      'h-3.5 w-3.5 text-orange-600',
                                      loadingAction?.queue === queue.name &&
                                        loadingAction.action === 'retry-all' &&
                                        'animate-spin'
                                    )}
                                  />
                                </button>
                              )}

                              {queue.completed > 100 && (
                                <button
                                  onClick={() =>
                                    handleAction(
                                      {
                                        type: 'clean',
                                        queueName: queue.name,
                                        status: 'completed'
                                      },
                                      queue.completed
                                    )
                                  }
                                  disabled={loadingAction?.queue === queue.name}
                                  className="p-1 rounded-md hover:bg-muted transition-colors"
                                  title={t('queue.queuesTable.cleanCompleted')}
                                  aria-label={t('queue.queuesTable.cleanCompletedName', { name: queue.name })}
                                >
                                  <Trash2
                                    className={cn(
                                      'h-3.5 w-3.5 text-muted-foreground',
                                      loadingAction?.queue === queue.name &&
                                        loadingAction.action === 'clean' &&
                                        'opacity-50'
                                    )}
                                  />
                                </button>
                              )}

                              {queue.failed > 0 && (
                                <button
                                  onClick={() =>
                                    handleAction(
                                      {
                                        type: 'clean',
                                        queueName: queue.name,
                                        status: 'failed'
                                      },
                                      queue.failed
                                    )
                                  }
                                  disabled={loadingAction?.queue === queue.name}
                                  className="p-1 rounded-md hover:bg-muted transition-colors"
                                  title={t('queue.queuesTable.cleanFailed')}
                                  aria-label={t('queue.queuesTable.cleanFailedName', { name: queue.name })}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </button>
                              )}

                              {queue.waiting > 0 && (
                                <button
                                  onClick={() =>
                                    handleAction(
                                      { type: 'drain', queueName: queue.name },
                                      queue.waiting
                                    )
                                  }
                                  disabled={loadingAction?.queue === queue.name}
                                  className="p-1 rounded-md hover:bg-muted transition-colors"
                                  title={t('queue.queuesTable.drainQueue')}
                                  aria-label={t('queue.queuesTable.drainQueueName', { name: queue.name })}
                                >
                                  <Droplets
                                    className={cn(
                                      'h-3.5 w-3.5 text-red-500',
                                      loadingAction?.queue === queue.name &&
                                        loadingAction.action === 'drain' &&
                                        'opacity-50'
                                    )}
                                  />
                                </button>
                              )}
                            </div>
                            )}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dispatch Modal */}
      <DispatchJobModal
        job={selectedQueue}
        onClose={() => setSelectedQueue(null)}
        onSuccess={onRefresh}
      />

      {/* Jobs List Modal */}
      <JobsListModal
        status={jobsFilter?.status ?? null}
        queueName={jobsFilter?.queueName}
        queueDisplayName={jobsFilter?.displayName}
        manualRetry={jobsFilter ? health?.get(jobsFilter.queueName)?.manualRetry : undefined}
        onClose={() => setJobsFilter(null)}
      />

      {/* Failures grouped by cause (adapter with getFailureGroups) */}
      <FailureGroupsModal
        queueName={failuresQueue}
        onClose={() => setFailuresQueue(null)}
      />

      {/* Confirm Dialog for destructive actions */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open: boolean) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          {confirmAction && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmTexts(t, jobLabel, confirmAction).title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmTexts(t, jobLabel, confirmAction).description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirm}
                  className={
                    confirmAction.action.type === 'retry-all'
                      ? undefined
                      : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  }
                >
                  {confirmTexts(t, jobLabel, confirmAction).confirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
