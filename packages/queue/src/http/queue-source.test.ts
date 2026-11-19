import { describe, it, expect, vi } from 'vitest'
import { queueSourceFromManager, queueSourceFromRegistry } from './queue-source.js'
import { makeQueue, makeQueueManager } from './test-support.js'
import type { QueueRegistry } from '../core/QueueRegistry.js'

describe('queueSourceFromManager', () => {
  it('getQueue unwraps the QueueManager Queue wrapper to the raw BullMQ queue', () => {
    const raw = makeQueue()
    const manager = makeQueueManager({ 'send-email': raw })

    const source = queueSourceFromManager(manager)

    expect(source.getQueue('send-email')).toBe(raw)
    expect(source.getQueue('ghost')).toBeUndefined()
  })

  it('getStats delegates straight to QueueManager.getStats()', async () => {
    const stats = { 'send-email': { waiting: 1, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 } }
    const manager = makeQueueManager({}, stats)

    const source = queueSourceFromManager(manager)

    await expect(source.getStats()).resolves.toBe(stats)
  })
})

describe('queueSourceFromRegistry', () => {
  function makeRegistry(queues: Record<string, ReturnType<typeof makeQueue>>): QueueRegistry {
    return {
      getQueue: vi.fn((name: string) => {
        const q = queues[name]
        if (!q) throw new Error(`no queue ${name}`)
        return q
      }),
    } as unknown as QueueRegistry
  }

  it('getQueue delegates directly to the registry (already raw, shared connection)', () => {
    const raw = makeQueue()
    const registry = makeRegistry({ 'send-email': raw })

    const source = queueSourceFromRegistry(registry, () => ['send-email'])

    expect(source.getQueue('send-email')).toBe(raw)
  })

  it('getQueue returns undefined for an unknown name without touching the registry', () => {
    // QueueRegistry.getQueue() creates the queue on demand, so an ungated
    // lookup would make every name "exist" (no 404 from the handlers) and let
    // a request-supplied name materialize a queue in Redis.
    const registry = makeRegistry({ 'send-email': makeQueue() })

    const source = queueSourceFromRegistry(registry, () => ['send-email'])

    expect(source.getQueue('ghost')).toBeUndefined()
    expect(registry.getQueue).not.toHaveBeenCalledWith('ghost')
  })

  it('getStats builds the same shape as Queue.getStats() for every name from getJobNames()', async () => {
    const q1 = makeQueue({
      getWaitingCount: vi.fn().mockResolvedValue(1),
      getActiveCount: vi.fn().mockResolvedValue(2),
      getCompletedCount: vi.fn().mockResolvedValue(3),
      getFailedCount: vi.fn().mockResolvedValue(4),
      getDelayedCount: vi.fn().mockResolvedValue(5),
      isPaused: vi.fn().mockResolvedValue(true),
    })
    const q2 = makeQueue()
    const registry = makeRegistry({ q1, q2 })

    const source = queueSourceFromRegistry(registry, () => ['q1', 'q2'])

    const stats = await source.getStats()

    expect(stats).toEqual({
      q1: { waiting: 1, active: 2, completed: 3, failed: 4, delayed: 5, paused: 1 },
      q2: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
    })
  })

  it('getStats reflects getJobNames() being called fresh each time (not memoized at construction)', async () => {
    const q1 = makeQueue()
    const registry = makeRegistry({ q1 })
    let names: string[] = []

    const source = queueSourceFromRegistry(registry, () => names)

    expect(await source.getStats()).toEqual({})
    names = ['q1']
    expect(await source.getStats()).toEqual({
      q1: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
    })
  })
})
