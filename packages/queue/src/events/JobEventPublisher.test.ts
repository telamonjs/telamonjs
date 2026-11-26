import { describe, it, expect, vi, afterEach } from 'vitest'
import { Redis as IORedis } from 'ioredis'
import {
  JobEventPublisher,
  jobStarted,
  jobProgress,
  jobCompleted,
  jobFailed,
  jobRetrying,
} from './JobEventPublisher'
import {
  createTestRedisConfig,
  createTestRawRedis,
  sleep,
} from '../test/fixtures/test-helpers'
import { closeRedis } from '../utils/redis.js'
import { isRedisAvailable } from '../test/redis-availability'
import type { ILogger } from '@telamonjs/logger'

const redisAvailable = await isRedisAvailable()

describe('JobEventPublisher factories', () => {
  it('jobStarted() shape', () => {
    const event = jobStarted('job-1', 'send-email', { to: 'a@b.com' })
    expect(event).toMatchObject({
      type: 'job:started',
      jobId: 'job-1',
      jobName: 'send-email',
      data: { to: 'a@b.com' },
    })
    expect(typeof event.timestamp).toBe('string')
  })

  it('jobProgress() shape', () => {
    const event = jobProgress('job-1', 'send-email', 50)
    expect(event).toMatchObject({
      type: 'job:progress',
      jobId: 'job-1',
      jobName: 'send-email',
      progress: 50,
    })
  })

  it('jobCompleted() shape', () => {
    const event = jobCompleted('job-1', 'send-email', { ok: true })
    expect(event).toMatchObject({
      type: 'job:completed',
      jobId: 'job-1',
      jobName: 'send-email',
      result: { ok: true },
    })
  })

  it('jobFailed() shape', () => {
    const event = jobFailed('job-1', 'send-email', 'boom')
    expect(event).toMatchObject({
      type: 'job:failed',
      jobId: 'job-1',
      jobName: 'send-email',
      error: 'boom',
    })
  })

  it('jobRetrying() shape', () => {
    const event = jobRetrying('job-1', 'send-email', 'timeout')
    expect(event).toMatchObject({
      type: 'job:retrying',
      jobId: 'job-1',
      jobName: 'send-email',
      error: 'timeout',
    })
  })
})

describe.skipIf(!redisAvailable)('JobEventPublisher best-effort publish (unit)', () => {
  it('publish() never throws even when the underlying Redis call rejects', async () => {
    const fakeLogger = {
      debug() {},
      info() {},
      warn() {},
      error: vi.fn(),
    } as unknown as ILogger
    const injected = new IORedis(createTestRedisConfig())
    vi.spyOn(injected, 'publish').mockRejectedValue(new Error('boom'))

    const publisher = new JobEventPublisher({ redis: injected, logger: fakeLogger })

    await expect(
      publisher.publish(jobStarted('job-1', 'send-email'))
    ).resolves.toBeUndefined()
    expect(fakeLogger.error).toHaveBeenCalled()

    injected.disconnect()
  })

  it('close() is idempotent', async () => {
    const injected = new IORedis(createTestRedisConfig())
    // ownsConnection: false path (injected) - close() must not touch the connection
    const publisher = new JobEventPublisher({ redis: injected })

    await publisher.close()
    await expect(publisher.close()).resolves.not.toThrow()

    injected.disconnect()
  })
})

describe.skipIf(!redisAvailable)('JobEventPublisher pub/sub (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('publishes an event that a subscriber on the configured channel receives', async () => {
    const channel = `test:job-events:${Date.now()}-${Math.random()}`
    const subscriber = createTestRawRedis()
    const received: string[] = []
    subscriber.on('message', (_ch, message) => received.push(message))
    await subscriber.subscribe(channel)

    const publisher = new JobEventPublisher({
      redis: createTestRedisConfig(),
      channel,
    })

    const event = jobCompleted('job-42', 'generate-report', { rows: 10 })
    await publisher.publish(event)

    await sleep(200) // allow pub/sub delivery

    expect(received).toHaveLength(1)
    expect(JSON.parse(received[0])).toMatchObject(event)

    await publisher.close()
    await subscriber.unsubscribe(channel)
    await closeRedis(subscriber)
  })

  it('derives the channel from prefix (`${prefix}:job-events`)', async () => {
    const prefix = `test-app-${Date.now()}-${Math.random()}`
    const subscriber = createTestRawRedis()
    const received: string[] = []
    subscriber.on('message', (_ch, message) => received.push(message))
    await subscriber.subscribe(`${prefix}:job-events`)

    const publisher = new JobEventPublisher({ redis: createTestRedisConfig(), prefix })
    await publisher.publish(jobFailed('job-1', 'send-email', 'oops'))

    await sleep(200)

    expect(received).toHaveLength(1)

    await publisher.close()
    await subscriber.unsubscribe(`${prefix}:job-events`)
    await closeRedis(subscriber)
  })

  it('defaults to the telamonjs:job-events channel', async () => {
    const subscriber = createTestRawRedis()
    const received: string[] = []
    subscriber.on('message', (_ch, message) => received.push(message))
    await subscriber.subscribe('telamonjs:job-events')

    const publisher = new JobEventPublisher({ redis: createTestRedisConfig() })
    await publisher.publish(jobFailed('job-1', 'send-email', 'oops'))

    await sleep(200)

    expect(received).toHaveLength(1)

    await publisher.close()
    await subscriber.unsubscribe('telamonjs:job-events')
    await closeRedis(subscriber)
  })
})
