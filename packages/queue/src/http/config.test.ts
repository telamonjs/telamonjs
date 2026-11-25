import { describe, it, expect, vi } from 'vitest'
import {
  handleGetJobConfigs,
  handleGetJobConfig,
  handleUpdateJobConfig,
  handleToggleJobConfig,
  handleToggleModuleJobConfigs,
  handleGetJobConfigHistory,
} from './config.js'
import { makeDeps, makeJobConfigStore } from './test-support.js'
import type { JobConfig } from '../job-config/types.js'

const baseConfig: JobConfig = {
  jobName: 'send-email',
  module: 'notifications',
  enabled: true,
  orphan: false,
  timezone: 'UTC',
  priority: 5,
  updatedBy: 'user@x.com - Alice',
}

describe('handleGetJobConfigs', () => {
  it('returns everything from the store', async () => {
    const jobConfigStore = makeJobConfigStore({ getAll: vi.fn().mockResolvedValue([baseConfig]) })
    const result = await handleGetJobConfigs(makeDeps({ jobConfigStore }))
    expect(result).toEqual([baseConfig])
  })
})

describe('handleGetJobConfig', () => {
  it('throws 404 when not found', async () => {
    await expect(
      handleGetJobConfig(makeDeps(), 'ghost')
    ).rejects.toMatchObject({ status: 404 })
  })

  it('parses updatedBy into updatedByUser', async () => {
    const jobConfigStore = makeJobConfigStore({ get: vi.fn().mockResolvedValue(baseConfig) })
    const result = await handleGetJobConfig(makeDeps({ jobConfigStore }), 'send-email')
    expect(result.updatedByUser).toEqual({ name: 'Alice', email: 'user@x.com' })
  })
})

describe('handleUpdateJobConfig', () => {
  it('sets the partial config and returns the refreshed record', async () => {
    const set = vi.fn().mockResolvedValue(undefined)
    const get = vi.fn().mockResolvedValue({ ...baseConfig, priority: 9 })
    const jobConfigStore = makeJobConfigStore({ set, get })

    const result = await handleUpdateJobConfig(
      makeDeps({ jobConfigStore }),
      'send-email',
      { priority: 9, cronPattern: null },
      'actor@x.com'
    )

    expect(set).toHaveBeenCalledWith(
      'send-email',
      { priority: 9, cronPattern: undefined },
      'actor@x.com'
    )
    expect(result.priority).toBe(9)
  })

  it('throws 404 for an unknown job instead of creating a config', async () => {
    const set = vi.fn()
    const jobConfigStore = makeJobConfigStore({ set })

    await expect(
      handleUpdateJobConfig(makeDeps({ jobConfigStore }), 'ghost', { priority: 3 }, 'actor@x.com')
    ).rejects.toMatchObject({ status: 404 })
    expect(set).not.toHaveBeenCalled()
  })

  it.each([
    ['an invalid cronPattern', { cronPattern: 'not a cron' }],
    ['a priority below 1', { priority: 0 }],
    ['a priority above 10', { priority: 11 }],
    ['a string priority', { priority: '5' }],
    ['a fractional priority', { priority: 2.5 }],
    ['a zero concurrency', { concurrency: 0 }],
    ['a negative timeout', { timeout: -1 }],
    ['a NaN timeout', { timeout: Number.NaN }],
    ['a non-string description', { description: 42 }],
  ])('throws 400 for %s without writing', async (_label, body) => {
    const set = vi.fn()
    const jobConfigStore = makeJobConfigStore({ set, get: vi.fn().mockResolvedValue(baseConfig) })

    await expect(
      handleUpdateJobConfig(makeDeps({ jobConfigStore }), 'send-email', body as never, 'actor@x.com')
    ).rejects.toMatchObject({ status: 400 })
    expect(set).not.toHaveBeenCalled()
  })

  it('accepts a valid cronPattern and nulls that clear a field', async () => {
    const set = vi.fn().mockResolvedValue(undefined)
    const jobConfigStore = makeJobConfigStore({ set, get: vi.fn().mockResolvedValue(baseConfig) })

    await handleUpdateJobConfig(
      makeDeps({ jobConfigStore }),
      'send-email',
      { cronPattern: '0 9 * * *', concurrency: null, timeout: 30000 },
      'actor@x.com'
    )

    expect(set).toHaveBeenCalledWith(
      'send-email',
      { cronPattern: '0 9 * * *', concurrency: undefined, timeout: 30000 },
      'actor@x.com'
    )
  })
})

