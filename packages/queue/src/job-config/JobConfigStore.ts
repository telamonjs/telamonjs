import { Redis as IORedis } from 'ioredis'
import type { RedisConfig } from '../core/types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { JobConfig, JobConfigInput, ConfigHistoryEntry } from './types.js'
import { closeRedis } from '../utils/redis.js'

export interface JobConfigStoreOptions {
  /**
   * Redis connection config, or an already-connected ioredis instance to
   * share (e.g. the connection a QueueRegistry already holds).
   */
  redis: RedisConfig | IORedis

  /**
   * Key prefix. Layout is `${keyPrefix}{jobName}` (HASH),
   * `${keyPrefix}__index__` (SET), `${keyPrefix}{jobName}:history` (LIST).
   *
   * CRITICAL: identical layout to the original consumer-app redis adapter
   * so the same Redis data is readable with zero migration.
   *
   * @default 'telamonjs:config:'
   */
  keyPrefix?: string

  /**
   * Max history entries kept per job (LTRIM applied on every write).
   * @default 50
   */
  historyLimit?: number

  /**
   * Timezone used for new configs when neither the caller nor a bootstrap
   * default specifies one.
   * @default 'UTC'
   */
  defaultTimezone?: string

  logger?: ILogger
}

export interface BootstrapResult {
  added: number
  restored: number
  orphaned: number
  backfilled: number
}

/** Fields backfilled from bootstrap defaults when absent/null in Redis. */
const BACKFILLABLE_FIELDS: ReadonlyArray<
  [keyof JobConfigInput, keyof JobConfig]
> = [
  ['description', 'description'],
  ['cronPattern', 'cronPattern'],
  ['timezone', 'timezone'],
  ['priority', 'priority'],
  ['concurrency', 'concurrency'],
  ['timeout', 'timeout'],
]

/**
 * Redis-backed store for job configuration (enabled/disabled, cron pattern,
 * priority, concurrency, timeout) with change history.
 *
 * Ported from a consumer-app redis adapter. Keeps the
 * exact same Redis key layout so an app switching to this store reads its
 * existing job config data with zero migration.
 */
export class JobConfigStore {
  private readonly redis: IORedis
  private readonly ownsConnection: boolean
  private readonly keyPrefix: string
  private readonly indexKey: string
  private readonly historyLimit: number
  private readonly defaultTimezone: string
  private readonly logger: ILogger

  constructor(options: JobConfigStoreOptions) {
    this.keyPrefix = options.keyPrefix ?? 'telamonjs:config:'
    this.indexKey = `${this.keyPrefix}__index__`
    this.historyLimit = options.historyLimit ?? 50
    this.defaultTimezone = options.defaultTimezone ?? 'UTC'
    this.logger = options.logger ?? new NoOpLogger()

    if (options.redis instanceof IORedis) {
      this.redis = options.redis
      this.ownsConnection = false
    } else {
      this.redis = new IORedis({
        ...options.redis,
        maxRetriesPerRequest: options.redis.maxRetriesPerRequest ?? 3,
        enableReadyCheck: options.redis.enableReadyCheck ?? true,
        enableOfflineQueue: options.redis.enableOfflineQueue ?? true,
        connectTimeout: 10000,
        keepAlive: 30000,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000)
          this.logger.debug('JobConfigStore Redis retry attempt', {
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
            this.logger.warn('JobConfigStore reconnecting due to error', {
              error: err.message,
            })
            return true
          }
          return false
        },
      })
      this.ownsConnection = true
    }

