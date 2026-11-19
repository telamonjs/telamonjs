import type { QueueManager } from '../core/QueueManager.js'
import type { JobConstructor } from '../core/types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { JobConfigStore, BootstrapResult } from './JobConfigStore.js'
import type { JobConfigInput } from './types.js'
import {
  registerFromConfig,
  type RegisterFromConfigResult,
} from './registerFromConfig.js'

export interface SetupFromConfigOptions {
  /**
   * Per-job bootstrap defaults, keyed by job name. Merged on top of the
   * matching `Job.configDefaults` (field by field) - lets a consumer
   * override or add defaults without touching the job class.
   */
  defaults?: Record<string, Partial<JobConfigInput>>
  logger?: ILogger
}

export interface SetupFromConfigResult extends RegisterFromConfigResult {
  /** `null` when `store.bootstrap()` threw (Redis unreachable, etc). */
  bootstrap: BootstrapResult | null
}

/**
 * Canonical `bootstrap()` -> `registerFromConfig()` composition (~80 lines
 * per consumer in the original app: manual `JOB_DEFAULTS` map + bootstrap
 * call + registerFromConfig call + logging, done by hand for every jobs app).
 *
 * Per-job bootstrap defaults are derived from each class's
 * `Job.configDefaults` (a job with none contributes nothing); `opts.defaults`
 * is merged on top field-by-field, taking precedence for the same job name.
 *
 * `store.bootstrap()` is best-effort: if it throws (Redis unreachable), the
 * error is logged and setup proceeds straight to `registerFromConfig`, which
 * has its own fallback (registers every job) if the store is unreachable
 * there too.
 */
export async function setupFromConfig(
  queueManager: QueueManager,
  store: JobConfigStore,
  jobs: Map<string, JobConstructor>,
  opts?: SetupFromConfigOptions
): Promise<SetupFromConfigResult> {
  const logger = opts?.logger ?? new NoOpLogger()

  const defaults: Record<string, Partial<JobConfigInput>> = {}
  for (const [name, JobClass] of jobs) {
    const instance = new JobClass()
    if (instance.configDefaults) {
      defaults[name] = instance.configDefaults
    }
  }
  if (opts?.defaults) {
    for (const [name, jobDefaults] of Object.entries(opts.defaults)) {
      defaults[name] = { ...defaults[name], ...jobDefaults }
    }
  }

  let bootstrapResult: BootstrapResult | null = null
  try {
    bootstrapResult = await store.bootstrap(Array.from(jobs.keys()), defaults)
    logger.info('setupFromConfig: bootstrap completed', {
      ...bootstrapResult,
    })
  } catch (err) {
    logger.error(
      'setupFromConfig: bootstrap failed, continuing to registerFromConfig',
      { error: err instanceof Error ? err.message : String(err) }
    )
  }

  const registerResult = await registerFromConfig(queueManager, store, jobs, {
    logger,
  })

  logger.info('setupFromConfig: registration completed', {
    registered: registerResult.registered.length,
    skipped: registerResult.skipped.length,
    missing: registerResult.missing.length,
    mode: registerResult.mode,
  })

  return { ...registerResult, bootstrap: bootstrapResult }
}
