'use client'

/**
 * DashboardHeader - Header controls for Jobs Dashboard
 *
 * Uses React Query's dataUpdatedAt for last update timestamp.
 */

import { useCallback, useEffect } from 'react'
import { useFormatter } from 'next-intl'
import { RefreshCw, Settings, History } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useQueueStats } from '../hooks'
import { useTelamonjsT } from '../../i18n/use-t'

interface DashboardHeaderProps {
  onOpenHistory?: () => void
  settingsHref?: string
}

export default function DashboardHeader({
  onOpenHistory,
  settingsHref
}: DashboardHeaderProps) {
  const t = useTelamonjsT()
  const intlFormat = useFormatter()
  // Use React Query hook with auto-polling (10s when enabled)
  const {
    data: stats,
    dataUpdatedAt,
    isLoading,
    isRefetching,
    refetch
  } = useQueueStats(10_000)

  // Dispatch custom event when stats update (for other components)
  useEffect(() => {
    if (stats) {
      window.dispatchEvent(
        new CustomEvent('queue-stats-updated', { detail: stats })
      )
    }
  }, [stats])

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const formatLastUpdate = (timestamp: number) => {
    if (!timestamp) return '--:--:--'
    return intlFormat.dateTime(new Date(timestamp), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{t('queue.dashboard.header.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('queue.dashboard.header.subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh group */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1.5">
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className={cn(
              'p-1.5 rounded-md hover:bg-background transition-colors',
              isRefetching && 'opacity-50'
            )}
            title={t('queue.dashboard.header.refresh')}
            aria-label={t('queue.dashboard.header.refresh')}
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground',
                (isLoading || isRefetching) && 'animate-spin'
              )}
            />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums min-w-[52px]">
            {formatLastUpdate(dataUpdatedAt)}
          </span>
        </div>

        {/* History Button */}
        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            data-testid="queue-open-history"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            {t('queue.dashboard.header.history')}
          </button>
        )}

        {/* Settings Link */}
        {settingsHref && (
          <a
            href={settingsHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {t('queue.dashboard.header.settings')}
          </a>
        )}
      </div>
    </div>
  )
}
