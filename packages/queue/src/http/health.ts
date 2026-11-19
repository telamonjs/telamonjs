import type { Queue as BullQueue } from 'bullmq'
import { getAllQueueNames, getQueueOrThrow } from './helpers.js'
import type {
  FailureGroup,
  FailureGroupsResponse,
  QueueHealthEntry,
  QueueHealthResponse,
  QueueHealthStatus,
  QueueHttpDeps,
} from './types.js'

/** A scheduler iteration overdue by more than this = no worker is picking it up. */
const LATE_GRACE_MS = 60_000
const WINDOW_MS = 60 * 60 * 1000
/** Failed jobs scanned to build failure groups (newest first). */
const FAILURE_SCAN_LIMIT = 500
const FAILURE_GROUP_JOB_IDS = 200

/**
 * Last finish time + finishes since `ARGV[1]` for the completed and failed
 * sets, in one round-trip. Both sets are scored by `finishedOn`, so this is
 * exact within the queue's retention (`removeOnComplete`/`removeOnFail`).
 */
const FINISH_STATS_CMD = 'telamonjsFinishStats'
const FINISH_STATS_LUA = `
local out = {}
for i = 1, 2 do
  local last = redis.call('ZREVRANGE', KEYS[i], 0, 0, 'WITHSCORES')
  out[#out + 1] = last[2] or '0'
  out[#out + 1] = redis.call('ZCOUNT', KEYS[i], ARGV[1], '+inf')
end
return out`
const clientsWithFinishCmd = new WeakSet<object>()

async function finishStats(queue: BullQueue, since: number) {
  const client = await queue.client
  if (!clientsWithFinishCmd.has(client)) {
    client.defineCommand(FINISH_STATS_CMD, { numberOfKeys: 2, lua: FINISH_STATS_LUA })
    clientsWithFinishCmd.add(client)
  }
  const [lastCompleted, completed, lastFailed, failed] = (await client.runCommand(FINISH_STATS_CMD, [
    queue.toKey('completed'),
    queue.toKey('failed'),
    since,
  ])) as Array<string | number>
  return {
    lastCompletedAt: Number(lastCompleted) || null,
    completedLastHour: Number(completed),
    lastFailedAt: Number(lastFailed) || null,
    failedLastHour: Number(failed),
  }
}

/**
 * Status precedence: paused > late > failing > ok.
 * - late: a scheduler's next iteration is overdue (workers down/stuck).
 * - failing: something failed in the window and the latest outcome is a failure.
 */
export function deriveHealthStatus(
  e: Pick<QueueHealthEntry, 'paused' | 'nextRunAt' | 'lastCompletedAt' | 'lastFailedAt' | 'failedLastHour'>,
  now: number
): QueueHealthStatus {
  if (e.paused) return 'paused'
  if (e.nextRunAt !== null && e.nextRunAt < now - LATE_GRACE_MS) return 'late'
  if (e.failedLastHour > 0 && (e.lastFailedAt ?? 0) > (e.lastCompletedAt ?? 0)) return 'failing'
  return 'ok'
}

async function queueHealth(deps: QueueHttpDeps, name: string, now: number): Promise<QueueHealthEntry> {
  const queue = getQueueOrThrow(deps, name)
  const contract = deps.contracts.get(name)
  const [paused, schedulers, waiting, active, stats] = await Promise.all([
    queue.isPaused(),
    queue.getJobSchedulers(0, -1),
    queue.getWaitingCount(),
    queue.getActiveCount(),
    finishStats(queue, now - WINDOW_MS),
  ])
  const nexts = schedulers.map(s => s.next).filter((n): n is number => typeof n === 'number')
  const scheduler = schedulers[0]

  const entry = {
    name,
    displayName: contract?.description || name,
    module: contract?.module ?? name.split('_')[0] ?? name,
    dispatchable: contract?.dispatchable ?? false,
    manualRetry: contract?.manualRetry ?? true,
    paused,
    schedule: scheduler ? (scheduler.pattern ?? (scheduler.every ? `every ${scheduler.every}ms` : null)) : null,
    nextRunAt: nexts.length > 0 ? Math.min(...nexts) : null,
    waiting,
    active,
    ...stats,
  }
  return { ...entry, status: deriveHealthStatus(entry, now) }
}

/**
 * `GET /v1/queue/health` — per-queue answer to "is it running?": last
 * success, next scheduled run, throughput and failures in the last hour, and
 * a derived status. Complements `stats` (raw counts, which are capped by
 * retention and say little about health).
 */
