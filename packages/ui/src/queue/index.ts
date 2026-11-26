'use client'

/**
 * Queue Dashboard Module
 *
 * Complete solution for monitoring BullMQ queues with React Query.
 *
 * @example
 * ```tsx
 * import {
 *   QueueTabbedDashboard,
 *   QueueApiProvider,
 *   createNestJSAdapter
 * } from '@telamonjs/ui/queue'
 *
 * const adapter = createNestJSAdapter({
 *   baseUrl: process.env.NEXT_PUBLIC_API_URL,
 *   getAuthToken: async () => session?.accessToken
 * })
 *
 * function App() {
 *   return (
 *     <QueueApiProvider adapter={adapter}>
 *       <QueueTabbedDashboard />
 *     </QueueApiProvider>
 *   )
 * }
 * ```
 */

import { DashboardHeader as QueueDashboardHeader } from './components'
import type { StatusConfig as JobStatusConfig } from './types'

// API Layer
export { QueueApiProvider } from './api/provider'
export { createNestJSAdapter } from './api/adapters/nestjs-adapter'
export { createNextJSAdapter } from './api/adapters/nextjs-adapter'
export type { NestJSAdapterConfig } from './api/adapters/nestjs-adapter'
export type { NextJSAdapterConfig } from './api/adapters/nextjs-adapter'

// Components — original dashboard
export { QueueDashboard } from './components'
/** The `QueueDashboard` header: last update, refresh, history and settings links. */
export { QueueDashboardHeader }
/**
 * @deprecated Use `QueueDashboardHeader`: the root barrel's `DashboardHeader`
 * is a different component (the `DashboardShell` header).
 */
export const DashboardHeader = QueueDashboardHeader
/** Icon, label and colors of one job state. */
export type { JobStatusConfig }
/**
 * @deprecated Use `JobStatusConfig`: the root barrel's `StatusConfig` is a
 * different type (the `DetailStatus` config).
 */
export type StatusConfig = JobStatusConfig

// Components — tabbed dashboard (plug-and-play)
export { QueueTabbedDashboard, JobDetailPage } from './components'

// Types - Core types
export type {
  JobState,
  QueueStats,
  DashboardStats,
  JobInfo,
  RedisMetrics as RedisMetricsData,
  DispatchableJob,
  JobConfig,
  JobConfigWithUser,
  JobHistoryEntry,
  JobConfigUpdateInput,
  SSEConfig,
  HistoryStats,
  QueueHealth,
  QueueHealthStatus,
  QueueHealthResponse,
  FailureGroup,
  FailureGroupsResponse,
} from './types'

// Types - API types (avoid conflicts with core types)
export type {
  QueueApiAdapter,
  QueueConfigApiAdapter,
  QueueStatsResponse,
  RedisMetricsResponse,
  JobsResponse,
  JobsAllResponse,
  HistoryResponse,
  HistoryAllResponse,
  ActionResponse,
  DispatchResponse,
  BulkOperationResponse,
  ClearHistoryResponse,
  JobsAllParams,
  HistoryAllParams,
  QueueActionParams,
  BulkOperationParams,
} from './api/types'
