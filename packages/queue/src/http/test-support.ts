/**
 * Shared mock builders for the http/*.test.ts suites. Deliberately NOT a
 * `.test.ts` file (vitest would try to run it as an empty suite) and NOT
 * re-exported from `./index.ts` — internal test support only, same
 * "compiles into dist, isn't public API" status as `helpers.ts`.
 */
import { vi } from 'vitest'
import type { Job as BullJob, Queue as BullQueue } from 'bullmq'
import type { QueueManager } from '../core/QueueManager.js'
import type { QueueStats } from '../core/types.js'
import type { JobConfigStore } from '../job-config/JobConfigStore.js'
import type { JobConfig } from '../job-config/types.js'
import type { JobContractRegistry } from '../contracts/registry.js'
import type { JobDefinition } from '../contracts/types.js'
import type { QueueHttpDeps, QueueSource } from './types.js'
import { queueSourceFromManager } from './queue-source.js'

export function makeBullJob(overrides: Partial<BullJob> = {}): BullJob {
  return {
    id: 'job-1',
    name: 'test-job',
    data: {},
    opts: {},
    progress: 0,
    attemptsMade: 0,
    timestamp: Date.now(),
    retry: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    promote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as BullJob
}

/**
 * A raw BullMQ `Queue` mock — the http handlers work directly
 * against `bullmq`'s `Queue` (via `QueueSource`), not the package's `Queue`
 * wrapper, so this is a single flat mock with no `getRawQueue()`
 * indirection.
 */
export function makeQueue(overrides: Record<string, unknown> = {}): BullQueue {
  return {
    name: 'test-queue',
    add: vi.fn().mockResolvedValue(makeBullJob()),
    getJob: vi.fn().mockResolvedValue(undefined),
    getJobs: vi.fn().mockResolvedValue([]),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    clean: vi.fn().mockResolvedValue([]),
    obliterate: vi.fn().mockResolvedValue(undefined),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
    isPaused: vi.fn().mockResolvedValue(false),
    ...overrides,
  } as unknown as BullQueue
}

/**
 * `QueueManager` mock. `getQueue(name)` returns a stub exposing only
 * `getRawQueue()` — the one method `queueSourceFromManager` calls —
 * returning the raw mock passed in `queues`.
 */
export function makeQueueManager(
  queues: Record<string, BullQueue> = {},
  stats?: Record<string, QueueStats>
): QueueManager {
  const resolvedStats =
    stats ??
    Object.fromEntries(
      Object.keys(queues).map(name => [
        name,
        { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
      ])
    )

  return {
    getQueue: vi.fn((name: string) => {
      const raw = queues[name]
      return raw ? { getRawQueue: () => raw } : undefined
    }),
    getStats: vi.fn().mockResolvedValue(resolvedStats),
  } as unknown as QueueManager
}

/** `deps.queues` built through the public `queueSourceFromManager` adapter. */
export function makeQueueSource(
  queues: Record<string, BullQueue> = {},
  stats?: Record<string, QueueStats>
): QueueSource {
  return queueSourceFromManager(makeQueueManager(queues, stats))
}

export function makeJobConfigStore(
  overrides: Record<string, unknown> = {}
): JobConfigStore {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    toggleEnabled: vi.fn().mockResolvedValue(undefined),
    toggleModuleJobConfigs: vi.fn().mockResolvedValue([] as JobConfig[]),
    getHistory: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as JobConfigStore
}

export function makeContracts(defs: JobDefinition[] = []): JobContractRegistry {
  const map = new Map(defs.map(d => [d.name, d]))
  return {
    get: vi.fn((name: string) => map.get(name)),
    getAll: vi.fn(() => Array.from(map.values())),
    getDispatchable: vi.fn(() => Array.from(map.values()).filter(d => d.dispatchable)),
    getByModule: vi.fn((m: string) => Array.from(map.values()).filter(d => d.module === m)),
    getModules: vi.fn(() => Array.from(new Set(Array.from(map.values()).map(d => d.module)))),
  } as unknown as JobContractRegistry
}

export function makeDeps(overrides: Partial<QueueHttpDeps> = {}): QueueHttpDeps {
  return {
    queues: makeQueueSource(),
    jobConfigStore: makeJobConfigStore(),
    contracts: makeContracts(),
    ...overrides,
  }
}
