import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { handleGetDispatchableJobs, handleDispatch } from './dispatch.js'
import { QueueHttpError } from './types.js'
import { makeDeps, makeContracts, makeQueue, makeQueueSource, makeBullJob } from './test-support.js'

describe('handleGetDispatchableJobs', () => {
  it('returns only dispatchable contracts, mapped to the UI DispatchableJob shape', async () => {
    const contracts = makeContracts([
      { name: 'send-email', module: 'notifications', description: 'Send email', dispatchable: true },
      { name: 'internal-cleanup', module: 'system', description: 'Cleanup', dispatchable: false },
    ])

    const result = await handleGetDispatchableJobs(makeDeps({ contracts }))

    expect(result).toEqual([
      {
        name: 'send-email',
        displayName: 'Send email',
        module: 'notifications',
        description: 'Send email',
        dispatchable: true,
      },
    ])
  })

  it('displayName prefers the contract label over the description', async () => {
    const contracts = makeContracts([
      { name: 'send-email', module: 'notifications', label: 'Email', description: 'Sends the welcome email', dispatchable: true },
    ])

    const [job] = await handleGetDispatchableJobs(makeDeps({ contracts }))

    expect(job).toMatchObject({ displayName: 'Email', description: 'Sends the welcome email' })
  })
})

describe('handleDispatch', () => {
  it('dispatches a job, tagging data with triggeredBy/triggeredAt', async () => {
    const job = makeBullJob({ id: 'job-42' })
    const queue = makeQueue({ add: vi.fn().mockResolvedValue(job) })
    const queues = makeQueueSource({ 'send-email': queue })
    const contracts = makeContracts([
      { name: 'send-email', module: 'notifications', description: 'Send email', dispatchable: true },
    ])

    const result = await handleDispatch(
      makeDeps({ queues, contracts }),
      { queueName: 'send-email', data: { to: 'a@b.com' } },
      'user@telamonjs'
    )

    expect(result).toEqual({ jobId: 'job-42', queueName: 'send-email' })
    expect(queue.add).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ to: 'a@b.com', triggeredBy: 'user@telamonjs' }),
      undefined
    )
  })

  it('throws 400 when queueName is missing', async () => {
    await expect(
      handleDispatch(makeDeps(), { queueName: '' }, 'actor')
    ).rejects.toMatchObject({ status: 400 })
  })

  it('throws 404 for an unknown contract', async () => {
    await expect(
      handleDispatch(makeDeps(), { queueName: 'ghost' }, 'actor')
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining('Unknown queue') })
  })

  it('throws 400 when the job is not dispatchable', async () => {
    const contracts = makeContracts([
      { name: 'internal-job', module: 'system', description: 'x', dispatchable: false },
    ])
    await expect(
      handleDispatch(makeDeps({ contracts }), { queueName: 'internal-job' }, 'actor')
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('not dispatchable') })
  })

  it('throws 422 when the payload fails schema validation', async () => {
    const contracts = makeContracts([
      {
        name: 'send-email',
        module: 'notifications',
        description: 'Send email',
        dispatchable: true,
        schema: z.object({ to: z.string().email() }),
      },
    ])
    const queues = makeQueueSource({ 'send-email': makeQueue() })

    await expect(
      handleDispatch(
        makeDeps({ queues, contracts }),
        { queueName: 'send-email', data: { to: 'not-an-email' } },
        'actor'
      )
    ).rejects.toMatchObject({ status: 422 })
  })

  it('enqueues the schema output: unknown keys stripped, defaults and transforms applied', async () => {
    const queue = makeQueue()
    const queues = makeQueueSource({ export: queue })
    const contracts = makeContracts([
      {
        name: 'export',
        module: 'reports',
        description: 'Export',
        dispatchable: true,
        schema: z.object({
          fileName: z.string().trim(),
          pageSize: z.number().max(100).default(50),
        }),
      },
    ])

    await handleDispatch(
      makeDeps({ queues, contracts }),
      { queueName: 'export', data: { fileName: '  report.csv  ', ownerId: 'other-owner' } },
      'actor'
    )

    expect(queue.add).toHaveBeenCalledWith(
      'export',
      {
        fileName: 'report.csv',
        pageSize: 50,
        triggeredBy: 'actor',
        triggeredAt: expect.any(String),
      },
      undefined
    )
  })

  it('applies the contract defaultOptions when adding the job', async () => {
    const queue = makeQueue()
    const queues = makeQueueSource({ 'send-email': queue })
    const contracts = makeContracts([
      {
        name: 'send-email',
        module: 'notifications',
        description: 'Send email',
        dispatchable: true,
        defaultOptions: { attempts: 5 },
      },
    ])

    await handleDispatch(makeDeps({ queues, contracts }), { queueName: 'send-email' }, 'actor')

    expect(queue.add).toHaveBeenCalledWith('send-email', expect.any(Object), { attempts: 5 })
  })

  it('throws 404 when the contract exists but QueueManager has no queue for it', async () => {
    const contracts = makeContracts([
      { name: 'send-email', module: 'notifications', description: 'x', dispatchable: true },
    ])
    await expect(
      handleDispatch(makeDeps({ contracts, queues: makeQueueSource({}) }), { queueName: 'send-email' }, 'actor')
    ).rejects.toBeInstanceOf(QueueHttpError)
  })
})
