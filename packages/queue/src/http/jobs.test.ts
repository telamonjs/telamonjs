import { describe, it, expect, vi } from 'vitest'
import {
  handleGetJobs,
  handleGetJobsAll,
  handleRetryJob,
  handleRemoveJob,
  handlePromoteJob,
  handleBulkOperation,
} from './jobs.js'
import { makeDeps, makeQueue, makeQueueSource, makeBullJob } from './test-support.js'

describe('handleGetJobs', () => {
  it('throws 400 when queueName is missing', async () => {
    await expect(
      handleGetJobs(makeDeps(), { queueName: '' })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('throws 404 for an unknown queue', async () => {
    await expect(
      handleGetJobs(makeDeps(), { queueName: 'ghost' })
    ).rejects.toMatchObject({ status: 404 })
  })

  it('returns jobs for the requested state (default waiting), paginated natively', async () => {
    const job = makeBullJob({ id: 'j1', name: 'send-email' })
    const queue = makeQueue({ getJobs: vi.fn().mockResolvedValue([job]) })
    const queues = makeQueueSource({ q1: queue })

    const result = await handleGetJobs(makeDeps({ queues }), { queueName: 'q1', limit: 10 })

    expect(queue.getJobs).toHaveBeenCalledWith(['waiting'], 0, 9)
    expect(result.jobs).toEqual([
      expect.objectContaining({ id: 'j1', name: 'send-email', queueName: 'q1', status: 'waiting' }),
    ])
  })

  it('prunes orphan sorted-set entries (id without job hash) instead of cleaning by age', async () => {
    const valid = makeBullJob({ id: 'ok' })
    const client = { defineCommand: vi.fn(), runCommand: vi.fn().mockResolvedValue(1) }
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue([valid]), // BullMQ already skips hash-less ids
      getFailedCount: vi.fn().mockResolvedValue(2), // ...but ZCARD still counts them
      getRanges: vi.fn().mockResolvedValue(['ok', 'ghost']),
      client: Promise.resolve(client),
      toKey: (type: string) => `bull:q1:${type}`,
    })
    const queues = makeQueueSource({ q1: queue })

    const result = await handleGetJobs(makeDeps({ queues }), { queueName: 'q1', state: 'failed' })

    expect(result.jobs).toHaveLength(1)
    // only the id missing from the page is a candidate; Lua re-checks EXISTS
    await vi.waitFor(() =>
      expect(client.runCommand).toHaveBeenCalledWith('telamonjsPruneOrphans', [
        'bull:q1:failed',
        'bull:q1:',
        'ghost',
      ])
    )
    expect(queue.clean).not.toHaveBeenCalled()
  })

  it('does not look for orphans when the page is fully consistent with the count', async () => {
    const getRanges = vi.fn()
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue([makeBullJob({ id: 'ok' })]),
      getFailedCount: vi.fn().mockResolvedValue(1),
      getRanges,
    })
    const queues = makeQueueSource({ q1: queue })

    await handleGetJobs(makeDeps({ queues }), { queueName: 'q1', state: 'failed' })
    await new Promise(r => setTimeout(r, 0))

    expect(getRanges).not.toHaveBeenCalled()
  })
})

describe('handleGetJobsAll', () => {
  it('aggregates jobs from every queue and sums per-queue counts', async () => {
    const q1 = makeQueue({
      getJobs: vi.fn().mockResolvedValue([makeBullJob({ id: 'a', timestamp: 100 })]),
      getWaitingCount: vi.fn().mockResolvedValue(5),
    })
    const q2 = makeQueue({
      getJobs: vi.fn().mockResolvedValue([makeBullJob({ id: 'b', timestamp: 200 })]),
      getWaitingCount: vi.fn().mockResolvedValue(3),
    })
    const queues = makeQueueSource({ q1, q2 })

    const result = await handleGetJobsAll(makeDeps({ queues }), {})

    expect(result.total).toBe(8)
    expect(result.jobs.map(j => j.id)).toEqual(['b', 'a']) // sorted desc by timestamp
    expect(result.approximate).toBeUndefined()
  })

  it('filters to a single queue when `queue` is provided', async () => {
    const q1 = makeQueue({ getJobs: vi.fn().mockResolvedValue([]) })
    const q2 = makeQueue({ getJobs: vi.fn().mockResolvedValue([]) })
    const queues = makeQueueSource({ q1, q2 })

    await handleGetJobsAll(makeDeps({ queues }), { queue: 'q1' })

    expect(q1.getJobs).toHaveBeenCalled()
    expect(q2.getJobs).not.toHaveBeenCalled()
  })

  it('marks the result approximate and skips the count call when search is active', async () => {
    const q1 = makeQueue({
      getJobs: vi
        .fn()
        .mockResolvedValue([makeBullJob({ id: 'a', data: { email: 'match@x.com' } })]),
      getWaitingCount: vi.fn(),
    })
    const queues = makeQueueSource({ q1 })

    const result = await handleGetJobsAll(makeDeps({ queues }), { search: 'match' })

    expect(result.approximate).toBe(true)
    expect(result.total).toBe(1)
    expect(q1.getWaitingCount).not.toHaveBeenCalled()
  })
})

