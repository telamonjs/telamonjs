'use client'

import { createContext, useContext, useMemo } from 'react'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import { formatQueueName } from '../lib/format'

/**
 * Presentation labels set on `QueueTabbedDashboard` (`moduleLabels`,
 * `jobLabel`) plus the job contracts' display names, read from the stats
 * query by the dashboard. Module keys and job names are Redis keys (no
 * accents, no spaces); these let the UI show real names instead.
 * @internal not exported — the public switches are the dashboard props.
 */
export interface QueueLabels {
  /** Module key → group title. Its key order is also the group order. */
  moduleLabels?: Record<string, I18nText>
  /** Job name → label; `undefined` falls back to the display name. */
  jobLabel?: (jobName: string) => I18nText | undefined
  /** Job name → the contract's `displayName`, as served by the stats endpoint. */
  displayNames?: Readonly<Record<string, string>>
  /** Job name → the contract's `description`, as served by the stats endpoint. */
  descriptions?: Readonly<Record<string, string>>
}

export const QueueLabelsContext = createContext<QueueLabels>({})

export interface QueueLabelResolvers {
  /**
   * The one job-name precedence of the dashboard: the app's `jobLabel` →
   * the contract's `displayName` (which the API derives as contract `label`
   * → `description` → raw name) → `formatQueueName`.
   */
  jobLabel: (jobName: string, displayName?: string) => string
  /** The contract's `description`, or `undefined` when it has none. */
  jobDescription: (jobName: string) => string | undefined
  /** The `moduleLabels` entry, or `undefined` (render the raw key). */
  moduleLabel: (module: string) => string | undefined
  /** `moduleLabels` key order first, then alphabetical by label. */
  orderModules: (modules: string[]) => string[]
}

/**
 * Label resolvers for the queue dashboard. Outside `QueueTabbedDashboard`
 * (standalone components, tests) every lookup falls back to the raw key /
 * `formatQueueName`.
 */
export function useQueueLabels(): QueueLabelResolvers {
  const { moduleLabels, jobLabel, displayNames, descriptions } = useContext(QueueLabelsContext)
  const text = useText()

  return useMemo(() => {
    const moduleLabel = (module: string) => text(moduleLabels?.[module])
    const rank = new Map(Object.keys(moduleLabels ?? {}).map((m, i) => [m, i]))
    const sortKey = (m: string) => moduleLabel(m) ?? m
    return {
      jobLabel: (jobName, displayName) => {
        const contract = displayName ?? displayNames?.[jobName]
        return (
          text(jobLabel?.(jobName)) ??
          // The backend serves the raw name when the contract has none
          (contract && contract !== jobName ? contract : formatQueueName(jobName))
        )
      },
      jobDescription: jobName => descriptions?.[jobName] || undefined,
      moduleLabel,
      orderModules: modules =>
        [...modules].sort(
          (a, b) =>
            // Infinity - Infinity is NaN (falsy) → both unranked: compare labels
            (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) ||
            sortKey(a).localeCompare(sortKey(b))
        ),
    }
  }, [moduleLabels, jobLabel, displayNames, descriptions, text])
}
