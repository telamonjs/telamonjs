import { describe, it, expect, vi } from 'vitest'
import { registerFromConfig } from './registerFromConfig'
import type { QueueManager } from '../core/QueueManager.js'
import type { JobConstructor } from '../core/types.js'
import type { JobConfigStore } from './JobConfigStore.js'
import type { JobConfig } from './types.js'

class FakeJobA {
  name = 'job-a'
  async process() {}
}
class FakeJobB {
  name = 'job-b'
  async process() {}
}

function makeStore(configs: JobConfig[], shouldThrow = false): JobConfigStore {
  return {
    getAll: vi.fn(async () => {
      if (shouldThrow) throw new Error('Redis unreachable')
      return configs
    }),
  } as unknown as JobConfigStore
}

function makeQueueManager() {
  return { register: vi.fn() } as unknown as QueueManager
}

function makeConfig(overrides: Partial<JobConfig>): JobConfig {
  return {
    jobName: 'job-a',
    module: 'job',
    enabled: true,
    orphan: false,
    timezone: 'UTC',
    priority: 5,
    ...overrides,
  }
}

describe('registerFromConfig', () => {
  it('registers only jobs that are enabled && !orphan in the store', async () => {
    const qm = makeQueueManager()
    const store = makeStore([
      makeConfig({ jobName: 'job-a', enabled: true, orphan: false }),
      makeConfig({ jobName: 'job-b', enabled: false, orphan: false }),
    ])
    const jobs = new Map<string, JobConstructor>([
      ['job-a', FakeJobA as unknown as JobConstructor],
      ['job-b', FakeJobB as unknown as JobConstructor],
    ])

    const result = await registerFromConfig(qm, store, jobs)

    expect(result.mode).toBe('config')
    expect(result.registered).toEqual(['job-a'])
    expect(result.skipped).toEqual(['job-b'])
    expect(qm.register).toHaveBeenCalledTimes(1)
    expect(qm.register).toHaveBeenCalledWith(FakeJobA)
  })

  it('skips jobs with an orphan config even if enabled', async () => {
    const qm = makeQueueManager()
    const store = makeStore([
      makeConfig({ jobName: 'job-a', enabled: true, orphan: true }),
    ])
    const jobs = new Map<string, JobConstructor>([
      ['job-a', FakeJobA as unknown as JobConstructor],
    ])

    const result = await registerFromConfig(qm, store, jobs)

    expect(result.registered).toEqual([])
    expect(result.skipped).toEqual(['job-a'])
  })

  it('skips jobs with no config entry at all', async () => {
    const qm = makeQueueManager()
    const store = makeStore([])
    const jobs = new Map<string, JobConstructor>([
      ['job-a', FakeJobA as unknown as JobConstructor],
    ])

    const result = await registerFromConfig(qm, store, jobs)

    expect(result.registered).toEqual([])
    expect(result.skipped).toEqual(['job-a'])
  })

  it('reports config entries that are enabled but have no matching class as missing', async () => {
    const qm = makeQueueManager()
    const store = makeStore([
      makeConfig({ jobName: 'job-a', enabled: true, orphan: false }),
      makeConfig({ jobName: 'ghost-job', enabled: true, orphan: false }),
    ])
    const jobs = new Map<string, JobConstructor>([
      ['job-a', FakeJobA as unknown as JobConstructor],
    ])

    const result = await registerFromConfig(qm, store, jobs)

    expect(result.missing).toEqual(['ghost-job'])
  })

  it('falls back to registering every job when the store throws', async () => {
    const qm = makeQueueManager()
    const store = makeStore([], true)
    const jobs = new Map<string, JobConstructor>([
      ['job-a', FakeJobA as unknown as JobConstructor],
      ['job-b', FakeJobB as unknown as JobConstructor],
    ])

    const result = await registerFromConfig(qm, store, jobs)

    expect(result.mode).toBe('fallback')
    expect(result.registered.sort()).toEqual(['job-a', 'job-b'])
    expect(result.skipped).toEqual([])
    expect(result.missing).toEqual([])
    expect(qm.register).toHaveBeenCalledTimes(2)
  })
})
