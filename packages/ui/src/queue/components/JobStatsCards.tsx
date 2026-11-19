'use client'

/**
 * JobStatsCards - Queue statistics using telamonjs StatCard (accent variant)
 * Click on any card to see the list of jobs with that status.
 */

import { useState } from 'react'
import { Clock, Activity, CheckCircle, XCircle, Timer } from 'lucide-react'
import { StatCard } from '../../components/cards/stat-card'
import { StatsGrid } from '../../components/cards/stats-grid'
import type { DashboardStats } from '../types'
import JobsListModal from './JobsListModal'
import { useTelamonjsT } from '../../i18n/use-t'

type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'

interface JobStatsCardsProps {
  stats: DashboardStats
  className?: string
}

export default function JobStatsCards({
  stats,
  className
}: JobStatsCardsProps) {
  const t = useTelamonjsT()
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | null>(null)

  return (
    <>
      <StatsGrid columns={5} gap="sm" className={className}>
        <StatCard
          label={t('queue.stats.waiting')}
          value={stats.totalWaiting}
          icon={Clock}
          color="yellow"
          variant="accent"
          onClick={() => setSelectedStatus('waiting')}
        />
        <StatCard
          label={t('queue.stats.active')}
          value={stats.totalActive}
          icon={Activity}
          color="blue"
          variant="accent"
          pulse
          onClick={() => setSelectedStatus('active')}
        />
        <StatCard
          label={t('queue.stats.completed')}
          value={stats.totalCompleted}
          icon={CheckCircle}
          color="green"
          variant="accent"
          onClick={() => setSelectedStatus('completed')}
        />
        <StatCard
          label={t('queue.stats.failed')}
          value={stats.totalFailed}
          icon={XCircle}
          color="red"
          variant="accent"
          onClick={() => setSelectedStatus('failed')}
        />
        <StatCard
          label={t('queue.stats.delayed')}
          value={stats.totalDelayed}
          icon={Timer}
          color="purple"
          variant="accent"
          onClick={() => setSelectedStatus('delayed')}
        />
      </StatsGrid>

      <JobsListModal
        status={selectedStatus}
        onClose={() => setSelectedStatus(null)}
      />
    </>
  )
}
