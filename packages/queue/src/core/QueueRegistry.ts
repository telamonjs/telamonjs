import { Queue } from 'bullmq'
import { Redis as IORedis } from 'ioredis'
import type { RedisConfig, JobOptions } from './types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'

/**
 * QueueRegistry configuration
 */
export interface QueueRegistryConfig {
  /**
   * Redis connection config
   */
  redis: RedisConfig

  /**
   * Queue name prefix
   * @default 'telamonjs'
   */
  prefix?: string

  /**
   * Default job options applied to every queue created by this registry
   */
  defaultJobOptions?: JobOptions

  /**
   * Logger instance
   * @default NoOpLogger
   */
  logger?: ILogger
}

/**
 * Registry statistics
 */
export interface QueueRegistryStats {
  totalQueues: number
  queueNames: string[]
  hasSharedConnection: boolean
  isShuttingDown: boolean
}

/**
 * Queue Registry - reuses BullMQ Queue instances over a single shared
 * Redis connection instead of creating a new connection per queue/request.
 *
 * Ported from a large consumer app where the
 * lack of this pattern caused ~1,980 Redis connections/hour: a scheduler
 * was creating 33 new Queue instances every 60s, and API endpoints were
 * creating temporary Queues per request.
 *
 * The app instantiates its own singleton:
 * ```ts
 * export const queueRegistry = new QueueRegistry({ redis: { ... } })
 * ```
 */
export class QueueRegistry {
  private queues: Map<string, Queue> = new Map()
  private sharedConnection: IORedis | null = null
  private isShuttingDown = false
  private readonly logger: ILogger
  private readonly redisConfig: RedisConfig
  private readonly prefix: string
  private readonly defaultJobOptions?: JobOptions

  constructor(config: QueueRegistryConfig) {
    this.redisConfig = config.redis
    this.prefix = config.prefix ?? 'telamonjs'
    this.defaultJobOptions = config.defaultJobOptions
    this.logger = config.logger ?? new NoOpLogger()
  }

  /**
   * Get or create a Queue instance for a job name.
   * All queues share the same lazily-created Redis connection.
   */
  getQueue(jobName: string): Queue {
    if (this.isShuttingDown) {
      throw new Error(
        'QueueRegistry is shutting down, cannot create new queues'
      )
    }

    if (!this.queues.has(jobName)) {
      if (!this.sharedConnection) {
        this.sharedConnection = new IORedis({
          ...this.redisConfig,
          // Required for BullMQ blocking connections
          maxRetriesPerRequest: null,
          enableReadyCheck: this.redisConfig.enableReadyCheck ?? true,
          enableOfflineQueue: this.redisConfig.enableOfflineQueue ?? true,
          connectTimeout: 10000,
          keepAlive: 30000,
          lazyConnect: false,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 100, 3000)
            this.logger.debug('QueueRegistry Redis retry attempt', {
              attempt: times,
              delayMs: delay,
            })
            return delay
          },
          reconnectOnError: (err: Error) => {
            if (
              err.message.includes('READONLY') ||
              err.message.includes('ECONNRESET')
            ) {
              this.logger.warn('QueueRegistry reconnecting due to error', {
                error: err.message,
              })
              return true
            }
            return false
          },
        })

        this.sharedConnection.on('connect', () => {
          this.logger.debug('QueueRegistry Redis connected')
        })
        this.sharedConnection.on('error', err => {
          this.logger.error('QueueRegistry Redis error', {
            error: err.message,
          })
        })
        this.sharedConnection.on('reconnecting', (ms: number) => {
          this.logger.debug('QueueRegistry Redis reconnecting', {
            delayMs: ms,
          })
        })

        this.logger.debug('QueueRegistry created shared Redis connection')
      }

      const queue = new Queue(jobName, {
        connection: this.sharedConnection,
        prefix: this.prefix,
        defaultJobOptions: this.defaultJobOptions as never,
      })

      this.queues.set(jobName, queue)
      this.logger.debug('QueueRegistry created Queue instance', {
        jobName,
        total: this.queues.size,
      })
    }

    return this.queues.get(jobName)!
  }

  /**
   * Get Queue instances for multiple job names.
   */
  getQueues(jobNames: string[]): Queue[] {
    return jobNames.map(name => this.getQueue(name))
  }

  /**
   * Get all registered Queue instances as [jobName, queue] tuples.
   */
  getAllQueues(): Array<[string, Queue]> {
    return Array.from(this.queues.entries())
  }

  /**
   * Get registry statistics.
   */
  getStats(): QueueRegistryStats {
    return {
      totalQueues: this.queues.size,
      queueNames: Array.from(this.queues.keys()),
      hasSharedConnection: !!this.sharedConnection,
      isShuttingDown: this.isShuttingDown,
    }
  }

  /**
   * Graceful shutdown: close all queues and the shared Redis connection.
   * Idempotent and best-effort - a single queue failing to close does not
   * stop the rest from being released.
   */
  async close(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.debug('QueueRegistry already shutting down, skipping')
      return
    }

    this.isShuttingDown = true
    this.logger.debug('QueueRegistry closing queue instances', {
      count: this.queues.size,
    })

    await Promise.all(
      Array.from(this.queues.values()).map(async queue => {
        try {
          await queue.close()
        } catch (err) {
          this.logger.error('QueueRegistry error closing queue', {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      })
    )

    this.queues.clear()

    if (this.sharedConnection) {
      try {
        await this.sharedConnection.quit()
      } catch (err) {
        this.logger.error(
          'QueueRegistry error closing shared Redis connection',
          { error: err instanceof Error ? err.message : String(err) }
        )
      }
      this.sharedConnection = null
    }

    this.logger.debug('QueueRegistry shutdown complete')
  }
}
