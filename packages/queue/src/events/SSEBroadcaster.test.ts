import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Redis as IORedis } from 'ioredis'
import { createSSEBroadcaster, type SSEBroadcaster } from './SSEBroadcaster'
import {
  createTestRedisConfig,
  createTestRawRedis,
  waitFor,
  sleep,
} from '../test/fixtures/test-helpers'
import { closeRedis } from '../utils/redis.js'
import { isRedisAvailable } from '../test/redis-availability'

const redisAvailable = await isRedisAvailable()

function collectWrites() {
  const chunks: string[] = []
  return { write: (chunk: string) => chunks.push(chunk), chunks }
}

describe.skipIf(!redisAvailable)('createSSEBroadcaster', () => {
  let publisher: IORedis
  let channel: string
  let broadcaster: SSEBroadcaster | undefined

  beforeEach(() => {
    channel = `test:sse:${Date.now()}-${Math.random().toString(36).slice(2)}`
    publisher = createTestRawRedis()
  })

  afterEach(async () => {
    await broadcaster?.close()
    await closeRedis(publisher)
    broadcaster = undefined
  })

  it('broadcasts a job event published on the channel to every connected client', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })

    const clientA = collectWrites()
    const clientB = collectWrites()
    broadcaster.addClient(clientA)
    broadcaster.addClient(clientB)

    await waitFor(
      async () => {
        await publisher.publish(
          channel,
          JSON.stringify({ type: 'job:started', jobId: 'job-1' })
        )
        // chunks.length > 0 alone isn't enough — every client also gets a
        // `connected` (and a stats snapshot) frame, not just job events.
        return (
          clientA.chunks.some(c => c.includes('event: job')) &&
          clientB.chunks.some(c => c.includes('event: job'))
        )
      },
      { timeout: 3000, interval: 100 }
    )

    const jobFrameA = clientA.chunks.find(c => c.includes('event: job'))
    const jobFrameB = clientB.chunks.find(c => c.includes('event: job'))
    expect(jobFrameA).toContain('"jobId":"job-1"')
    expect(jobFrameB).toBe(jobFrameA)
  })

  it("with prefix, relays only its own app's `${prefix}:job-events`", async () => {
    const prefix = `test-app-a-${Date.now()}-${Math.random().toString(36).slice(2)}`
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      prefix,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })
    const client = collectWrites()
    broadcaster.addClient(client)
    await waitFor(() => client.chunks.some(c => c.startsWith('event: connected')), {
      timeout: 3000,
      interval: 20,
    })

    // Another app on the same Redis, on its own channel and on the legacy one.
    await publisher.publish('test-app-b:job-events', JSON.stringify({ jobId: 'other-app' }))
    await publisher.publish('telamonjs:job-events', JSON.stringify({ jobId: 'legacy' }))
    await publisher.publish(`${prefix}:job-events`, JSON.stringify({ jobId: 'own' }))

    await waitFor(() => client.chunks.some(c => c.includes('"jobId":"own"')), {
      timeout: 3000,
      interval: 20,
    })
    expect(client.chunks.filter(c => c.startsWith('event: job'))).toHaveLength(1)
  })

  it('a client that publishes on `connected` never misses that event (subscribe happens first)', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })
    await publisher.ping() // publisher socket ready: the publish below is instant

    const chunks: string[] = []
    broadcaster.addClient({
      write: chunk => {
        chunks.push(chunk)
        // Published ONCE, the moment the client sees `connected` — if the
        // subscriber weren't up yet, this event would be lost for good.
        if (chunk.startsWith('event: connected')) {
          void publisher.publish(channel, JSON.stringify({ jobId: 'race' }))
        }
      },
    })

    await waitFor(() => chunks.some(c => c.includes('"jobId":"race"')), {
      timeout: 2000,
      interval: 20,
    })
  })

  it('two clients connecting in the same tick share ONE subscriber', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })
    const a = collectWrites()
    const b = collectWrites()
    broadcaster.addClient(a)
    broadcaster.addClient(b)
    await waitFor(
      () =>
        a.chunks.some(c => c.startsWith('event: connected')) &&
        b.chunks.some(c => c.startsWith('event: connected')),
      { timeout: 3000, interval: 20 }
    )
    const [, count] = (await publisher.call('PUBSUB', 'NUMSUB', channel)) as [
      string,
      number,
    ]
    expect(Number(count)).toBe(1)
  })

  it('removes a client that throws on write without affecting the others', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })

    let badWriteCalls = 0
    const badClient = {
      write: () => {
        badWriteCalls++
        throw new Error('client gone')
      },
    }
    const goodClient = collectWrites()
    broadcaster.addClient(badClient)
    broadcaster.addClient(goodClient)

    await waitFor(
      async () => {
        await publisher.publish(channel, JSON.stringify({ type: 'job:started' }))
        return goodClient.chunks.length > 0
      },
      { timeout: 3000, interval: 100 }
    )
    expect(badWriteCalls).toBe(1)

    // Second broadcast: a removed client must not be attempted again.
    await publisher.publish(channel, JSON.stringify({ type: 'job:completed' }))
    await waitFor(() => goodClient.chunks.length > 1, {
      timeout: 3000,
      interval: 100,
    })

    expect(badWriteCalls).toBe(1)
  })

  it('emits a periodic "stats" heartbeat using getStats()', async () => {
    const getStats = vi.fn().mockResolvedValue({ waiting: 3 })
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats,
      heartbeatMs: 50,
    })

    const client = collectWrites()
    broadcaster.addClient(client)

    await waitFor(() => client.chunks.some(c => c.includes('event: stats')), {
      timeout: 3000,
      interval: 20,
    })

    const statsFrame = client.chunks.find(c => c.includes('event: stats'))
    expect(statsFrame).toContain('"type":"stats"')
    expect(statsFrame).toContain('"waiting":3')
    expect(getStats).toHaveBeenCalled()
  })

  it('tears down the Redis subscriber once the last client disconnects', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })

    const client = collectWrites()
    const unsubscribe = broadcaster.addClient(client)

    await waitFor(
      async () => {
        const channels = (await publisher.call(
          'PUBSUB',
          'CHANNELS',
          channel
        )) as string[]
        return channels.includes(channel)
      },
      { timeout: 3000, interval: 100 }
    )

    unsubscribe()

    await waitFor(
      async () => {
        const channels = (await publisher.call(
          'PUBSUB',
          'CHANNELS',
          channel
        )) as string[]
        return !channels.includes(channel)
      },
      { timeout: 3000, interval: 100 }
    )
  })

  it('a client leaving before SUBSCRIBE completes leaks no subscriber and gets no frame', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })
    const client = collectWrites()
    broadcaster.addClient(client)() // unsubscribe synchronously, mid-setup

    await sleep(300) // well past a local SUBSCRIBE round-trip
    const channels = (await publisher.call('PUBSUB', 'CHANNELS', channel)) as string[]
    expect(channels).not.toContain(channel)
    expect(client.chunks).toHaveLength(0)
  })

  it('re-creates the subscriber when a client connects after everyone left', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })

    const first = collectWrites()
    const unsubscribeFirst = broadcaster.addClient(first)
    await waitFor(
      async () =>
        ((await publisher.call('PUBSUB', 'CHANNELS', channel)) as string[]).includes(
          channel
        ),
      { timeout: 3000, interval: 100 }
    )
    unsubscribeFirst()
    await waitFor(
      async () =>
        !(
          (await publisher.call('PUBSUB', 'CHANNELS', channel)) as string[]
        ).includes(channel),
      { timeout: 3000, interval: 100 }
    )

    const second = collectWrites()
    broadcaster.addClient(second)

    await waitFor(
      async () => {
        await publisher.publish(channel, JSON.stringify({ type: 'job:started' }))
        return second.chunks.length > 0
      },
      { timeout: 3000, interval: 100 }
    )
  })

  it('close() tears down infra and is idempotent', async () => {
    broadcaster = createSSEBroadcaster({
      redis: createTestRedisConfig(),
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })

    broadcaster.addClient(collectWrites())
    await waitFor(
      async () =>
        ((await publisher.call('PUBSUB', 'CHANNELS', channel)) as string[]).includes(
          channel
        ),
      { timeout: 3000, interval: 100 }
    )

    await broadcaster.close()
    await expect(broadcaster.close()).resolves.toBeUndefined()

    await waitFor(
      async () =>
        !(
          (await publisher.call('PUBSUB', 'CHANNELS', channel)) as string[]
        ).includes(channel),
      { timeout: 3000, interval: 100 }
    )
  })

  it('works with an already-connected IORedis instance instead of a config', async () => {
    const shared = createTestRawRedis()
    broadcaster = createSSEBroadcaster({
      redis: shared,
      channel,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
    })

    const client = collectWrites()
    broadcaster.addClient(client)

    await waitFor(
      async () => {
        await publisher.publish(channel, JSON.stringify({ type: 'job:started' }))
        return client.chunks.length > 0
      },
      { timeout: 3000, interval: 100 }
    )

    // The injected connection must still be usable for normal commands —
    // proof the subscriber used a duplicate(), not `shared` itself.
    await expect(shared.ping()).resolves.toBe('PONG')

    await closeRedis(shared)
  })

  it('a Redis subscriber setup failure still leaves the stats heartbeat working', async () => {
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
    const getStats = vi.fn().mockResolvedValue({ waiting: 1 })

    broadcaster = createSSEBroadcaster({
      // Unreachable port + no reconnect retries: subscribe() rejects fast,
      // exercising the catch path without hanging on ioredis's default
      // infinite-retry backoff.
      redis: {
        host: '127.0.0.1',
        port: 1,
        connectTimeout: 200,
        retryStrategy: () => null,
      },
      channel,
      getStats,
      heartbeatMs: 50,
      logger,
    })

    const client = collectWrites()
    broadcaster.addClient(client)

    await waitFor(() => client.chunks.some(c => c.includes('event: stats')), {
      timeout: 3000,
      interval: 20,
    })

    expect(client.chunks.some(c => c.includes('event: stats'))).toBe(true)
  })
})

