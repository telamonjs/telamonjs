import type { QueueManager } from '../core/QueueManager.js'
import type { JobConstructor } from '../core/types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { JobConfigStore } from './JobConfigStore.js'

export interface RegisterFromConfigOptions {
  logger?: ILogger
}

export interface RegisterFromConfigResult {
  /** Job names registered on queueManager (enabled && !orphan in store). */
  registered: string[]
  /** Job names present in code but not registered (disabled, orphan, or no config entry). */
  skipped: string[]
  /** Job names enabled in the store but with no matching class in `jobs`. */
  missing: string[]
  /** 'fallback' when the store was unreachable and every job got registered. */
  mode: 'config' | 'fallback'
}

/**
 * Register jobs on a QueueManager driven by JobConfigStore state: only jobs
 * that are `enabled && !orphan` get registered. Call `store.bootstrap(...)`
 * before this if code-vs-Redis reconciliation is needed - bootstrap is
 * intentionally not run here.
 *
 * If the store throws (Redis unreachable, etc), every job in `jobs` is
 * registered unconditionally so a config outage never takes workers down
 * with it, and `mode: 'fallback'` reports that this happened.
 */
export async function registerFromConfig(
  queueManager: QueueManager,
  store: JobConfigStore,
  jobs: Map<string, JobConstructor>,
  opts?: RegisterFromConfigOptions
): Promise<RegisterFromConfigResult> {
  const logger = opts?.logger ?? new NoOpLogger()

  let configs
  try {
    configs = await store.getAll()
  } catch (err) {
    logger.error(
      'registerFromConfig: JobConfigStore unavailable, registering all jobs as fallback',
      { error: err instanceof Error ? err.message : String(err) }
    )

    const registered: string[] = []
    for (const [name, JobClass] of jobs) {
      queueManager.register(JobClass)
      registered.push(name)
    }

    return { registered, skipped: [], missing: [], mode: 'fallback' }
  }

  const configByName = new Map(configs.map(c => [c.jobName, c]))
  const registered: string[] = []
  const skipped: string[] = []

  for (const [name, JobClass] of jobs) {
    const config = configByName.get(name)
    if (config?.enabled && !config.orphan) {
      queueManager.register(JobClass)
      registered.push(name)
    } else {
      skipped.push(name)
    }
  }

  const missing = configs
    .filter(c => c.enabled && !c.orphan && !jobs.has(c.jobName))
    .map(c => c.jobName)

  return { registered, skipped, missing, mode: 'config' }
}