describe('handleRetryJob / handleRemoveJob / handlePromoteJob', () => {
  it('retries a job', async () => {
    const job = makeBullJob({ id: 'j1' })
    const queue = makeQueue({ getJob: vi.fn().mockResolvedValue(job) })
    const queues = makeQueueSource({ q1: queue })

    const result = await handleRetryJob(makeDeps({ queues }), { queueName: 'q1', jobId: 'j1' })
    expect(job.retry).toHaveBeenCalled()
    expect(result.success).toBe(true)
  })

  it('removes a job', async () => {
    const job = makeBullJob({ id: 'j1' })
    const queue = makeQueue({ getJob: vi.fn().mockResolvedValue(job) })
    await handleRemoveJob(makeDeps({ queues: makeQueueSource({ q1: queue }) }), {
      queueName: 'q1',
      jobId: 'j1',
    })
    expect(job.remove).toHaveBeenCalled()
  })

  it('promotes a job', async () => {
    const job = makeBullJob({ id: 'j1' })
    const queue = makeQueue({ getJob: vi.fn().mockResolvedValue(job) })
    await handlePromoteJob(makeDeps({ queues: makeQueueSource({ q1: queue }) }), {
      queueName: 'q1',
      jobId: 'j1',
    })
    expect(job.promote).toHaveBeenCalled()
  })

  it('throws 404 when the job does not exist', async () => {
    const queue = makeQueue({ getJob: vi.fn().mockResolvedValue(undefined) })
    await expect(
      handleRetryJob(makeDeps({ queues: makeQueueSource({ q1: queue }) }), {
        queueName: 'q1',
        jobId: 'ghost',
      })
    ).rejects.toMatchObject({ status: 404 })
  })

  it('throws 400 on missing fields', async () => {
    await expect(
      handleRemoveJob(makeDeps(), { queueName: '', jobId: '' })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('throws 404 for an unknown queue', async () => {
    await expect(
      handlePromoteJob(makeDeps(), { queueName: 'ghost', jobId: 'j1' })
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('handleBulkOperation', () => {
  it('retries every job and reports processed/failed counts', async () => {
    const ok = makeBullJob({ id: 'j1' })
    const queue = makeQueue({
      getJob: vi.fn().mockImplementation((id: string) => (id === 'j1' ? ok : undefined)),
    })
    const result = await handleBulkOperation(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', jobIds: ['j1', 'missing'], operation: 'retry' }
    )
    expect(ok.retry).toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      processed: 1,
      failed: 1,
      errors: ['Job missing not found'],
    })
  })

  it('removes every job when operation is remove', async () => {
    const ok = makeBullJob({ id: 'j1' })
    const queue = makeQueue({ getJob: vi.fn().mockResolvedValue(ok) })
    const result = await handleBulkOperation(
      makeDeps({ queues: makeQueueSource({ q1: queue }) }),
      { queueName: 'q1', jobIds: ['j1'], operation: 'remove' }
    )
    expect(ok.remove).toHaveBeenCalled()
    expect(result).toEqual({ success: true, processed: 1, failed: 0 })
  })

  it('throws 400 on missing fields', async () => {
    await expect(
      handleBulkOperation(makeDeps(), { queueName: '', jobIds: [], operation: 'retry' })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('throws 404 for an unknown queue', async () => {
    await expect(
      handleBulkOperation(makeDeps(), { queueName: 'ghost', jobIds: ['j1'], operation: 'retry' })
    ).rejects.toMatchObject({ status: 404 })
  })
})
