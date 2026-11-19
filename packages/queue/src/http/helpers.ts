/**
 * Internal helpers shared by the http/*.ts handlers. Not part of the public
 * `./http` surface (not re-exported from index.ts).
 */
import type { Job as BullJob, Queue as BullQueue } from 'bullmq'
import { QueueHttpError, type JobInfo, type JobState, type QueueHttpDeps } from './types.js'

export function getQueueOrThrow(deps: QueueHttpDeps, queueName: string): BullQueue {
  const queue = deps.queues.getQueue(queueName)
  if (!queue) {
    throw new QueueHttpError(`Unknown queue: ${queueName}`, 404)
  }
  return queue
}

/**
 * All queue names the `QueueSource` currently knows about. Used as the
 * source of truth for `'*'`-target actions and the `jobs/all`/`history/all`
 * aggregations, instead of `contracts.getAll()` — a queue with no matching
 * job contract must still be actionable (risk 1 in the design doc), not
 * silently skipped because it lacks UI metadata.
 */
export async function getAllQueueNames(deps: QueueHttpDeps): Promise<string[]> {
  return Object.keys(await deps.queues.getStats())
}

export function isValidJob(job: BullJob | undefined | null): job is BullJob {
  return Boolean(job && job.id)
}

export function toJobInfo(
  job: BullJob,
  queueName: string,
  status: JobState | string
): JobInfo {
  return {
    id: job.id ?? '',
    name: job.name,
    queueName,
    data: (job.data ?? {}) as Record<string, unknown>,
    opts: job.opts as Record<string, unknown> | undefined,
    progress: typeof job.progress === 'number' ? job.progress : 0,
    attemptsMade: job.attemptsMade ?? 0,
    attemptsMax: job.opts?.attempts ?? 0,
    failedReason: job.failedReason,
    // bullmq >=5.8x types stacktrace as string[] | null; our DTO uses undefined
    stacktrace: job.stacktrace ?? undefined,
    returnvalue: job.returnvalue,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    delay: job.delay,
    status,
  }
}

/**
 * Fetch one state's jobs from a queue with native BullMQ pagination
 * (`Queue.getJobs([state], start, end)` — see `core/Queue.ts`) and prune
 * orphan sorted-set entries (job ID present, job hash gone).
 *
 * BullMQ ≥5.x skips hash-less ids inside its `getJobs` Lua script, so orphans
 * never reach us — but they still inflate `get*Count()` (ZCARD), which is how
 * the UI ends up with "44 failed" and an empty list. A short page is the only
 * visible symptom, so that's when we pay for the id diff.
 *
 * ponytail: BullMQ has no cross-queue pagination — every caller of this
 * (jobs/all, history/all) fetches a per-queue window capped at
 * `MAX_PER_QUEUE_FETCH` and merges/sorts/paginates in memory. Don't raise
 * the cap without measuring; it's O(queues × cap) per request.
 */
export async function fetchJobsByState(
  deps: QueueHttpDeps,
  queue: BullQueue,
  queueName: string,
  state: JobState,
  start: number,
  end: number
): Promise<JobInfo[]> {
  const rawJobs = await queue.getJobs([state], start, end)
  const validJobs = rawJobs.filter(isValidJob)

  if (validJobs.length < end - start + 1 && ZSET_STATES.has(state)) {
    pruneOrphans(deps, queue, queueName, state, start, end, validJobs).catch(() => {})
  }

  return validJobs.map(job => toJobInfo(job, queueName, state))
}

/** States stored as sorted sets — the only ones where an exact ZREM is safe. */
const ZSET_STATES = new Set<JobState>(['completed', 'failed', 'delayed'])

/**
 * Atomic "ZREM the ids whose job hash is gone". Checked inside Lua so a job
 * added between `getJobs` and here (hash is written before the ZADD) is
 * never touched. BullMQ's client abstraction has no EXISTS/ZREM, only
 * defineCommand/runCommand.
 */
const PRUNE_ORPHANS_CMD = 'telamonjsPruneOrphans'
const PRUNE_ORPHANS_LUA = `
local removed = 0
for i = 2, #ARGV do
  if redis.call('EXISTS', ARGV[1] .. ARGV[i]) == 0 then
    removed = removed + redis.call('ZREM', KEYS[1], ARGV[i])
  end
end
return removed`
const clientsWithPruneCmd = new WeakSet<object>()

/** Best-effort: prune orphans in `[start, end]` when the page came back short. */
async function pruneOrphans(
  deps: QueueHttpDeps,
  queue: BullQueue,
  queueName: string,
  state: JobState,
  start: number,
  end: number,
  validJobs: BullJob[]
): Promise<void> {
  const count = await getCountForState(queue, state)
  if (validJobs.length >= Math.min(end + 1, count) - start) return

  const seen = new Set(validJobs.map(job => job.id))
  const candidates = (await queue.getRanges([state], start, end)).filter(id => !seen.has(id))
  if (candidates.length === 0) return

  const client = await queue.client
  if (!clientsWithPruneCmd.has(client)) {
    client.defineCommand(PRUNE_ORPHANS_CMD, { numberOfKeys: 1, lua: PRUNE_ORPHANS_LUA })
    clientsWithPruneCmd.add(client)
  }
  const removed = await client.runCommand(PRUNE_ORPHANS_CMD, [
    queue.toKey(state),
    queue.toKey(''),
    ...candidates,
  ])
  if (removed > 0) {
    deps.logger?.warn(`${queueName}:${state} had orphan entries, removed`, { orphanCount: removed })
  }
}

const COUNT_METHOD_BY_STATE = {
  waiting: 'getWaitingCount',
  active: 'getActiveCount',
  delayed: 'getDelayedCount',
  completed: 'getCompletedCount',
  failed: 'getFailedCount',
} as const

export async function getCountForState(queue: BullQueue, state: JobState): Promise<number> {
  return queue[COUNT_METHOD_BY_STATE[state]]()
}

/**
 * Search job fields without JSON.stringify (avoids serializing entire
 * job.data). Ported from the reference `matchJobSearch`, adapted to search
 * the already-mapped `JobInfo` shape (no `queueDisplayName` — not part of
 * the UI's `JobInfo` contract).
 */
export function matchJobSearch(job: JobInfo, searchLower: string): boolean {
  if (job.id.toLowerCase().includes(searchLower)) return true
  if (job.name?.toLowerCase().includes(searchLower)) return true
  if (job.queueName.toLowerCase().includes(searchLower)) return true
  if (job.failedReason?.toLowerCase().includes(searchLower)) return true

  if (job.data && typeof job.data === 'object') {
    for (const value of Object.values(job.data)) {
      if (typeof value === 'string' && value.toLowerCase().includes(searchLower)) {
        return true
      }
      if (typeof value === 'number' && String(value).includes(searchLower)) {
        return true
      }
    }
  }

  return false
}

export function parseUpdatedByUser(
  updatedBy?: string | null
): { name: string | null; email: string } | null {
  if (!updatedBy) return null
  const parts = updatedBy.split(' - ')
  if (parts.length >= 2) {
    return { name: parts.slice(1).join(' - '), email: parts[0] }
  }
  return null
}

/** 409 when the queue's contract opts out of manual retry (`manualRetry: false`). */
export function assertManualRetry(deps: QueueHttpDeps, queueName: string): void {
  if (deps.contracts.get(queueName)?.manualRetry === false) {
    throw new QueueHttpError(
      `Manual retry is disabled for ${queueName}: its retries are handled by the job itself`,
      409
    )
  }
}