describe('handleToggleJobConfig', () => {
  it('toggles enabled and returns the refreshed record', async () => {
    const toggleEnabled = vi.fn().mockResolvedValue(undefined)
    const get = vi.fn().mockResolvedValue({ ...baseConfig, enabled: false })
    const jobConfigStore = makeJobConfigStore({ toggleEnabled, get })

    const result = await handleToggleJobConfig(
      makeDeps({ jobConfigStore }),
      'send-email',
      false,
      'actor@x.com'
    )

    expect(toggleEnabled).toHaveBeenCalledWith('send-email', false, 'actor@x.com')
    expect(result.enabled).toBe(false)
  })

  it('throws 404 for an unknown job', async () => {
    const toggleEnabled = vi.fn()
    await expect(
      handleToggleJobConfig(
        makeDeps({ jobConfigStore: makeJobConfigStore({ toggleEnabled }) }),
        'ghost',
        true,
        'actor@x.com'
      )
    ).rejects.toMatchObject({ status: 404 })
    expect(toggleEnabled).not.toHaveBeenCalled()
  })

  it.each([undefined, 'true', 1, null])('throws 400 when enabled is %j', async enabled => {
    const toggleEnabled = vi.fn()
    const jobConfigStore = makeJobConfigStore({
      toggleEnabled,
      get: vi.fn().mockResolvedValue(baseConfig),
    })
    await expect(
      handleToggleJobConfig(makeDeps({ jobConfigStore }), 'send-email', enabled as never, 'a@x.com')
    ).rejects.toMatchObject({ status: 400 })
    expect(toggleEnabled).not.toHaveBeenCalled()
  })
})

describe('handleToggleModuleJobConfigs', () => {
  it('returns the count of jobs actually toggled', async () => {
    const jobConfigStore = makeJobConfigStore({
      toggleModuleJobConfigs: vi.fn().mockResolvedValue([baseConfig, baseConfig]),
    })
    const result = await handleToggleModuleJobConfigs(
      makeDeps({ jobConfigStore }),
      'notifications',
      true,
      'actor@x.com'
    )
    expect(result).toEqual({ updated: 2 })
  })

  it('throws 400 when enabled is not a boolean', async () => {
    const toggleModuleJobConfigs = vi.fn()
    await expect(
      handleToggleModuleJobConfigs(
        makeDeps({ jobConfigStore: makeJobConfigStore({ toggleModuleJobConfigs }) }),
        'notifications',
        undefined as never,
        'actor@x.com'
      )
    ).rejects.toMatchObject({ status: 400 })
    expect(toggleModuleJobConfigs).not.toHaveBeenCalled()
  })
})

describe('handleGetJobConfigHistory limit', () => {
  it.each([0, -1, Number.NaN, 501])('throws 400 for limit %s', async limit => {
    await expect(
      handleGetJobConfigHistory(makeDeps(), 'send-email', limit)
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('handleGetJobConfigHistory', () => {
  it('maps store entries to the UI JobHistoryEntry shape', async () => {
    const jobConfigStore = makeJobConfigStore({
      getHistory: vi.fn().mockResolvedValue([
        {
          action: 'updated',
          field: 'priority',
          before: '5',
          after: '9',
          by: 'user@x.com - Alice',
          at: '2026-01-01T00:00:00.000Z',
        },
      ]),
    })

    const result = await handleGetJobConfigHistory(makeDeps({ jobConfigStore }), 'send-email')

    expect(result).toEqual([
      {
        id: 'send-email-0',
        action: 'updated',
        changedBy: 'user@x.com - Alice',
        changedByUser: { name: 'Alice', email: 'user@x.com' },
        before: { value: '5' },
        after: { value: '9' },
        reason: 'Campo: priority',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ])
  })
})
