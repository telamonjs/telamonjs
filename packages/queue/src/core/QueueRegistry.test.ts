import { describe, it, expect, afterEach } from 'vitest'
import { QueueRegistry } from './QueueRegistry'
import { createTestRedisConfig, createMockLogger } from '../test/fixtures/test-helpers'
import { isRedisAvailable } from '../test/redis-availability'

const redisAvailable = await isRedisAvailable()

describe.skipIf(!redisAvailable)('QueueRegistry', () => {
  let registry: QueueRegistry | undefined

  afterEach(async () => {
    if (registry) {
      await registry.close()
      registry = undefined
    }
  })

  it('returns the same Queue instance for the same job name', () => {
    registry = new QueueRegistry({ redis: createTestRedisConfig() })

    const a1 = registry.getQueue('registry-job-a')
    const a2 = registry.getQueue('registry-job-a')

    expect(a1).toBe(a2)
  })

  it('creates the shared Redis connection exactly once regardless of queue count', () => {
    const logger = createMockLogger()
    registry = new QueueRegistry({ redis: createTestRedisConfig(), logger })

    registry.getQueue('registry-job-a')
    registry.getQueue('registry-job-b')
    registry.getQueue('registry-job-a')

    const connectionLogs = logger.logs.filter(
      l => l.message === 'QueueRegistry created shared Redis connection'
    )
    expect(connectionLogs).toHaveLength(1)
    expect(registry.getStats().hasSharedConnection).toBe(true)
    expect(registry.getStats().totalQueues).toBe(2)
  })

  it('applies prefix and defaultJobOptions to created queues', () => {
    registry = new QueueRegistry({
      redis: createTestRedisConfig(),
      prefix: 'test-registry-prefix',
      defaultJobOptions: { attempts: 7 },
    })

    const queue = registry.getQueue('registry-job-opts')

    expect(queue.opts.prefix).toBe('test-registry-prefix')
    expect((queue.opts.defaultJobOptions as { attempts?: number })?.attempts).toBe(7)
  })

  it('getQueues() returns queues in requested order', () => {
    registry = new QueueRegistry({ redis: createTestRedisConfig() })

    const [a, b] = registry.getQueues(['registry-multi-a', 'registry-multi-b'])

    expect(a.name).toBe('registry-multi-a')
    expect(b.name).toBe('registry-multi-b')
  })

  it('getAllQueues() returns [name, queue] tuples for every created queue', () => {
    registry = new QueueRegistry({ redis: createTestRedisConfig() })
    registry.getQueue('registry-all-a')
    registry.getQueue('registry-all-b')

    const all = registry.getAllQueues()

    expect(all.map(([name]) => name).sort()).toEqual([
      'registry-all-a',
      'registry-all-b',
    ])
  })

  it('close() is idempotent', async () => {
    registry = new QueueRegistry({ redis: createTestRedisConfig() })
    registry.getQueue('registry-close-a')

    await registry.close()
    await expect(registry.close()).resolves.not.toThrow()

    expect(registry.getStats().hasSharedConnection).toBe(false)
    expect(registry.getStats().totalQueues).toBe(0)
  })

  it('getQueue() throws after close()', async () => {
    registry = new QueueRegistry({ redis: createTestRedisConfig() })
    await registry.close()

    expect(() => registry!.getQueue('registry-post-close')).toThrow(
      /shutting down/
    )
  })
})
