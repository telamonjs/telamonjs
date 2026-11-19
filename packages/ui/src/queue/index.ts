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

// API Layer
export { QueueApiProvider } from './api/provider'
export { createNestJSAdapter } from './api/adapters/nestjs-adapter'
export { createNextJSAdapter } from './api/adapters/nextjs-adapter'
export type { NestJSAdapterConfig } from './api/adapters/nestjs-adapter'
export type { NextJSAdapterConfig } from './api/adapters/nextjs-adapter'

// Components — original dashboard
export { QueueDashboard, DashboardHeader } from './components'

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
  StatusConfig,
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