export async function handleGetHealth(deps: QueueHttpDeps): Promise<QueueHealthResponse> {
  const now = Date.now()
  const names = await getAllQueueNames(deps)
  const queues = await Promise.all(
    names.map(name =>
      queueHealth(deps, name, now).catch(err => {
        deps.logger?.error(`Error reading health of ${name}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        return null
      })
    )
  )
  return { generatedAt: now, queues: queues.filter((q): q is QueueHealthEntry => q !== null) }
}

/**
 * Collapses the parts of an error message that vary per occurrence (ids,
 * numbers, quoted values) so identical failures group together. First line
 * only — Prisma and friends put the useful bit there. Backticks are kept:
 * they hold code (`prisma.$queryRaw()`), which is what tells groups apart.
 */
export function normalizeFailureReason(reason: string | undefined): string {
  const firstLine =
    (reason ?? '')
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0) ?? ''
  return (
    firstLine
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
      .replace(/(["']).*?\1/g, '$1…$1')
      .replace(/\d+/g, '#')
      .slice(0, 200) || '(sem mensagem)'
  )
}

/**
 * `GET /v1/queue/failures?queueName=` — failed jobs grouped by normalized
 * reason, newest group first. `jobIds` feed the existing bulk endpoint
 * (retry/remove a whole group).
 *
 * ponytail: scans the newest `FAILURE_SCAN_LIMIT` failed jobs only; groups
 * are exact for queues below that, a sample above it (`scanned` < `total`).
 */
export async function handleGetFailureGroups(
  deps: QueueHttpDeps,
  params: { queueName: string }
): Promise<FailureGroupsResponse> {
  const queue = getQueueOrThrow(deps, params.queueName)
  const [jobs, total] = await Promise.all([
    queue.getJobs(['failed'], 0, FAILURE_SCAN_LIMIT - 1),
    queue.getFailedCount(),
  ])

  const groups = new Map<string, FailureGroup>()
  for (const job of jobs) {
    if (!job?.id) continue
    const key = normalizeFailureReason(job.failedReason)
    const at = job.finishedOn ?? job.timestamp
    const g = groups.get(key)
    if (!g) {
      groups.set(key, {
        reason: key,
        sample: job.failedReason ?? '',
        count: 1,
        firstAt: at,
        lastAt: at,
        jobIds: [job.id],
      })
      continue
    }
    g.count++
    g.firstAt = Math.min(g.firstAt, at)
    if (at > g.lastAt) {
      g.lastAt = at
      g.sample = job.failedReason ?? g.sample
    }
    if (g.jobIds.length < FAILURE_GROUP_JOB_IDS) g.jobIds.push(job.id)
  }

  return {
    queueName: params.queueName,
    manualRetry: deps.contracts.get(params.queueName)?.manualRetry ?? true,
    total,
    scanned: jobs.length,
    groups: [...groups.values()].sort((a, b) => b.lastAt - a.lastAt),
  }
}

/**
 * Prometheus text exposition of `handleGetHealth` — no prom-client: these
 * are point-in-time gauges recomputed per scrape. The host app serves it
 * behind its own auth (e.g. an internal token), not the dashboard guard.
 */
export function renderHealthMetrics(health: QueueHealthResponse): string {
  const gauges: Array<[string, string, (q: QueueHealthEntry) => number | null]> = [
    ['queue_health_late', '1 when a scheduled iteration is overdue', q => (q.status === 'late' ? 1 : 0)],
    ['queue_health_failing', '1 when the latest outcome in the last hour is a failure', q => (q.status === 'failing' ? 1 : 0)],
    ['queue_health_paused', '1 when the queue is paused', q => (q.paused ? 1 : 0)],
    ['queue_last_completed_timestamp_seconds', 'Finish time of the newest completed job', q => (q.lastCompletedAt ? q.lastCompletedAt / 1000 : null)],
    ['queue_completed_last_hour', 'Jobs completed in the last hour', q => q.completedLastHour],
    ['queue_failed_last_hour', 'Jobs failed in the last hour', q => q.failedLastHour],
    ['queue_waiting', 'Jobs waiting', q => q.waiting],
    ['queue_active', 'Jobs active', q => q.active],
  ]
  const lines: string[] = []
  for (const [name, help, value] of gauges) {
    lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`)
    for (const q of health.queues) {
      const v = value(q)
      if (v !== null) lines.push(`${name}{queue="${q.name}",module="${q.module}"} ${v}`)
    }
  }
  return lines.join('\n') + '\n'
}
