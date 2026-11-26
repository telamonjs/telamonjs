import type { QueueManager } from '../core/QueueManager.js'
import type { WorkerConfig } from '../core/types.js'
import type { Worker } from '../core/Worker.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { JobConfigStore } from './JobConfigStore.js'

export interface CreateWorkersFromConfigOptions {
  logger?: ILogger
}

/**
 * Creates workers with per-queue concurrency and timeout read from the `JobConfigStore`
 * (settable via a dashboard, no redeploy) - the 1-call replacement for the
 * original consumer-app pattern of calling `getAllConfigs()`, hand-building a
 * `concurrencyPerQueue` map, then `queueManager.createWorkers()`.
 *
 * `config.concurrencyPerQueue`/`config.timeoutPerQueue`, if given, win
 * field-by-field over the store-derived maps (an explicit call-site override is always the most
 * specific source, same precedence philosophy as `QueueManager.add()`).
 *
 * If the store is unreachable, logs and falls back to
 * `queueManager.createWorkers(config)` unchanged.
 */
export async function createWorkersFromConfig(
  queueManager: QueueManager,
  store: JobConfigStore,
  config?: WorkerConfig,
  opts?: CreateWorkersFromConfigOptions
): Promise<Worker[]> {
  const logger = opts?.logger ?? new NoOpLogger()

  try {
    const configs = await store.getAll()
    const concurrencyPerQueue: Record<string, number> = {}
    const timeoutPerQueue: Record<string, number> = {}
    for (const c of configs) {
      if (c.concurrency) concurrencyPerQueue[c.jobName] = c.concurrency
      if (c.timeout) timeoutPerQueue[c.jobName] = c.timeout
    }

    return await queueManager.createWorkers({
      ...config,
      concurrencyPerQueue: {
        ...concurrencyPerQueue,
        ...config?.concurrencyPerQueue,
      },
      timeoutPerQueue: { ...timeoutPerQueue, ...config?.timeoutPerQueue },
    })
  } catch (err) {
    logger.error(
      'createWorkersFromConfig: JobConfigStore unavailable, falling back to config as-is',
      { error: err instanceof Error ? err.message : String(err) }
    )
    return await queueManager.createWorkers(config)
  }
}
