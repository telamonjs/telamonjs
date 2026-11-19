import { describe, it, expect, vi } from 'vitest'
import {
  deriveHealthStatus,
  handleGetFailureGroups,
  handleGetHealth,
  normalizeFailureReason,
  renderHealthMetrics,
} from './health.js'
import { handleRetryJob, handleBulkOperation } from './jobs.js'
import { handlePerformAction } from './actions.js'
import { makeBullJob, makeContracts, makeDeps, makeQueue, makeQueueSource } from './test-support.js'

const NOW = 1_800_000_000_000
const base = { paused: false, nextRunAt: null, lastCompletedAt: null, lastFailedAt: null, failedLastHour: 0 }

describe('deriveHealthStatus', () => {
  it('ok by default', () => {
    expect(deriveHealthStatus(base, NOW)).toBe('ok')
  })

  it('late when the next scheduled iteration is overdue beyond the grace', () => {
    expect(deriveHealthStatus({ ...base, nextRunAt: NOW - 61_000 }, NOW)).toBe('late')
    expect(deriveHealthStatus({ ...base, nextRunAt: NOW - 30_000 }, NOW)).toBe('ok')
  })

  it('failing only when the latest outcome is a failure', () => {
    expect(
      deriveHealthStatus({ ...base, failedLastHour: 3, lastFailedAt: NOW - 1000, lastCompletedAt: NOW - 5000 }, NOW)
    ).toBe('failing')
    expect(
      deriveHealthStatus({ ...base, failedLastHour: 3, lastFailedAt: NOW - 5000, lastCompletedAt: NOW - 1000 }, NOW)
    ).toBe('ok')
  })

  it('paused wins over everything', () => {
    expect(deriveHealthStatus({ ...base, paused: true, nextRunAt: NOW - 999_999 }, NOW)).toBe('paused')
  })
})

describe('normalizeFailureReason', () => {
  it('groups by first non-empty line with ids/numbers/quoted values collapsed', () => {
    const a = normalizeFailureReason('\nInvalid `prisma.$queryRaw()` invocation:\n\nServer has closed the connection.')
    const b = normalizeFailureReason('Invalid `prisma.$queryRaw()` invocation:\nTimed out')
    expect(a).toBe(b)
    expect(normalizeFailureReason('Produto 123 not found')).toBe(normalizeFailureReason('Produto 98765 not found'))
    expect(normalizeFailureReason(undefined)).toBe('(sem mensagem)')
  })

  it('keeps backticked code so different calls stay in different groups', () => {
    const raw = normalizeFailureReason('Invalid `prisma.$queryRaw()` invocation:')
    expect(raw).toBe('Invalid `prisma.$queryRaw()` invocation:')
    expect(normalizeFailureReason('Invalid `prisma.posicao.create()` invocation:')).not.toBe(raw)
    expect(normalizeFailureReason('Produto "ABC1234" not found')).toBe('Produto "…" not found')
  })
})

describe('handleGetFailureGroups', () => {
  it('groups failed jobs by reason, newest group first, with job ids for bulk actions', async () => {
    const jobs = [
      makeBullJob({ id: 'a', failedReason: 'timeout after 60000ms', finishedOn: 100 }),
      makeBullJob({ id: 'b', failedReason: 'timeout after 61000ms', finishedOn: 300 }),
      makeBullJob({ id: 'c', failedReason: 'connection closed', finishedOn: 200 }),
    ]
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue(jobs),
      getFailedCount: vi.fn().mockResolvedValue(3),
    })
    const deps = makeDeps({ queues: makeQueueSource({ q1: queue }) })

    const result = await handleGetFailureGroups(deps, { queueName: 'q1' })

    expect(result).toMatchObject({ total: 3, scanned: 3, manualRetry: true })
    expect(result.groups.map(g => [g.reason, g.count, g.jobIds])).toEqual([
      ['timeout after #ms', 2, ['a', 'b']],
      ['connection closed', 1, ['c']],
    ])
    expect(result.groups[0]).toMatchObject({ firstAt: 100, lastAt: 300, sample: 'timeout after 61000ms' })
  })
})

describe('handleGetHealth', () => {
  it('combines schedulers, finish stats and contract metadata per queue', async () => {
    const client = {
      defineCommand: vi.fn(),
      runCommand: vi.fn().mockResolvedValue([String(NOW - 5000), 120, '0', 0]),
    }
    const queue = makeQueue({
      getJobSchedulers: vi.fn().mockResolvedValue([{ key: 'k', name: 'q1', pattern: '*/5 * * * * *', next: NOW + 5000 }]),
      client: Promise.resolve(client),
      toKey: (t: string) => `bull:q1:${t}`,
    })
    const deps = makeDeps({
      queues: makeQueueSource({ q1: queue }),
      contracts: makeContracts([
        { name: 'q1', module: 'gateway', description: 'Selecionar', dispatchable: true, manualRetry: false },
      ]),
    })

    const { queues } = await handleGetHealth(deps)

    expect(queues).toEqual([
      expect.objectContaining({
        name: 'q1',
        module: 'gateway',
        manualRetry: false,
        schedule: '*/5 * * * * *',
        nextRunAt: NOW + 5000,
        lastCompletedAt: NOW - 5000,
        completedLastHour: 120,
        lastFailedAt: null,
        failedLastHour: 0,
        status: 'ok',
      }),
    ])
    expect(client.runCommand).toHaveBeenCalledWith('telamonjsFinishStats', [
      'bull:q1:completed',
      'bull:q1:failed',
      expect.any(Number),
    ])
  })
})

describe('renderHealthMetrics', () => {
  it('renders prometheus gauges per queue, skipping null values', () => {
    const text = renderHealthMetrics({
      generatedAt: NOW,
      queues: [
        {
          name: 'q1', displayName: 'Q1', module: 'm', dispatchable: false, manualRetry: true, paused: false,
          schedule: null, nextRunAt: null, lastCompletedAt: null, lastFailedAt: null,
          completedLastHour: 7, failedLastHour: 0, waiting: 0, active: 1, status: 'late',
        },
      ],
    })
    expect(text).toContain('queue_health_late{queue="q1",module="m"} 1')
    expect(text).toContain('queue_completed_last_hour{queue="q1",module="m"} 7')
    expect(text).not.toContain('queue_last_completed_timestamp_seconds{')
  })
})

describe('manualRetry: false', () => {
  const deps = () =>
    makeDeps({
      queues: makeQueueSource({ q1: makeQueue() }),
      contracts: makeContracts([{ name: 'q1', module: 'm', description: '', dispatchable: false, manualRetry: false }]),
    })

  it('refuses single, bulk and retry-all with 409; remove still works', async () => {
    await expect(handleRetryJob(deps(), { queueName: 'q1', jobId: 'j' })).rejects.toMatchObject({ status: 409 })
    await expect(
      handleBulkOperation(deps(), { queueName: 'q1', jobIds: ['j'], operation: 'retry' })
    ).rejects.toMatchObject({ status: 409 })
    await expect(handlePerformAction(deps(), { queueName: 'q1', action: 'retry-all' })).rejects.toMatchObject({
      status: 409,
    })
    await expect(
      handleBulkOperation(deps(), { queueName: 'q1', jobIds: ['j'], operation: 'remove' })
    ).resolves.toBeDefined()
  })
})
