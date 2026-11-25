import { describe, it, expect, vi } from 'vitest'
import { handlePerformAction } from './actions.js'
import { makeDeps, makeQueue, makeQueueSource, makeBullJob } from './test-support.js'

describe('handlePerformAction', () => {
  it('throws 400 when queueName or action is missing', async () => {
    await expect(
      handlePerformAction(makeDeps(), { queueName: '', action: 'pause' })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('throws 404 for an unknown queue', async () => {
    await expect(
      handlePerformAction(makeDeps(), { queueName: 'ghost', action: 'pause' })
    ).rejects.toMatchObject({ status: 404 })
  })

  it('pauses a queue', async () => {
    const queue = makeQueue()
    const result = await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', action: 'pause' }
    )
    expect(queue.pause).toHaveBeenCalled()
    expect(result).toEqual({ success: true, message: 'Queue q1 paused' })
  })

  it('resumes a queue', async () => {
    const queue = makeQueue()
    const result = await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', action: 'resume' }
    )
    expect(queue.resume).toHaveBeenCalled()
    expect(result.message).toBe('Queue q1 resumed')
  })

  it('cleans a single status when provided', async () => {
    const queue = makeQueue({ clean: vi.fn().mockResolvedValue(['a', 'b']) })
    const result = await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', action: 'clean', status: 'failed' }
    )
    expect(queue.clean).toHaveBeenCalledTimes(1)
    expect(queue.clean).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'failed')
    expect(result.removed).toBe(2)
    expect(result.byQueue).toEqual({ q1: 2 })
  })

  it('cleans both completed and failed when no status given', async () => {
    const queue = makeQueue({ clean: vi.fn().mockResolvedValue(['a']) })
    const result = await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', action: 'clean' }
    )
    expect(queue.clean).toHaveBeenCalledTimes(2)
    expect(result.removed).toBe(2)
  })

  it('retries all failed jobs, tolerating individual retry failures', async () => {
    const ok = makeBullJob({ id: 'j1', retry: vi.fn().mockResolvedValue(undefined) })
    const bad = makeBullJob({ id: 'j2', retry: vi.fn().mockRejectedValue(new Error('gone')) })
    const queue = makeQueue({ getJobs: vi.fn().mockResolvedValue([ok, bad]) })

    const result = await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', action: 'retry-all' }
    )

    expect(ok.retry).toHaveBeenCalled()
    expect(bad.retry).toHaveBeenCalled()
    expect(result.message).toContain('1/2')
  })

  it('reports and logs the per-job retry failures instead of dropping them', async () => {
    const ok = makeBullJob({ id: 'j1', retry: vi.fn().mockResolvedValue(undefined) })
    const bad = makeBullJob({ id: 'j2', retry: vi.fn().mockRejectedValue(new Error('gone')) })
    const queue = makeQueue({ getJobs: vi.fn().mockResolvedValue([ok, bad]) })
    const logger = { warn: vi.fn() }

    const result = await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }), logger: logger as never }),
      { queueName: 'q1', action: 'retry-all' }
    )

    expect(result.success).toBe(true)
    expect(result.errors).toEqual(['j2: gone'])
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('q1'),
      expect.objectContaining({ failed: 1 })
    )
  })

  it('omits errors when every retry succeeds', async () => {
    const queue = makeQueue({ getJobs: vi.fn().mockResolvedValue([makeBullJob({ id: 'j1' })]) })

    const result = await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', action: 'retry-all' }
    )

    expect(result).not.toHaveProperty('errors')
  })

  it('drains only waiting jobs (keeps delayed, which hold cron iterations)', async () => {
    const queue = makeQueue({ drain: vi.fn().mockResolvedValue(undefined), getWaitingCount: vi.fn().mockResolvedValue(3) })
    const queues = makeQueueSource({ q1: queue })

    const result = await handlePerformAction(makeDeps({ queues }), { queueName: 'q1', action: 'drain' })

    expect(queue.drain).toHaveBeenCalledWith(false)
    expect(result).toMatchObject({ success: true, removed: 3 })
  })

  it('obliterates a queue via the raw BullMQ queue with force:true', async () => {
    const queue = makeQueue()
    await handlePerformAction(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', action: 'obliterate' }
    )
    expect(queue.obliterate).toHaveBeenCalledWith({ force: true })
  })

  describe('queueName: "*"', () => {
    it('rejects any action other than clean', async () => {
      await expect(
        handlePerformAction(makeDeps(), { queueName: '*', action: 'pause' })
      ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("only 'clean' is allowed") })
    })

    it('cleans every registered queue and aggregates byQueue', async () => {
      const q1 = makeQueue({ clean: vi.fn().mockResolvedValue(['a']) })
      const q2 = makeQueue({ clean: vi.fn().mockResolvedValue(['b', 'c']) })
      const queues = makeQueueSource({ q1, q2 })

      const result = await handlePerformAction(makeDeps({ queues }), {
        queueName: '*',
        action: 'clean',
      })

      expect(result.success).toBe(true)
      expect(result.byQueue).toEqual({ q1: 2, q2: 4 })
      expect(result.removed).toBe(6)
    })

    it('marks success:false only when every queue fails to clean', async () => {
      const failing = makeQueue({ clean: vi.fn().mockRejectedValue(new Error('boom')) })
      const queues = makeQueueSource({ q1: failing })
      const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }

      const result = await handlePerformAction(makeDeps({ queues, logger }), {
        queueName: '*',
        action: 'clean',
      })

      expect(result.success).toBe(false)
      expect(result.errors).toEqual(['q1: boom'])
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
