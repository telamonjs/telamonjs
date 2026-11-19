/**
 * `QueueSource` factories — the two ways to feed the `./http` handlers a
 * queue without requiring a full `QueueManager` (every job class
 * registered in-process) when the process serving the dashboard isn't the
 * process that owns the workers.
 */
import type { QueueManager } from '../core/QueueManager.js'
import type { QueueRegistry } from '../core/QueueRegistry.js'
import type { QueueStats } from '../core/types.js'
import type { QueueSource } from './types.js'

/**
 * Adapts an existing `QueueManager` to `QueueSource` — same behavior as
 * before 3.2.0, kept for consumers that already have every job class
 * registered in one process. Prefer `queueSourceFromRegistry` when the API
 * and the worker are separate processes.
 */
export function queueSourceFromManager(manager: QueueManager): QueueSource {
  return {
    getQueue: jobName => manager.getQueue(jobName)?.getRawQueue(),
    getStats: () => manager.getStats(),
  }
}

/**
 * Adapts a `QueueRegistry` (one shared Redis connection for every queue,
 * see `core/QueueRegistry.ts`) to `QueueSource`. `getJobNames` supplies the
 * set of queues to report on `getStats()` — a `QueueRegistry` has no job
 * registry of its own to enumerate, so the caller (typically the same
 * `JobContractRegistry` passed as `deps.contracts`) provides it.
 *
 * `getStats()` mirrors `Queue.getStats()` (`core/Queue.ts`) field-for-field:
 * the same 5 counts + `paused: 1 | 0`, gathered with the same
 * `Promise.all` shape.
 */
export function queueSourceFromRegistry(
  registry: QueueRegistry,
  getJobNames: () => string[]
): QueueSource {
  return {
    // Gated on `getJobNames()` on purpose: `QueueRegistry.getQueue()` CREATES
    // the queue on demand, so passing a request-supplied name straight through
    // would both defeat the handlers' 404 (every name would "exist") and let a
    // caller materialize arbitrary queues in Redis. `QueueManager.getQueue()`
    // returns undefined for an unknown name, and this path must match it.
    getQueue: jobName =>
      getJobNames().includes(jobName) ? registry.getQueue(jobName) : undefined,
    async getStats(): Promise<Record<string, QueueStats>> {
      const entries = await Promise.all(
        getJobNames().map(async (name): Promise<[string, QueueStats]> => {
          const queue = registry.getQueue(name)
          const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
            queue.isPaused(),
          ])
          return [name, { waiting, active, completed, failed, delayed, paused: paused ? 1 : 0 }]
        })
      )
      return Object.fromEntries(entries)
    },
  }
}
