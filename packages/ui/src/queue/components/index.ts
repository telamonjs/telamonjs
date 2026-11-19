// Original dashboard components
export { default as QueueDashboard } from './QueueDashboard'
export { default as DashboardHeader } from './DashboardHeader'
export { default as JobStatsCards } from './JobStatsCards'
export { default as JobEventTimeline } from './JobEventTimeline'
export { default as JobEventModal } from './JobEventModal'
export { default as JobsHistoryModal } from './JobsHistoryModal'
export { default as JobsListModal } from './JobsListModal'
export { default as FailureGroupsModal } from './FailureGroupsModal'
export { default as JobDetailModal } from './JobDetailModal'
export { default as DispatchJobModal } from './DispatchJobModal'
export { default as QueuesTable } from './QueuesTable'
export { default as RedisMetrics } from './RedisMetrics'
export type * from './types'

// Tabbed dashboard (plug-and-play)
export { default as QueueTabbedDashboard } from './QueueTabbedDashboard'
export { default as JobConfigDialog } from './JobConfigDialog'
export { default as JobDetailPage } from './JobDetailPage'

// Tabs (lazy-loadable)
export { default as TempoRealTab } from './tabs/TempoRealTab'
export { default as ConfiguracaoTab } from './tabs/ConfiguracaoTab'
export { default as HistoricoTab } from './tabs/HistoricoTab'
export { default as RedisTab } from './tabs/RedisTab'
