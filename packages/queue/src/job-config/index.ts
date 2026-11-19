/**
 * @telamonjs/queue/job-config
 *
 * Redis-backed job configuration store (enable/disable, cron, priority,
 * concurrency, timeout, change history) and code<->Redis reconciliation.
 */

export { JobConfigStore } from './JobConfigStore.js'
export type {
  JobConfigStoreOptions,
  BootstrapResult,
} from './JobConfigStore.js'

export type { RegisterFromConfigResult } from './registerFromConfig.js'

export { setupFromConfig } from './setupFromConfig.js'
export type {
  SetupFromConfigOptions,
  SetupFromConfigResult,
} from './setupFromConfig.js'

export { createWorkersFromConfig } from './createWorkersFromConfig.js'
export type { CreateWorkersFromConfigOptions } from './createWorkersFromConfig.js'

export type { JobConfig, JobConfigInput, ConfigHistoryEntry } from './types.js'
