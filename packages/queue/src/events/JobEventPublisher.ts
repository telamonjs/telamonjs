import { Redis as IORedis } from 'ioredis'
import type { RedisConfig } from '../core/types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import { closeRedis } from '../utils/redis.js'

/**
 * Job event types, mirroring the original consumer-app event publisher,
 * which web apps consume via SSE.
 */
export type JobEventType =
  | 'job:started'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'job:retrying'

export interface JobEvent {
  type: JobEventType
  jobId: string
  jobName: string
  timestamp: string
  data?: unknown
  result?: unknown
  error?: string
  progress?: number
}

export interface JobEventPublisherOptions {
  /** Redis connection config, or an already-connected ioredis instance to share. */
  redis: RedisConfig | IORedis

  /**
   * App namespace: pass the same `prefix` as the app's QueueManager so apps
   * sharing one Redis don't receive each other's events. The channel
   * defaults to `${prefix}:job-events`. @default 'telamonjs'
   */
  prefix?: string

  /** Pub/Sub channel to publish events on; wins over `prefix`. @default `${prefix}:job-events` */
  channel?: string

  logger?: ILogger
}

/**
 * Publishes job lifecycle events to Redis Pub/Sub. Consumers (e.g. a web
 * app's SSE endpoint) subscribe to the same channel.
 *
 * Publishing is best-effort: `publish()` never throws, matching the
 * upstream contract - a Redis hiccup must never fail a job just because its
 * event couldn't be broadcast.
 */
export class JobEventPublisher {
  private readonly redis: IORedis
  private readonly ownsConnection: boolean
  private readonly channel: string
  private readonly logger: ILogger
  private closed = false

  constructor(options: JobEventPublisherOptions) {
    this.channel =
      options.channel ?? `${options.prefix ?? 'telamonjs'}:job-events`
    this.logger = options.logger ?? new NoOpLogger()

    if (options.redis instanceof IORedis) {
      this.redis = options.redis
      this.ownsConnection = false
    } else {
      this.redis = new IORedis(options.redis)
      this.ownsConnection = true
    }

    // ioredis emits 'error' on connection failures (and on a pending
    // command rejecting when the connection closes mid-flight, e.g. a
    // publish() racing close()). With no listener that becomes an
    // unhandled rejection/exception instead of a logged, recoverable
    // event - same requirement as core/Queue.ts. Harmless to attach even
    // on a shared/injected connection.
    this.redis.on('error', (error: Error) => {
      this.logger.error('JobEventPublisher Redis connection error', {
        error: error.message,
      })
    })
  }

  async publish(event: JobEvent): Promise<void> {
    try {
      await this.redis.publish(this.channel, JSON.stringify(event))
    } catch (err) {
      this.logger.error('JobEventPublisher failed to publish event', {
        error: err instanceof Error ? err.message : String(err),
        eventType: event.type,
        jobName: event.jobName,
      })
    }
  }

  /**
   * Close the Redis connection - a no-op if the connection was injected by
   * the caller (this publisher never closes a connection it doesn't own).
   */
  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    if (this.ownsConnection) {
      // closeRedis() tolerates a "Connection is closed" rejection from
      // quit() instead of letting it become an unhandled rejection - falls
      // back to disconnect() on failure.
      await closeRedis(this.redis, this.logger)
    }
  }
}

export function jobStarted(
  jobId: string,
  jobName: string,
  data?: unknown
): JobEvent {
  return {
    type: 'job:started',
    jobId,
    jobName,
    timestamp: new Date().toISOString(),
    data,
  }
}

export function jobProgress(
  jobId: string,
  jobName: string,
  progress: number,
  data?: unknown
): JobEvent {
  return {
    type: 'job:progress',
    jobId,
    jobName,
    timestamp: new Date().toISOString(),
    progress,
    data,
  }
}

export function jobCompleted(
  jobId: string,
  jobName: string,
  result?: unknown
): JobEvent {
  return {
    type: 'job:completed',
    jobId,
    jobName,
    timestamp: new Date().toISOString(),
    result,
  }
}

export function jobFailed(jobId: string, jobName: string, error: string): JobEvent {
  return {
    type: 'job:failed',
    jobId,
    jobName,
    timestamp: new Date().toISOString(),
    error,
  }
}

export function jobRetrying(
  jobId: string,
  jobName: string,
  error: string
): JobEvent {
  return {
    type: 'job:retrying',
    jobId,
    jobName,
    timestamp: new Date().toISOString(),
    error,
  }
}