    // ioredis emits 'error' on connection failures (and on a pending
    // command rejecting when the connection closes mid-flight). With no
    // listener that becomes an unhandled rejection/exception instead of a
    // logged, recoverable event - same requirement as core/Queue.ts and
    // core/DeadLetterQueue.ts. Harmless to attach even on a shared/injected
    // connection (EventEmitter supports multiple listeners).
    this.redis.on('error', (error: Error) => {
      this.logger.error('JobConfigStore Redis connection error', {
        error: error.message,
      })
    })
  }

  private key(jobName: string): string {
    return `${this.keyPrefix}${jobName}`
  }

  private historyKey(jobName: string): string {
    return `${this.key(jobName)}:history`
  }

  private hashToConfig(
    jobName: string,
    hash: Record<string, string>
  ): JobConfig {
    return {
      jobName,
      module: hash.module || jobName.split('_')[0],
      description: hash.description || undefined,
      enabled: hash.enabled === 'true',
      orphan: hash.orphan === 'true',
      cronPattern: hash.cronPattern || undefined,
      timezone: hash.timezone || this.defaultTimezone,
      priority: parseInt(hash.priority || '5', 10),
      concurrency: hash.concurrency ? parseInt(hash.concurrency, 10) : undefined,
      timeout: hash.timeout ? parseInt(hash.timeout, 10) : undefined,
      updatedAt: hash.updatedAt || undefined,
      updatedBy: hash.updatedBy || undefined,
    }
  }

  private configToHash(config: Partial<JobConfig>): Record<string, string> {
    const hash: Record<string, string> = {}
    if (config.module !== undefined) hash.module = config.module
    if (config.description !== undefined) hash.description = config.description
    if (config.enabled !== undefined) hash.enabled = String(config.enabled)
    if (config.orphan !== undefined) hash.orphan = String(config.orphan)
    if (config.cronPattern !== undefined) hash.cronPattern = config.cronPattern
    if (config.timezone !== undefined) hash.timezone = config.timezone
    if (config.priority !== undefined) hash.priority = String(config.priority)
    if (config.concurrency !== undefined)
      hash.concurrency = String(config.concurrency)
    if (config.timeout !== undefined) hash.timeout = String(config.timeout)
    if (config.updatedAt !== undefined) hash.updatedAt = config.updatedAt
    if (config.updatedBy !== undefined) hash.updatedBy = config.updatedBy
    return hash
  }

  // ==========================================================================
  // CRUD
  // ==========================================================================

  async getAll(): Promise<JobConfig[]> {
    const jobNames = await this.redis.smembers(this.indexKey)
    const configs: JobConfig[] = []

    for (const jobName of jobNames) {
      const hash = await this.redis.hgetall(this.key(jobName))
      if (Object.keys(hash).length > 0) {
        configs.push(this.hashToConfig(jobName, hash))
      }
    }

    return configs.sort((a, b) => a.jobName.localeCompare(b.jobName))
  }

  async get(jobName: string): Promise<JobConfig | null> {
    const hash = await this.redis.hgetall(this.key(jobName))
    if (Object.keys(hash).length === 0) return null
    return this.hashToConfig(jobName, hash)
  }

  async set(
    jobName: string,
    partial: Partial<JobConfig>,
    user?: string
  ): Promise<void> {
    const current = await this.get(jobName)
    const isNew = !current
    const now = new Date().toISOString()

    const fullConfig: Partial<JobConfig> = {
      ...partial,
      updatedAt: now,
      updatedBy: user ?? partial.updatedBy,
    }

    await this.redis.hset(this.key(jobName), this.configToHash(fullConfig))
    await this.redis.sadd(this.indexKey, jobName)

    if (user) {
      if (isNew) {
        await this.addHistory(jobName, { action: 'created', by: user, at: now })
      } else {
        for (const [field, value] of Object.entries(partial)) {
          if (field === 'updatedAt' || field === 'updatedBy') continue
          const before = current[field as keyof JobConfig]
          if (before !== value) {
            await this.addHistory(jobName, {
              action: 'updated',
              field,
              before: String(before ?? ''),
              after: String(value ?? ''),
              by: user,
              at: now,
            })
          }
        }
      }
    }
  }

  async toggleEnabled(
    jobName: string,
    enabled: boolean,
    user?: string
  ): Promise<void> {
    const now = new Date().toISOString()

    await this.redis.hset(this.key(jobName), {
      enabled: String(enabled),
      updatedAt: now,
      ...(user ? { updatedBy: user } : {}),
    })

    if (user) {
      await this.addHistory(jobName, {
        action: enabled ? 'enabled' : 'disabled',
        by: user,
        at: now,
      })
    }
  }

  /**
   * Toggle every (non-orphan implicit — see getByModule) job in a module to
   * the same `enabled` value. Skips jobs already at that value, so both the
   * write and the change-history entry only happen for jobs that actually
   * flip — a module-level "enable all" run twice in a row produces zero
   * history noise the second time.
   *
   * @returns the configs that were actually toggled (post-toggle state).
   */
  async toggleModuleJobConfigs(
    moduleName: string,
    enabled: boolean,
    changedBy?: string
  ): Promise<JobConfig[]> {
    const configs = await this.getByModule(moduleName)
    const toToggle = configs.filter(c => c.enabled !== enabled)

    const changed: JobConfig[] = []
    for (const config of toToggle) {
      await this.toggleEnabled(config.jobName, enabled, changedBy)
      // Re-read rather than reconstruct locally - toggleEnabled() sets its
      // own updatedAt/updatedBy server-side, and this keeps the returned
      // config exactly what a caller would get back from get().
      const updated = await this.get(config.jobName)
      if (updated) changed.push(updated)
    }

    return changed
  }

  async delete(jobName: string): Promise<void> {
    await this.redis.del(this.key(jobName))
    await this.redis.del(this.historyKey(jobName))
    await this.redis.srem(this.indexKey, jobName)
  }

  // ==========================================================================
  // Queries
  // ==========================================================================

  async getEnabled(): Promise<JobConfig[]> {
    const all = await this.getAll()
    return all.filter(c => c.enabled && !c.orphan)
  }

  async getEnabledWithCron(): Promise<JobConfig[]> {
    const enabled = await this.getEnabled()
    return enabled.filter(c => c.cronPattern)
  }

  async getByModule(moduleName: string): Promise<JobConfig[]> {
    const all = await this.getAll()
    return all.filter(c => c.module === moduleName)
  }

  // ==========================================================================
  // History
  // ==========================================================================

  async getHistory(jobName: string, limit = 50): Promise<ConfigHistoryEntry[]> {
    const entries = await this.redis.lrange(this.historyKey(jobName), 0, limit - 1)
    return entries.map(e => JSON.parse(e) as ConfigHistoryEntry)
  }

  private async addHistory(
    jobName: string,
    entry: ConfigHistoryEntry
  ): Promise<void> {
    const key = this.historyKey(jobName)
    await this.redis.lpush(key, JSON.stringify(entry))
    await this.redis.ltrim(key, 0, this.historyLimit - 1)
  }

  // ==========================================================================
  // Bootstrap
  // ==========================================================================

  /**
   * Reconcile Redis-stored job configs with the jobs that exist in code.
   *
   * - New job in code, absent in Redis -> created with `defaults[jobName]`.
   * - Job in Redis but no longer in code -> marked `orphan:true, enabled:false`.
   * - Orphan job that reappears in code -> `orphan:false` restored (its
   *   `enabled` value is left untouched - restoring never re-enables a job).
   * - Backfill: for every existing (non-orphan-only) job, any field present
   *   in its `defaults` entry that is absent/null in Redis gets filled in.
   *   A field that already has a value in Redis (a customization made via
   *   an admin UI, for instance) is NEVER overwritten.
   *
   * Idempotent: running it twice with the same code/defaults produces zero
   * counts on the second run.
   */
  async bootstrap(
    codeJobNames: readonly string[],
    defaults?: Record<string, Partial<JobConfigInput>>
  ): Promise<BootstrapResult> {
    const codeJobs = new Set(codeJobNames)
    const existingConfigs = await this.getAll()
    const existingByName = new Map(existingConfigs.map(c => [c.jobName, c]))

    let added = 0
    let restored = 0
    let orphaned = 0
    let backfilled = 0

    for (const jobName of codeJobs) {
      const existing = existingByName.get(jobName)
      const jobDefaults = defaults?.[jobName] ?? {}

      if (!existing) {
        await this.set(jobName, {
          module: jobName.split('_')[0],
          description: jobDefaults.description || `Job ${jobName}`,
          enabled: jobDefaults.enabled ?? false,
          orphan: false,
          cronPattern: jobDefaults.cronPattern ?? undefined,
          timezone: jobDefaults.timezone || this.defaultTimezone,
          priority: jobDefaults.priority ?? 5,
          concurrency: jobDefaults.concurrency ?? undefined,
          timeout: jobDefaults.timeout ?? undefined,
        })
        added++
        continue
      }

      const patch: Partial<JobConfig> = {}
      if (existing.orphan) {
        patch.orphan = false
      }

      let didBackfill = false
      for (const [defaultsKey, configKey] of BACKFILLABLE_FIELDS) {
        const defaultValue = jobDefaults[defaultsKey]
        if (defaultValue === undefined || defaultValue === null) continue
        const currentValue = existing[configKey]
        if (currentValue === undefined || currentValue === null) {
          ;(patch as Record<string, unknown>)[configKey] = defaultValue
          didBackfill = true
        }
      }

      if (Object.keys(patch).length > 0) {
        await this.set(jobName, patch)
      }
      if (existing.orphan) restored++
      if (didBackfill) backfilled++
    }

    for (const config of existingConfigs) {
      if (!codeJobs.has(config.jobName) && !config.orphan) {
        await this.set(config.jobName, { orphan: true, enabled: false })
        orphaned++
      }
    }

    return { added, restored, orphaned, backfilled }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Close the Redis connection - a no-op if the connection was injected by
   * the caller (this store never closes a connection it doesn't own).
   */
  async close(): Promise<void> {
    if (this.ownsConnection) {
      // closeRedis() tolerates a "Connection is closed" rejection from
      // quit() (a command already in flight when the socket drops) instead
      // of letting it become an unhandled rejection - falls back to
      // disconnect() on failure. Same helper QueueManager-adjacent code
      // already relies on.
      await closeRedis(this.redis, this.logger)
    }
  }
}
