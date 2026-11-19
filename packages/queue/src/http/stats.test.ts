import { describe, it, expect, vi } from 'vitest'
import { handleGetStats } from './stats.js'
import { makeDeps, makeQueueSource, makeContracts } from './test-support.js'

describe('handleGetStats', () => {
  it('joins queue stats with contract metadata by name', async () => {
    const queues = makeQueueSource(
      {},
      {
        'send-email': { waiting: 1, active: 2, completed: 3, failed: 4, delayed: 5, paused: 0 },
      }
    )
    const contracts = makeContracts([
      {
        name: 'send-email',
        module: 'notifications',
        description: 'Send an email',
        dispatchable: true,
      },
    ])

    const result = await handleGetStats(makeDeps({ queues, contracts }))

    expect(result.queues).toEqual([
      {
        name: 'send-email',
        displayName: 'Send an email',
        module: 'notifications',
        description: 'Send an email',
        dispatchable: true,
        waiting: 1,
        active: 2,
        completed: 3,
        failed: 4,
        delayed: 5,
        paused: false,
      },
    ])
    expect(result.totalWaiting).toBe(1)
    expect(result.totalActive).toBe(2)
    expect(result.totalCompleted).toBe(3)
    expect(result.totalFailed).toBe(4)
    expect(result.totalDelayed).toBe(5)
  })

  it('includes a queue with no matching contract using fallback metadata instead of dropping it', async () => {
    const queues = makeQueueSource(
      {},
      {
        orphan_job: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 1 },
      }
    )
    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }

    const result = await handleGetStats(makeDeps({ queues, logger }))

    expect(result.queues).toHaveLength(1)
    expect(result.queues[0]).toMatchObject({
      name: 'orphan_job',
      module: 'orphan',
      dispatchable: false,
      paused: true,
    })
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no matching job contract'),
      { queueName: 'orphan_job' }
    )
  })

  it('returns zeroed totals with no registered queues', async () => {
    const result = await handleGetStats(makeDeps({ queues: makeQueueSource({}, {}) }))
    expect(result).toEqual({
      totalWaiting: 0,
      totalActive: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalDelayed: 0,
      queues: [],
    })
  })
})
