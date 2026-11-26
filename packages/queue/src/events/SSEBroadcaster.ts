import { Redis as IORedis } from 'ioredis'
import type { RedisConfig } from '../core/types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'

/**
 * The only contract this broadcaster has with the transport: something that
 * can receive a pre-formatted SSE frame. Deliberately NOT `Response` (or
 * anything Express-specific) — an HTTP handler wraps whatever framework's
 * response object into this shape.
 */
export interface SSEClient {
  write: (chunk: string) => void
}

export interface SSEBroadcaster {
  /**
   * Register a client and (lazily) start the shared Redis subscriber +
   * heartbeat if this is the first one. Returns an unsubscribe function —
   * call it when the client disconnects; the shared infra tears down once
   * the last client leaves.
   */
  addClient(client: SSEClient): () => void
  /** Tear down every client and the shared infra. Idempotent. */
  close(): Promise<void>
}

export interface SSEBroadcasterOptions {
  /** Redis connection config, or an already-connected ioredis instance to share. */
  redis: RedisConfig | IORedis

  /**
   * Pub/Sub channel job events are published on.
   * @default 'telamonjs:job-events' (JobEventPublisher's default channel)
   */
  channel?: string

  /** Called on every heartbeat tick to build the `stats` frame payload. */
  getStats: () => Promise<unknown>

  /** @default 5000 */
  heartbeatMs?: number

  logger?: ILogger
}

const DEFAULT_CHANNEL = 'telamonjs:job-events'

/**
 * Shared SSE broadcast infrastructure: ONE Redis subscriber + ONE heartbeat
 * interval for every connected client, not one per client. Ported from a
 * consumer-app queue service's `ensureSSEInfra`/`broadcastSSE`/
 * `teardownSSEInfra`, generalized away from Express (`Response`) to the
 * minimal `SSEClient.write` contract.
 */
export function createSSEBroadcaster(
  options: SSEBroadcasterOptions
): SSEBroadcaster {
  const channel = options.channel ?? DEFAULT_CHANNEL
  const heartbeatMs = options.heartbeatMs ?? 5000
  const logger = options.logger ?? new NoOpLogger()

  const clients = new Set<SSEClient>()
  let subscriber: IORedis | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  // In-flight/finished setup, shared by every client that connects while
  // the subscriber is still subscribing (also prevents a 2nd subscriber).
  let infra: Promise<void> | null = null
  // Bumped by every teardown: a setup still subscribing when everyone left
  // sees a newer generation and discards itself instead of leaking.
  let generation = 0
  let closed = false

  /**
   * Write a pre-formatted SSE frame to every connected client. A dead
   * client can't take down the broadcast for everyone else — write errors
   * are caught per-client and the client is dropped from the set.
   */
  function broadcast(payload: string): void {
    for (const client of clients) {
      try {
        client.write(payload)
      } catch {
        clients.delete(client)
      }
    }
  }

  /** Same frame shape as the heartbeat's `stats` broadcast, factored so the connection-time snapshot matches it exactly. */
  function statsFrame(stats: unknown): string {
    const frame = {
      type: 'stats' as const,
      ...(stats as Record<string, unknown>),
      timestamp: new Date().toISOString(),
    }
    return `event: stats\ndata: ${JSON.stringify(frame)}\n\n`
  }

  /**
   * Lazily create the shared Redis subscriber + heartbeat interval on the
   * first client; later clients get the same (possibly still pending)
   * promise. Resolves once SUBSCRIBE is acknowledged (or failed).
   */
  function ensureInfra(): Promise<void> {
    infra ??= setupInfra()
    return infra
  }

  async function setupInfra(): Promise<void> {
    const gen = generation
    let sub: IORedis | null = null
    try {
      // A subscribed connection can't run other commands, so this never
      // reuses an injected IORedis instance directly — `duplicate()` (or a
      // fresh connection built from a RedisConfig) gives the subscriber its
      // own socket while sharing the same connection options.
      sub =
        options.redis instanceof IORedis
          ? options.redis.duplicate()
          : new IORedis(options.redis)

      sub.on('error', (err: Error) => {
        logger.error('SSEBroadcaster Redis subscriber error', {
          error: err.message,
        })
      })

      // Listener before SUBSCRIBE: a message arriving in the same packet as
      // the subscribe ACK is emitted before `await` resumes.
      sub.on('message', (_subscribedChannel: string, message: string) => {
        broadcast(`event: job\ndata: ${message}\n\n`)
      })
      await sub.subscribe(channel)
    } catch (err) {
      logger.error('SSEBroadcaster failed to set up Redis subscriber', {
        error: err instanceof Error ? err.message : String(err),
      })
      sub?.disconnect()
      sub = null
      // Still works for the stats heartbeat below, just no real-time job events.
    }

    if (gen !== generation) {
      // Torn down while subscribing (last client left, or close()).
      sub?.quit().catch(() => sub?.disconnect())
      return
    }
    subscriber = sub

    heartbeat = setInterval(() => {
      options
        .getStats()
        .then(stats => broadcast(statsFrame(stats)))
        .catch(err => {
          logger.error('SSEBroadcaster failed to broadcast stats', {
            error: err instanceof Error ? err.message : String(err),
          })
        })
    }, heartbeatMs)
  }

  /** Tear down the shared subscriber + heartbeat once no clients remain. */
  function teardownInfra(): void {
    infra = null
    generation++
    if (heartbeat) {
      clearInterval(heartbeat)
      heartbeat = null
    }
    if (subscriber) {
      const sub = subscriber
      subscriber = null
      sub.unsubscribe(channel).catch((err: unknown) => {
        logger.warn('SSEBroadcaster failed to unsubscribe on teardown', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
      // A failed QUIT falls back to a forced disconnect: handled, not swallowed
      sub.quit().catch(() => sub.disconnect())
    }
  }

  /**
   * Best-effort initial snapshot so a new client doesn't wait for the next
   * heartbeat tick to see real numbers. Errors are swallowed (logged), same
   * as the heartbeat's — a failing getStats() never drops the connection.
   */
  function sendInitialStats(client: SSEClient): void {
    options
      .getStats()
      .then(stats => {
        if (!clients.has(client)) return
        try {
          client.write(statsFrame(stats))
        } catch {
          clients.delete(client)
        }
      })
      .catch(err => {
        logger.error('SSEBroadcaster failed to send initial stats snapshot', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
  }

  return {
    addClient(client: SSEClient): () => void {
      clients.add(client)
      // Registered synchronously (never misses a broadcast once subscribed);
      // `connected` is written only after SUBSCRIBE is acknowledged, so a
      // client reacting to it can't trigger an event published before the
      // subscriber listens. Consumers (e.g. the telamonjs-ui SSE hook) leave
      // their 'connecting' state on this frame. On subscriber failure it is
      // still sent: the stats heartbeat keeps the stream useful.
      void ensureInfra().then(() => {
        if (!clients.has(client)) return
        try {
          client.write(`event: connected\ndata: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)
        } catch {
          clients.delete(client)
          return
        }
        sendInitialStats(client)
      })

      return () => {
        clients.delete(client)
        if (clients.size === 0) teardownInfra()
      }
    },

    async close(): Promise<void> {
      if (closed) return
      closed = true
      teardownInfra()
      clients.clear()
    },
  }
}
