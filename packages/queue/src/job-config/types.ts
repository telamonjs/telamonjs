/**
 * Types for Redis-based Job Configuration
 *
 * Ported 1:1 from the original consumer-app implementation. Job configs are
 * stored entirely in Redis so the queue/config layer is self-contained and
 * plug-and-play - no PostgreSQL dependency.
 */

export interface JobConfig {
  jobName: string
  module: string
  description?: string
  enabled: boolean
  orphan: boolean
  cronPattern?: string
  timezone: string
  priority: number
  concurrency?: number
  timeout?: number
  updatedAt?: string
  updatedBy?: string // Format: "userId - userName"
}

export interface ConfigHistoryEntry {
  action: 'enabled' | 'disabled' | 'updated' | 'created'
  field?: string
  before?: string
  after?: string
  by: string // Format: "userId - userName"
  at: string // ISO timestamp
}

export interface JobConfigInput {
  description?: string
  enabled?: boolean
  cronPattern?: string | null
  timezone?: string
  priority?: number
  concurrency?: number | null
  timeout?: number | null
}
