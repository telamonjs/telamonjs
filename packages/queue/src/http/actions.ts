import { assertManualRetry, getAllQueueNames, getQueueOrThrow } from './helpers.js'
import {
  QueueHttpError,
  type ActionResponse,
  type PerformActionBody,
  type QueueActionType,
  type QueueHttpDeps,
} from './types.js'

const CLEAN_ALL_GRACE_MS = 0
const CLEAN_ALL_LIMIT = 5000
const CLEAN_ONE_GRACE_MS = 60 * 60 * 1000
const CLEAN_ONE_LIMIT = 1000
const RETRY_ALL_LIMIT = 1000

/**
 * `POST /v1/queue/actions` — pause/resume/clean/retry-all/drain/obliterate a
 * single queue, or `queueName: '*'` for `clean` across every registered
 * queue (the only action allowed with `'*'` — the rest are too destructive
 * to expose system-wide).
 */
export async function handlePerformAction(
  deps: QueueHttpDeps,
  body: PerformActionBody
): Promise<ActionResponse> {
  const { queueName, action, status } = body
  if (!queueName || !action) {
    throw new QueueHttpError('Missing required fields: queueName, action', 400)
  }

  if (queueName === '*') {
    return performActionOnAllQueues(deps, action, status)
  }

  const queue = getQueueOrThrow(deps, queueName)

  switch (action) {
    case 'pause':
      await queue.pause()
      return { success: true, message: `Queue ${queueName} paused` }

    case 'resume':
      await queue.resume()
      return { success: true, message: `Queue ${queueName} resumed` }

    case 'clean': {
      const statuses: Array<'completed' | 'failed'> = status
        ? [status]
        : ['completed', 'failed']
      const removedIds = await Promise.all(
        statuses.map(s => queue.clean(CLEAN_ONE_GRACE_MS, CLEAN_ONE_LIMIT, s))
      )
      const removed = removedIds.reduce((sum, ids) => sum + ids.length, 0)
      return {
        success: true,
        message: `Queue ${queueName} cleaned`,
        removed,
        byQueue: { [queueName]: removed },
      }
    }

    case 'retry-all': {
      assertManualRetry(deps, queueName)
      const failedJobs = await queue.getJobs(['failed'], 0, RETRY_ALL_LIMIT - 1)
      const validJobs = failedJobs.filter(j => j && j.id)
      let retried = 0
      for (const job of validJobs) {
        try {
          await job.retry()
          retried++
        } catch {
          // Job may have been removed or already retried — skip.
        }
      }
      return {
        success: true,
        message: `Queue ${queueName}: ${retried}/${validJobs.length} failed jobs retried`,
      }
    }

    case 'drain': {
      // Only waiting jobs. Delayed stays: in a cron queue it holds the next
      // scheduler iteration, and removing it stalls the cron silently.
      const removed = await queue.getWaitingCount()
      await queue.drain(false)
      return { success: true, message: `Queue ${queueName}: ${removed} waiting jobs removed`, removed }
    }

    case 'obliterate':
      await queue.obliterate({ force: true })
      return { success: true, message: `Queue ${queueName} obliterated` }

    default:
      throw new QueueHttpError(`Unknown action: ${String(action)}`, 400)
  }
}

async function performActionOnAllQueues(
  deps: QueueHttpDeps,
  action: QueueActionType,
  status?: 'completed' | 'failed'
): Promise<ActionResponse> {
  if (action !== 'clean') {
    throw new QueueHttpError(
      `Action '${action}' is not supported for all queues ('*'); only 'clean' is allowed`,
      400
    )
  }

  const names = await getAllQueueNames(deps)
  const queueSource = deps.queues
  const statuses: Array<'completed' | 'failed'> = status ? [status] : ['completed', 'failed']
  const byQueue: Record<string, number> = {}
  const errors: string[] = []

  await Promise.all(
    names.map(async name => {
      try {
        const queue = queueSource.getQueue(name)
        if (!queue) return
        const removedIds = await Promise.all(
          statuses.map(s => queue.clean(CLEAN_ALL_GRACE_MS, CLEAN_ALL_LIMIT, s))
        )
        const count = removedIds.reduce((sum, ids) => sum + ids.length, 0)
        if (count > 0) byQueue[name] = count
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        deps.logger?.error(`Error cleaning queue ${name}`, { error: message })
        errors.push(`${name}: ${message}`)
      }
    })
  )

  const removed = Object.values(byQueue).reduce((sum, n) => sum + n, 0)
  const allFailed = errors.length > 0 && errors.length === names.length

  return {
    success: !allFailed,
    message:
      errors.length > 0
        ? `Cleaned ${removed} jobs across ${names.length} queues (${errors.length} falharam)`
        : `Cleaned ${removed} jobs across ${names.length} queues`,
    removed,
    byQueue,
    ...(errors.length > 0 && { errors }),
  }
}
