'use client'

/**
 * Shared job-history types, status/filter config, and formatting helpers —
 * INTERNAL to queue/components, not exported from the package barrel.
 *
 * Extracted from JobsHistoryModal.tsx (Fase A2 decomposition), then merged
 * with HistoricoTab.tsx's near-duplicate copy (Fase A3). Consumed by the
 * `jobs-history-modal/` sub-components AND `tabs/historico/`.
 *
 * Two intentional divergences kept separate rather than collapsed:
 * - Labels: `statusConfig.label` is PLURAL (JobsHistoryModal summarizes many
 *   jobs at once: "Concluídos", "Falhas", "Agendados"). HistoricoTab needs
 *   SINGULAR per-row/detail labels ("Concluído", "Falha", "Agendado") —
 *   exported separately as `historicoStatusLabels`, override the `label`
 *   field with it where the singular form is needed.
 * - filterOptions[].icon: optional — only HistoricoTab's toolbar renders it
 *   (pill icon); JobsHistoryModal's fullscreen toolbar ignores it.
 *
 * `queue/types.ts` also had a `statusConfigs` const (zero consumers, not
 * exported from `queue/index.ts`) duplicating this file's borderColor
 * values — deleted in A3. Its sibling `StatusConfig` *type* IS exported
 * from `queue/index.ts` (public API of the `/queue` subpath) and was left
 * alone — removing it would be a breaking change requiring a breaking-change review.
 */

import type { ReactNode } from 'react'
import type { JobState, JobInfo } from '../types'
import { CheckCircle, XCircle, Clock, Activity, Timer, History } from 'lucide-react'
import type { useTelamonjsT } from '../../i18n/use-t'

export type { JobInfo }
export type JobStatus = JobState
export type FilterStatus = 'all' | 'completed' | 'failed'

type T = ReturnType<typeof useTelamonjsT>

/** Page size for the history query — shared so the orchestrator's
 * URLSearchParams and the fullscreen modal's pagination arithmetic can't
 * drift apart. */
export const HISTORY_PAGE_SIZE = 50

/** Neutral look for disabled/inactive badges (the theme's `secondary` is blue). */
export const INACTIVE_BADGE = 'bg-muted text-muted-foreground'

/** Status → icon/label/color config. Takes `t` (from `useTelamonjsT()`) since
 * it's consumed by function components that can call hooks — module-level
 * plain functions receive `t` explicitly instead. */
export function getStatusConfig(
  t: T
): Record<
  JobStatus,
  {
    icon: ReactNode
    label: string
    color: string
    bgColor: string
    borderColor: string
  }
> {
  return {
    waiting: {
      icon: <Clock className='h-4 w-4' />,
      label: t('queue.status.waiting'),
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-300 dark:border-yellow-700',
    },
    active: {
      icon: <Activity className='h-4 w-4' />,
      label: t('queue.status.active'),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-300 dark:border-blue-700',
    },
    completed: {
      icon: <CheckCircle className='h-4 w-4' />,
      label: t('queue.statusPlural.completed'),
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-300 dark:border-green-700',
    },
    failed: {
      icon: <XCircle className='h-4 w-4' />,
      label: t('queue.statusPlural.failed'),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-300 dark:border-red-700',
    },
    delayed: {
      icon: <Timer className='h-4 w-4' />,
      label: t('queue.statusPlural.delayed'),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      borderColor: 'border-purple-300 dark:border-purple-700',
    },
  }
}

/** Singular labels for per-row/detail UI (HistoricoTab). `getStatusConfig().label`
 * above is plural (used by JobsHistoryModal, which summarizes many jobs). */
export function getHistoricoStatusLabels(t: T): Record<JobStatus, string> {
  return {
    waiting: t('queue.status.waiting'),
    active: t('queue.status.active'),
    completed: t('queue.status.completed'),
    failed: t('queue.status.failed'),
    delayed: t('queue.status.delayed'),
  }
}

export function getFilterOptions(t: T): {
  value: FilterStatus
  label: string
  /** Optional pill icon — only HistoricoTab's toolbar renders it. */
  icon?: ReactNode
  statuses: string[]
}[] {
  return [
    {
      value: 'all',
      label: t('queue.statusPlural.all'),
      icon: <History className='h-3.5 w-3.5' />,
      statuses: ['completed', 'failed'],
    },
    {
      value: 'completed',
      label: t('queue.statusPlural.completed'),
      icon: <CheckCircle className='h-3.5 w-3.5' />,
      statuses: ['completed'],
    },
    {
      value: 'failed',
      label: t('queue.statusPlural.failed'),
      icon: <XCircle className='h-3.5 w-3.5' />,
      statuses: ['failed'],
    },
  ]
}

export interface FormatDurationDigits {
  /** Decimal digits for the seconds branch (1s–59s duration). Default: 2. */
  seconds?: number
  /** Decimal digits for the minutes branch (60s+ duration). Default: 2. */
  minutes?: number
}

/**
 * Formats a job duration using the caller's locale (native `Intl.NumberFormat`,
 * `unitDisplay: 'narrow'`) instead of hardcoded `ms`/`s`/`min` suffixes.
 * This is a plain (non-hook) function, so it can't call `useLocale()` itself —
 * pass the caller component's locale in.
 *
 * `digits` overrides the seconds/minutes rounding (default 2 decimals each) —
 * e.g. `JobEventTimeline`'s timeline rows use `{ seconds: 1, minutes: 0 }`.
 */
export function formatDuration(
  start: number,
  end: number,
  locale: string,
  { seconds: secondsDigits = 2, minutes: minutesDigits = 2 }: FormatDurationDigits = {}
): string {
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
    }).format(Number((duration / 1000).toFixed(secondsDigits)))
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'narrow',
  }).format(Number((duration / 60000).toFixed(minutesDigits)))
}

export function truncateId(id: string, maxLength = 12): string {
  if (id.length <= maxLength) return id
  return `${id.slice(0, maxLength)}…`
}

export function renderValue(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}
