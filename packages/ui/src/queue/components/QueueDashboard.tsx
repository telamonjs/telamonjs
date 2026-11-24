'use client'

/**
 * QueueDashboard - Main dashboard client component
 *
 * Integrates all dashboard components with real-time updates.
 */

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { useQueueStats, useQueueAction } from '../hooks'
import JobStatsCards from './JobStatsCards'
import JobEventTimeline from './JobEventTimeline'
import QueuesTable, { type QueueAction } from './QueuesTable'
import JobsHistoryModal from './JobsHistoryModal'
import DashboardHeader from './DashboardHeader'
import RedisMetrics from './RedisMetrics'
import { useTelamonjsT } from '../../i18n/use-t'
import { actionDoneMessage } from '../lib/action-message'
import { useQueueLabels } from './labels-context'

interface QueueDashboardProps {
  /** Polling interval in milliseconds (default: 10000) */
  pollInterval?: number
  /** Show header with history button */
  showHeader?: boolean
  /** Settings link href (optional) */
  settingsHref?: string
}

export default function QueueDashboard({
  pollInterval = 10000,
  showHeader = false,
  settingsHref,
}: QueueDashboardProps) {
  const t = useTelamonjsT()
  const { jobLabel } = useQueueLabels()
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  // React Query hooks - substitui manual polling
  const { data: stats, isLoading, refetch } = useQueueStats(pollInterval)
  const queueActionMutation = useQueueAction()

  const handleQueueAction = async (action: QueueAction) => {
    try {
      const result = await queueActionMutation.mutateAsync(action)

      if (result.success) {
        toast.success(actionDoneMessage(t, action, result, jobLabel(action.queueName)))
      } else {
        toast.error(result.message || t('queue.dashboard.actionFailed'))
      }
    } catch (err) {
      toast.error(t('queue.dashboard.actionError'))
      logger.error('Action error', {
        error: err instanceof Error ? err : String(err),
      })
    }
  }

  if (isLoading || !stats) {
    return (
      <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
        <div className='rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-4 mb-4'>
          <RefreshCw className='h-8 w-8 text-yellow-600 dark:text-yellow-400 animate-spin' />
        </div>
        <h3 className='text-lg font-semibold text-foreground mb-2'>
          {isLoading
            ? t('queue.dashboard.loading')
            : t('queue.dashboard.redisDisconnected')}
        </h3>
        <p className='text-sm text-center max-w-md'>
          {isLoading ? (
            t('queue.dashboard.fetchingStats')
          ) : (
            <>
              {t('queue.dashboard.configureRedisPrefix')}{' '}
              <code className='px-1.5 py-0.5 bg-muted rounded text-xs'>
                REDIS_URL
              </code>{' '}
              {t('queue.dashboard.configureRedisMiddle')}{' '}
              <code className='px-1.5 py-0.5 bg-muted rounded text-xs'>
                .env
              </code>{' '}
              {t('queue.dashboard.configureRedisSuffix')}
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Header with History button */}
      {showHeader && (
        <DashboardHeader
          onOpenHistory={() => setHistoryModalOpen(true)}
          settingsHref={settingsHref}
        />
      )}

      <div className='space-y-6'>
        {/* Stats Cards */}
        <JobStatsCards stats={stats} />

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
          {/* Queues Table - 60% */}
          <div className='lg:col-span-3'>
            <QueuesTable
              queues={stats.queues}
              onAction={handleQueueAction}
              onRefresh={() => refetch()}
            />
          </div>

          {/* Right Column - 40% */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Redis Metrics */}
            <RedisMetrics />

            {/* Event Timeline */}
            <JobEventTimeline />
          </div>
        </div>
      </div>

      {/* History Modal */}
      <JobsHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </>
  )
}
