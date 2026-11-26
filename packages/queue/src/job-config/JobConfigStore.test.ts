import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Redis as IORedis } from 'ioredis'
import { JobConfigStore } from './JobConfigStore'
import { createTestRedisConfig, createTestRawRedis } from '../test/fixtures/test-helpers'
import { closeRedis } from '../utils/redis.js'
import { isRedisAvailable } from '../test/redis-availability'

const redisAvailable = await isRedisAvailable()

describe.skipIf(!redisAvailable)('JobConfigStore', () => {
  let raw: IORedis
  let keyPrefix: string
  let store: JobConfigStore

  beforeEach(() => {
    // Unique prefix per test to avoid cross-test interference on shared Redis
    keyPrefix = `test:config:${Date.now()}-${Math.random().toString(36).slice(2)}:`
    raw = createTestRawRedis()
    store = new JobConfigStore({ redis: createTestRedisConfig(), keyPrefix })
  })

  afterEach(async () => {
    const keys = await raw.keys(`${keyPrefix}*`)
    if (keys.length > 0) await raw.del(...keys)
    await closeRedis(raw)
    await store.close()
  })

  describe('get/set roundtrip', () => {
    it('returns null for a job that was never set', async () => {
      expect(await store.get('never-set')).toBeNull()
    })

    it('round-trips a typed JobConfig through set/get', async () => {
      await store.set('roundtrip-job', {
        module: 'roundtrip',
        description: 'A test job',
        enabled: true,
        orphan: false,
        cronPattern: '0 9 * * *',
        timezone: 'America/Sao_Paulo',
        priority: 3,
        concurrency: 2,
        timeout: 5000,
      })

      const config = await store.get('roundtrip-job')

      expect(config).toEqual(
        expect.objectContaining({
          jobName: 'roundtrip-job',
          module: 'roundtrip',
          description: 'A test job',
          enabled: true,
          orphan: false,
          cronPattern: '0 9 * * *',
          timezone: 'America/Sao_Paulo',
          priority: 3,
          concurrency: 2,
          timeout: 5000,
        })
      )
    })

    // The PATCH handler turns `null` ("No limit", "No schedule") into a key
    // present with the value undefined: that must clear the stored value.
    it('clears description/cronPattern/concurrency/timeout passed as undefined', async () => {
      await store.set('clear-job', {
        enabled: true,
        orphan: false,
        description: 'Nightly',
        cronPattern: '0 2 * * *',
        priority: 3,
        concurrency: 2,
        timeout: 5000,
      })

      await store.set(
        'clear-job',
        { description: undefined, cronPattern: undefined, concurrency: undefined, timeout: undefined },
        'user-1 - Alice'
      )

      const config = await store.get('clear-job')
      expect(config).toEqual(
        expect.objectContaining({ enabled: true, priority: 3 })
      )
      expect(config?.description).toBeUndefined()
      expect(config?.cronPattern).toBeUndefined()
      expect(config?.concurrency).toBeUndefined()
      expect(config?.timeout).toBeUndefined()
    })

    it('keeps fields that are left out of the partial', async () => {
      await store.set('keep-job', { enabled: true, orphan: false, priority: 3, timeout: 5000 })

      await store.set('keep-job', { priority: 4 })

      expect(await store.get('keep-job')).toEqual(
        expect.objectContaining({ enabled: true, priority: 4, timeout: 5000 })
      )
    })
  })

  describe('Redis key layout (zero-migration guard)', () => {
    it('writes the exact hash field layout the original redis-adapter uses', async () => {
      await store.set('layout-job', {
        module: 'layout',
        enabled: true,
        orphan: false,
        cronPattern: '*/5 * * * *',
        timezone: 'UTC',
        priority: 5,
      })

      const hash = await raw.hgetall(`${keyPrefix}layout-job`)

      expect(hash.module).toBe('layout')
      expect(hash.enabled).toBe('true') // stringified boolean, not "1"/JSON
      expect(hash.orphan).toBe('false')
      expect(hash.cronPattern).toBe('*/5 * * * *')
      expect(hash.timezone).toBe('UTC')
      expect(hash.priority).toBe('5')
      expect(hash.updatedAt).toBeTruthy()
    })

    it('adds the job name to the __index__ SET', async () => {
      await store.set('indexed-job', { enabled: true, orphan: false, priority: 5 })

      const members = await raw.smembers(`${keyPrefix}__index__`)

      expect(members).toContain('indexed-job')
    })

    it('writes history entries as JSON to a LIST at {jobName}:history', async () => {
      await store.set(
        'history-layout-job',
        { enabled: true, orphan: false, priority: 5 },
        'user-1 - Alice'
      )

      const raw_entries = await raw.lrange(`${keyPrefix}history-layout-job:history`, 0, -1)

      expect(raw_entries.length).toBe(1)
      const parsed = JSON.parse(raw_entries[0])
      expect(parsed.action).toBe('created')
      expect(parsed.by).toBe('user-1 - Alice')
      expect(parsed.at).toBeTruthy()
    })
  })

  describe('keyPrefix isolation', () => {
    it('does not see configs written under a different keyPrefix', async () => {
      const otherPrefix = `${keyPrefix}other:`
      const otherStore = new JobConfigStore({
        redis: createTestRedisConfig(),
        keyPrefix: otherPrefix,
      })

      await otherStore.set('isolated-job', { enabled: true, orphan: false, priority: 5 })

      expect(await store.get('isolated-job')).toBeNull()

      await otherStore.delete('isolated-job')
      await otherStore.close()
    })
  })

  describe('toggleEnabled()', () => {
    it('flips enabled without touching other fields', async () => {
      await store.set('toggle-job', {
        module: 'toggle',
        enabled: false,
        orphan: false,
        priority: 5,
      })

      await store.toggleEnabled('toggle-job', true, 'user-1 - Alice')

      const config = await store.get('toggle-job')
      expect(config?.enabled).toBe(true)
      expect(config?.module).toBe('toggle')

      const history = await store.getHistory('toggle-job')
      expect(history[0].action).toBe('enabled')
    })
  })

  describe('toggleModuleJobConfigs()', () => {
    beforeEach(async () => {
      await store.set('mod-job-1', {
        module: 'toggle-mod',
        enabled: false,
        orphan: false,
        priority: 5,
      })
      await store.set('mod-job-2', {
        module: 'toggle-mod',
        enabled: false,
        orphan: false,
        priority: 5,
      })
      await store.set('mod-job-3', {
        module: 'toggle-mod',
        enabled: true,
        orphan: false,
        priority: 5,
      })
      await store.set('other-mod-job', {
        module: 'other-mod',
        enabled: false,
        orphan: false,
        priority: 5,
      })
    })

    it('enables every job in the module and returns what changed', async () => {
      const changed = await store.toggleModuleJobConfigs(
        'toggle-mod',
        true,
        'user-1 - Alice'
      )

      expect(changed.map(c => c.jobName).sort()).toEqual([
        'mod-job-1',
        'mod-job-2',
      ])
      expect(changed.every(c => c.enabled)).toBe(true)

      expect((await store.get('mod-job-1'))?.enabled).toBe(true)
      expect((await store.get('mod-job-2'))?.enabled).toBe(true)
      expect((await store.get('mod-job-3'))?.enabled).toBe(true)
    })

    it('does not touch jobs in a different module', async () => {
      await store.toggleModuleJobConfigs('toggle-mod', true, 'user-1')

      expect((await store.get('other-mod-job'))?.enabled).toBe(false)
    })

    it('skips jobs already at the target value (no history noise)', async () => {
      await store.toggleModuleJobConfigs('toggle-mod', true, 'user-1 - Alice')

      const history = await store.getHistory('mod-job-3')
      expect(history).toHaveLength(0)
    })

    it('returns an empty array when every job is already at the target value', async () => {
      await store.toggleModuleJobConfigs('toggle-mod', true, 'user-1')

      const changed = await store.toggleModuleJobConfigs(
        'toggle-mod',
        true,
        'user-1'
      )
      expect(changed).toEqual([])
    })

    it('records a change-history entry per toggled job', async () => {
      await store.toggleModuleJobConfigs('toggle-mod', true, 'user-1 - Alice')

      const history = await store.getHistory('mod-job-1')
      expect(history[0]).toMatchObject({ action: 'enabled', by: 'user-1 - Alice' })
    })

    it('returns an empty array for a module with no jobs', async () => {
      const changed = await store.toggleModuleJobConfigs('no-such-mod', true)
      expect(changed).toEqual([])
    })
  })

  describe('delete()', () => {
    it('removes the hash, history list, and index membership', async () => {
      await store.set(
        'delete-job',
        { enabled: true, orphan: false, priority: 5 },
        'user-1 - Alice'
      )

      await store.delete('delete-job')

      expect(await raw.exists(`${keyPrefix}delete-job`)).toBe(0)
      expect(await raw.exists(`${keyPrefix}delete-job:history`)).toBe(0)
      const members = await raw.smembers(`${keyPrefix}__index__`)
      expect(members).not.toContain('delete-job')
    })
  })

  describe('history', () => {
    it('records created then updated entries with before/after', async () => {
      await store.set(
        'history-job',
        { enabled: false, orphan: false, priority: 5 },
        'user-1 - Alice'
      )
      await store.set('history-job', { priority: 8 }, 'user-1 - Alice')

      const history = await store.getHistory('history-job')

      // lpush -> most recent first
      expect(history[0].action).toBe('updated')
      expect(history[0].field).toBe('priority')
      expect(history[0].before).toBe('5')
      expect(history[0].after).toBe('8')
      expect(history[1].action).toBe('created')
    })

    it('trims history to historyLimit entries', async () => {
      const smallStore = new JobConfigStore({
        redis: createTestRedisConfig(),
        keyPrefix,
        historyLimit: 3,
      })

      await smallStore.set(
        'trim-job',
        { enabled: false, orphan: false, priority: 1 },
        'user-1'
      )
      for (let i = 2; i <= 6; i++) {
        await smallStore.set('trim-job', { priority: i }, 'user-1')
      }

      const history = await smallStore.getHistory('trim-job', 100)
      expect(history).toHaveLength(3)

      await smallStore.close()
    })

    it('does not write history when no user is provided', async () => {
      await store.set('no-user-job', { enabled: true, orphan: false, priority: 5 })

      const history = await store.getHistory('no-user-job')
      expect(history).toHaveLength(0)
    })
  })

  describe('getEnabled() / getEnabledWithCron() / getByModule()', () => {
    beforeEach(async () => {
      await store.set('q-enabled-cron', {
        module: 'mod-a',
        enabled: true,
        orphan: false,
        cronPattern: '0 * * * *',
        priority: 5,
      })
      await store.set('q-enabled-no-cron', {
        module: 'mod-a',
        enabled: true,
        orphan: false,
        priority: 5,
      })
      await store.set('q-disabled', {
        module: 'mod-b',
        enabled: false,
        orphan: false,
        priority: 5,
      })
      await store.set('q-orphan-enabled', {
        module: 'mod-b',
        enabled: true,
        orphan: true,
        priority: 5,
      })
    })

    it('getEnabled() returns only enabled && !orphan', async () => {
      const names = (await store.getEnabled()).map(c => c.jobName).sort()
      expect(names).toEqual(['q-enabled-cron', 'q-enabled-no-cron'])
    })

    it('getEnabledWithCron() further filters to jobs with a cronPattern', async () => {
      const names = (await store.getEnabledWithCron()).map(c => c.jobName)
      expect(names).toEqual(['q-enabled-cron'])
    })

    it('getByModule() filters by module regardless of enabled/orphan', async () => {
      const names = (await store.getByModule('mod-b')).map(c => c.jobName).sort()
      expect(names).toEqual(['q-disabled', 'q-orphan-enabled'])
    })
  })

  describe('bootstrap()', () => {
    it('adds configs for job names missing from Redis, using defaults', async () => {
      const result = await store.bootstrap(['new-job'], {
        'new-job': { enabled: true, cronPattern: '0 0 * * *', priority: 2 },
      })

      expect(result).toEqual({ added: 1, restored: 0, orphaned: 0, backfilled: 0 })

      const config = await store.get('new-job')
      expect(config?.enabled).toBe(true)
      expect(config?.cronPattern).toBe('0 0 * * *')
      expect(config?.priority).toBe(2)
      expect(config?.orphan).toBe(false)
    })

    it('marks jobs no longer present in code as orphan and disables them', async () => {
      await store.set('gone-job', { enabled: true, orphan: false, priority: 5 })

      const result = await store.bootstrap([])

      expect(result.orphaned).toBe(1)
      const config = await store.get('gone-job')
      expect(config?.orphan).toBe(true)
      expect(config?.enabled).toBe(false)
    })

    it('restores an orphan job that reappears in code without re-enabling it', async () => {
      await store.set('returning-job', { enabled: false, orphan: true, priority: 5 })

      const result = await store.bootstrap(['returning-job'])

      expect(result.restored).toBe(1)
      const config = await store.get('returning-job')
      expect(config?.orphan).toBe(false)
      expect(config?.enabled).toBe(false) // restoring never re-enables
    })

    it('never overwrites an existing customized field on backfill', async () => {
      await store.set('customized-job', {
        enabled: true,
        orphan: false,
        priority: 9, // user customized this via an admin UI
      })

      await store.bootstrap(['customized-job'], {
        'customized-job': { priority: 1 },
      })

      const config = await store.get('customized-job')
      expect(config?.priority).toBe(9)
    })

    it('backfills a field that is present in defaults and absent in Redis', async () => {
      await store.set('partial-job', {
        enabled: true,
        orphan: false,
        priority: 5,
        // no cronPattern set
      })

      const result = await store.bootstrap(['partial-job'], {
        'partial-job': { cronPattern: '0 3 * * *' },
      })

      expect(result.backfilled).toBe(1)
      const config = await store.get('partial-job')
      expect(config?.cronPattern).toBe('0 3 * * *')
    })

    it('is idempotent - a second run with the same inputs produces zero counts', async () => {
      const codeJobs = ['idem-job']
      const defaults = { 'idem-job': { cronPattern: '0 1 * * *', priority: 4 } }

      await store.bootstrap(codeJobs, defaults)
      const second = await store.bootstrap(codeJobs, defaults)

      expect(second).toEqual({ added: 0, restored: 0, orphaned: 0, backfilled: 0 })
    })
  })
})

