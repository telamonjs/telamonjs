/**
 * Queue API
 *
 * Exports do sistema de API com Adapter Pattern.
 */

// Provider e hook
export { QueueApiProvider, useQueueApi, useQueueApiOptional } from './provider'
export type { QueueApiProviderProps } from './provider'

// Tipos da API
export type {
  QueueApiAdapter,
  QueueStatsResponse,
  RedisMetricsResponse,
  JobsResponse,
  JobsAllResponse,
  HistoryResponse,
  HistoryAllResponse,
  ClearHistoryResponse,
  ActionResponse,
  BulkOperationResponse,
  DispatchResponse,
  JobsAllParams,
  HistoryAllParams,
  QueueActionParams,
  BulkOperationParams
} from './types'

// Adapters
export {
  createNestJSAdapter,
  createNextJSAdapter,
  type NestJSAdapterConfig,
  type NextJSAdapterConfig
} from './adapters'
