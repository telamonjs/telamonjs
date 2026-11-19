import {
  assertManualRetry,
  fetchJobsByState,
  getAllQueueNames,
  getCountForState,
  getQueueOrThrow,
  matchJobSearch,
} from './helpers.js'
import {
  QueueHttpError,
  type BulkOperationBody,
  type BulkOperationResponse,
  type GetJobsAllParams,
  type GetJobsParams,
  type JobIdBody,
  type JobInfo,
  type JobState,
  type JobsAllResponse,
  type JobsResponse,
  type QueueHttpDeps,
} from './types.js'

/**
 * ponytail: BullMQ has no cross-queue pagination — every queue is fetched up
 * to this cap before the in-memory merge/sort/paginate in
 * `handleGetJobsAll`/`handleGetHistoryAll`. Don't raise without measuring
 * (it's O(queues × cap) per request).
 */
const MAX_PER_QUEUE_FETCH = 500

/** `GET /v1/queue/jobs?queueName=...&state=...&limit=...` */
export async function handleGetJobs(
  deps: QueueHttpDeps,
  params: GetJobsParams
): Promise<JobsResponse> {
  const { queueName } = params
  if (!queueName) {
    throw new QueueHttpError('Missing required query parameter: queueName', 400)
  }

  const state = params.state ?? 'waiting'
  const limit = params.limit ?? 50
  const queue = getQueueOrThrow(deps, queueName)

  const jobs = await fetchJobsByState(deps, queue, queueName, state, 0, limit - 1)
  return { jobs }
}

/** `GET /v1/queue/jobs/all?status=...&queue=...&limit=...&offset=...&search=...` */
export async function handleGetJobsAll(
  deps: QueueHttpDeps,
  params: GetJobsAllParams
): Promise<JobsAllResponse> {
  const state: JobState = params.status ?? 'waiting'
  const limit = params.limit ?? 100
  const offset = params.offset ?? 0
  const search = params.search
  const hasSearch = Boolean(search && search.trim())

  const allNames = await getAllQueueNames(deps)
  const names = params.queue ? allNames.filter(n => n === params.queue) : allNames
  const perQueueLimit = Math.min(offset + limit, MAX_PER_QUEUE_FETCH)
  const queueSource = deps.queues

  const results = await Promise.all(
    names.map(async name => {
      const queue = queueSource.getQueue(name)
      if (!queue) return { jobs: [] as JobInfo[], count: 0 }
      try {
        const jobs = await fetchJobsByState(deps, queue, name, state, 0, perQueueLimit - 1)
        // Skip the count call when search is active — total falls back to
        // the post-filter length in that case, so the count is unused.
        const count = hasSearch ? 0 : await getCountForState(queue, state)
        return { jobs, count }
      } catch (err) {
        deps.logger?.error(`Error fetching ${state} jobs from ${name}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        return { jobs: [] as JobInfo[], count: 0 }
      }
    })
  )

  let allJobs = results.flatMap(r => r.jobs)
  if (hasSearch) {
    const searchLower = search!.toLowerCase()
    allJobs = allJobs.filter(job => matchJobSearch(job, searchLower))
  }
  allJobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  const total = hasSearch ? allJobs.length : results.reduce((sum, r) => sum + r.count, 0)
  const jobs = allJobs.slice(offset, offset + limit)

  return { jobs, total, ...(hasSearch && { approximate: true }) }
}

/** `POST /v1/queue/jobs/retry` */
export async function handleRetryJob(deps: QueueHttpDeps, body: JobIdBody) {
  const { queueName, jobId } = body
  if (!queueName || !jobId) {
    throw new QueueHttpError('Missing required fields: queueName, jobId', 400)
  }
  const queue = getQueueOrThrow(deps, queueName)
  assertManualRetry(deps, queueName)
  const job = await queue.getJob(jobId)
  if (!job) throw new QueueHttpError(`Job ${jobId} not found`, 404)
  await job.retry()
  return { success: true, message: `Job ${jobId} retried` }
}

/** `POST /v1/queue/jobs/remove` */
export async function handleRemoveJob(deps: QueueHttpDeps, body: JobIdBody) {
  const { queueName, jobId } = body
  if (!queueName || !jobId) {
    throw new QueueHttpError('Missing required fields: queueName, jobId', 400)
  }
  const queue = getQueueOrThrow(deps, queueName)
  const job = await queue.getJob(jobId)
  if (!job) throw new QueueHttpError(`Job ${jobId} not found`, 404)
  await job.remove()
  return { success: true, message: `Job ${jobId} removed` }
}

/** `POST /v1/queue/jobs/promote` */
export async function handlePromoteJob(deps: QueueHttpDeps, body: JobIdBody) {
  const { queueName, jobId } = body
  if (!queueName || !jobId) {
    throw new QueueHttpError('Missing required fields: queueName, jobId', 400)
  }
  const queue = getQueueOrThrow(deps, queueName)
  const job = await queue.getJob(jobId)
  if (!job) throw new QueueHttpError(`Job ${jobId} not found`, 404)
  await job.promote()
  return { success: true, message: `Job ${jobId} promoted` }
}

/** `POST /v1/queue/jobs/bulk` */
export async function handleBulkOperation(
  deps: QueueHttpDeps,
  body: BulkOperationBody
): Promise<BulkOperationResponse> {
  const { queueName, jobIds, operation } = body
  if (!queueName || !jobIds || !operation) {
    throw new QueueHttpError('Missing required fields: queueName, jobIds, operation', 400)
  }
  const queue = getQueueOrThrow(deps, queueName)
  if (operation === 'retry') assertManualRetry(deps, queueName)

  const results = await Promise.allSettled(
    jobIds.map(async jobId => {
      const job = await queue.getJob(jobId)
      if (!job) throw new Error(`Job ${jobId} not found`)
      if (operation === 'retry') {
        await job.retry()
      } else {
        await job.remove()
      }
    })
  )

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
  const failed = errors.length
  const processed = results.length - failed

  return { success: failed === 0, processed, failed, ...(errors.length > 0 && { errors }) }
}