/**
 * `connected` frame + immediate `stats` snapshot on connect. No real
 * Redis needed — `getStats` is caller-injected and the pub/sub subscriber
 * (unreachable on purpose, same pattern as the "setup failure" test above)
 * is irrelevant to this behavior, so this suite runs unconditionally
 * instead of `skipIf(!redisAvailable)`.
 */
describe('createSSEBroadcaster — connected frame + initial stats snapshot', () => {
  const unreachableRedis = { host: '127.0.0.1', port: 1, connectTimeout: 200, retryStrategy: () => null }
  let broadcaster: SSEBroadcaster | undefined

  afterEach(async () => {
    await broadcaster?.close()
    broadcaster = undefined
  })

  it('writes `connected`, then a `stats` snapshot, ahead of any heartbeat tick', async () => {
    const getStats = vi.fn().mockResolvedValue({ waiting: 7 })
    broadcaster = createSSEBroadcaster({ redis: unreachableRedis, getStats, heartbeatMs: 60_000 })

    const client = collectWrites()
    broadcaster.addClient(client)

    // `connected` waits for the subscriber setup to settle (here: fail).
    expect(client.chunks).toHaveLength(0)
    await waitFor(() => client.chunks.length >= 2, { timeout: 3000, interval: 20 })
    expect(client.chunks[0]).toContain('event: connected')
    expect(JSON.parse(client.chunks[0].split('data: ')[1]).type).toBe('connected')
    expect(client.chunks[1]).toContain('event: stats')
    expect(client.chunks[1]).toContain('"waiting":7')
  })

  it('a rejecting getStats() on connect logs the error and drops no client, throws nothing', async () => {
    const getStats = vi.fn().mockRejectedValue(new Error('redis down'))
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
    broadcaster = createSSEBroadcaster({
      redis: unreachableRedis,
      getStats,
      heartbeatMs: 60_000,
      logger,
    })

    const client = collectWrites()
    expect(() => broadcaster!.addClient(client)).not.toThrow()

    await waitFor(() => getStats.mock.calls.length > 0, { timeout: 3000, interval: 20 })
    expect(client.chunks[0]).toContain('event: connected')
    await sleep(50) // let the rejected promise's .catch settle

    expect(client.chunks).toHaveLength(1) // connected only — no stats frame
    expect(logger.error).toHaveBeenCalledWith(
      'SSEBroadcaster failed to send initial stats snapshot',
      expect.objectContaining({ error: 'redis down' })
    )
  })

  it('a failing UNSUBSCRIBE on teardown is logged, not swallowed', async () => {
    const sub = {
      on: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(1),
      unsubscribe: vi.fn().mockRejectedValue(new Error('Connection is closed.')),
      quit: vi.fn().mockResolvedValue('OK'),
      disconnect: vi.fn(),
    }
    // lazyConnect: never touches the network; duplicate() hands out the fake subscriber
    const shared = new IORedis({ lazyConnect: true })
    vi.spyOn(shared, 'duplicate').mockReturnValue(sub as unknown as IORedis)
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
    broadcaster = createSSEBroadcaster({
      redis: shared,
      getStats: vi.fn().mockResolvedValue({}),
      heartbeatMs: 60_000,
      logger,
    })

    const client = collectWrites()
    const remove = broadcaster.addClient(client)
    await waitFor(() => client.chunks.length > 0, { timeout: 3000, interval: 20 })
    remove()

    await waitFor(() => logger.warn.mock.calls.length > 0, { timeout: 3000, interval: 20 })
    expect(logger.warn).toHaveBeenCalledWith(
      'SSEBroadcaster failed to unsubscribe on teardown',
      expect.objectContaining({ error: 'Connection is closed.' })
    )
    expect(sub.quit).toHaveBeenCalled()
    shared.disconnect()
  })
})