// Two apps on one Redis, each passing its own queue `prefix`: neither sees,
// orphans or edits the other's job configs.
describe.skipIf(!redisAvailable)('JobConfigStore prefix (apps sharing one Redis)', () => {
  let raw: IORedis
  let prefixA: string
  let prefixB: string
  let storeA: JobConfigStore
  let storeB: JobConfigStore

  beforeEach(() => {
    const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    prefixA = `test-app-a-${run}`
    prefixB = `test-app-b-${run}`
    raw = createTestRawRedis()
    storeA = new JobConfigStore({ redis: createTestRedisConfig(), prefix: prefixA })
    storeB = new JobConfigStore({ redis: createTestRedisConfig(), prefix: prefixB })
  })

  afterEach(async () => {
    const keys = [
      ...(await raw.keys(`${prefixA}:*`)),
      ...(await raw.keys(`${prefixB}:*`)),
    ]
    if (keys.length > 0) await raw.del(...keys)
    await closeRedis(raw)
    await storeA.close()
    await storeB.close()
  })

  it("keeps each app's configs under `${prefix}:config:`", async () => {
    await storeB.bootstrap(['billing-nightly'], {
      'billing-nightly': { enabled: true, cronPattern: '0 2 * * *' },
    })
    const resultA = await storeA.bootstrap(['report-daily'], {
      'report-daily': { enabled: true },
    })

    expect(resultA.orphaned).toBe(0)
    expect(await raw.exists(`${prefixB}:config:billing-nightly`)).toBe(1)
    expect(await storeB.get('billing-nightly')).toEqual(
      expect.objectContaining({ enabled: true, orphan: false })
    )
    expect((await storeA.getAll()).map(c => c.jobName)).toEqual(['report-daily'])
    expect(await storeA.get('billing-nightly')).toBeNull()
  })

  it('an explicit keyPrefix wins over prefix', async () => {
    const keyPrefix = `${prefixA}:legacy:`
    const store = new JobConfigStore({
      redis: createTestRedisConfig(),
      prefix: prefixA,
      keyPrefix,
    })
    await store.set('kp-job', { enabled: true, orphan: false, priority: 5 })

    expect(await raw.exists(`${keyPrefix}kp-job`)).toBe(1)
    await store.close()
  })
})
