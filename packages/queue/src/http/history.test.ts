import { describe, it, expect, vi } from 'vitest'
import { handleGetHistory, handleGetHistoryAll } from './history.js'
import { makeDeps, makeQueue, makeQueueSource, makeBullJob } from './test-support.js'

describe('handleGetHistory', () => {
  it('throws 400 when queueName is missing', async () => {
    await expect(handleGetHistory(makeDeps(), { queueName: '' })).rejects.toMatchObject({
      status: 400,
    })
  })

  it('throws 404 for an unknown queue', async () => {
    await expect(
      handleGetHistory(makeDeps(), { queueName: 'ghost' })
    ).rejects.toMatchObject({ status: 404 })
  })

  it('merges completed + failed, tags status per source bucket, sorts desc by timestamp', async () => {
    const completedJob = makeBullJob({ id: 'c1', timestamp: 100 })
    const failedJob = makeBullJob({ id: 'f1', timestamp: 200 })
    const queue = makeQueue({
      getJobs: vi.fn().mockImplementation((types: string[]) =>
        types[0] === 'completed' ? [completedJob] : [failedJob]
      ),
    })
    const queues = makeQueueSource({ q1: queue })

    const result = await handleGetHistory(makeDeps({ queues }), { queueName: 'q1' })

    expect(result.jobs).toEqual([
      expect.objectContaining({ id: 'f1', status: 'failed' }),
      expect.objectContaining({ id: 'c1', status: 'completed' }),
    ])
  })
})

describe('history query validation', () => {
  const queues = () => makeQueueSource({ q1: makeQueue() })

  it.each([
    ['limit=0', { limit: 0 }],
    ['a NaN limit', { limit: Number.NaN }],
    ['a limit above the cap', { limit: 501 }],
  ])('handleGetHistory rejects %s with 400', async (_label, extra) => {
    await expect(
      handleGetHistory(makeDeps({ queues: queues() }), { queueName: 'q1', ...extra })
    ).rejects.toMatchObject({ status: 400 })
  })

  it.each([
    ['a negative offset', { offset: -10 }],
    ['limit=0', { limit: 0 }],
    ['an unknown status', { statuses: 'completed,bogus' }],
    ['a non-history status', { statuses: 'waiting' }],
  ])('handleGetHistoryAll rejects %s with 400', async (_label, extra) => {
    await expect(
      handleGetHistoryAll(makeDeps({ queues: queues() }), extra)
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('handleGetHistoryAll', () => {
  it('rejects an invalid startDate/endDate', async () => {
    await expect(
      handleGetHistoryAll(makeDeps(), { startDate: 'not-a-date' })
    ).rejects.toMatchObject({ status: 400, message: 'Invalid startDate: use ISO 8601' })
    await expect(
      handleGetHistoryAll(makeDeps(), { endDate: 'not-a-date' })
    ).rejects.toMatchObject({ status: 400, message: 'Invalid endDate: use ISO 8601' })
  })

  it('aggregates completed+failed across queues with global stats when unfiltered', async () => {
    const completed = makeBullJob({ id: 'c1', timestamp: 100 })
    const failed = makeBullJob({ id: 'f1', timestamp: 200 })
    const queue = makeQueue({
      getJobs: vi
        .fn()
        .mockImplementation((types: string[]) => (types[0] === 'completed' ? [completed] : [failed])),
      getCompletedCount: vi.fn().mockResolvedValue(10),
      getFailedCount: vi.fn().mockResolvedValue(20),
    })
    const queues = makeQueueSource({ q1: queue })

    const result = await handleGetHistoryAll(makeDeps({ queues }), {})

    expect(result.stats).toEqual({ completed: 10, failed: 20 })
    expect(result.total).toBe(30)
    expect(result.approximate).toBeUndefined()
    expect(result.jobs.map(j => j.id)).toEqual(['f1', 'c1'])
  })

  it('recomputes stats/total from the filtered set when search is active (approximate)', async () => {
    const matching = makeBullJob({ id: 'c1', name: 'match-me', timestamp: 100 })
    const other = makeBullJob({ id: 'f1', name: 'other', timestamp: 200 })
    const queue = makeQueue({
      getJobs: vi
        .fn()
        .mockImplementation((types: string[]) => (types[0] === 'completed' ? [matching] : [other])),
      getCompletedCount: vi.fn().mockResolvedValue(999),
      getFailedCount: vi.fn().mockResolvedValue(999),
    })
    const queues = makeQueueSource({ q1: queue })

    const result = await handleGetHistoryAll(makeDeps({ queues }), { search: 'match-me' })

    expect(result.approximate).toBe(true)
    expect(result.total).toBe(1)
    expect(result.stats).toEqual({ completed: 1, failed: 0 })
  })

  it('applies a date range filter against finishedOn (falls back to timestamp)', async () => {
    const inRange = makeBullJob({ id: 'in', timestamp: 5000, finishedOn: 5000 })
    const outOfRange = makeBullJob({ id: 'out', timestamp: 999999999999, finishedOn: 999999999999 })
    const queue = makeQueue({
      getJobs: vi
        .fn()
        .mockImplementation((types: string[]) => (types[0] === 'completed' ? [inRange, outOfRange] : [])),
    })
    const queues = makeQueueSource({ q1: queue })

    const result = await handleGetHistoryAll(makeDeps({ queues }), {
      startDate: new Date(0).toISOString(),
      endDate: new Date(10000).toISOString(),
    })

    expect(result.jobs.map(j => j.id)).toEqual(['in'])
    expect(result.approximate).toBe(true)
  })

  it('filters to a single queue when `queue` is provided', async () => {
    const q1 = makeQueue({ getJobs: vi.fn().mockResolvedValue([]) })
    const q2 = makeQueue({ getJobs: vi.fn().mockResolvedValue([]) })
    await handleGetHistoryAll(makeDeps({ queues: makeQueueSource({ q1, q2 }) }), {
      queue: 'q1',
    })
    expect(q1.getJobs).toHaveBeenCalled()
    expect(q2.getJobs).not.toHaveBeenCalled()
  })
})
