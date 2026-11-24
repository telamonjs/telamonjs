'use client'

import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LIB_QUERY_META } from '../../utils/query-meta'
import { useQueueApi } from '../api/provider'
import type { DashboardStats } from '../types'
import { QueueLabelsContext, type QueueLabels } from './labels-context'

/** Job name → contract display name and description, as served by the stats endpoint. */
const toContractTexts = (stats: DashboardStats) => ({
  displayNames: Object.fromEntries(stats.queues.map(q => [q.name, q.displayName])),
  descriptions: Object.fromEntries(stats.queues.map(q => [q.name, q.description])),
})

/**
 * Provides `moduleLabels`/`jobLabel` plus the contracts' display names and
 * descriptions. Same key as `useQueueStats`: it reads the Real-time tab's
 * cache, fetches once when nothing cached it yet, and never polls on its own.
 * Needs a `QueueApiProvider` above it.
 */
export function QueueLabelsProvider({
  moduleLabels,
  jobLabel,
  children,
}: Pick<QueueLabels, 'moduleLabels' | 'jobLabel'> & { children: ReactNode }) {
  const api = useQueueApi()
  const { data } = useQuery({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'stats'],
    queryFn: () => api.getStats(),
    select: toContractTexts,
    staleTime: Infinity,
  })
  const value = useMemo(
    () => ({ moduleLabels, jobLabel, ...data }),
    [moduleLabels, jobLabel, data]
  )
  return <QueueLabelsContext.Provider value={value}>{children}</QueueLabelsContext.Provider>
}
