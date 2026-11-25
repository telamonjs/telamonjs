import {
  fetchJobsByState,
  getAllQueueNames,
  matchJobSearch,
  MAX_PER_QUEUE_FETCH,
  parseJobState,
  parseListQuery,
} from './helpers.js'
import {
  QueueHttpError,
  type GetHistoryAllParams,
  type GetHistoryParams,
  type HistoryAllResponse,
  type HistoryResponse,
  type HistoryStats,
  type JobInfo,
  type QueueHttpDeps,
} from './types.js'

const HISTORY_STATES = ['completed', 'failed'] as const

/** `GET /v1/queue/history?queueName=...&limit=...` — one queue's completed+failed jobs. */
export async function handleGetHistory(
  deps: QueueHttpDeps,
  params: GetHistoryParams
): Promise<HistoryResponse> {
  const { queueName } = params
  if (!queueName) {
    throw new QueueHttpError('Missing required query parameter: queueName', 400)
  }
  const { limit } = parseListQuery(params, 50)
  const queue = deps.queues.getQueue(queueName)
  if (!queue) throw new QueueHttpError(`Unknown queue: ${queueName}`, 404)

  const [completed, failed] = await Promise.all([
    fetchJobsByState(deps, queue, queueName, 'completed', 0, limit - 1),
    fetchJobsByState(deps, queue, queueName, 'failed', 0, limit - 1),
  ])

  const jobs = [...completed, ...failed]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit)

  return { jobs }
}

/**
 * `GET /v1/queue/history/all?statuses=...&queue=...&limit=...&offset=...&search=...&startDate=...&endDate=...`
 *
 * `stats` reflects the SAME filters as `jobs` — when search/date filters are
 * active, counts come from the filtered in-memory set (not the global
 * per-queue counts), so badges match what the list shows.
 */
export async function handleGetHistoryAll(
  deps: QueueHttpDeps,
  params: GetHistoryAllParams
): Promise<HistoryAllResponse> {
  if (params.startDate && isNaN(Date.parse(params.startDate))) {
    throw new QueueHttpError('startDate inválido: use ISO 8601', 400)
  }
  if (params.endDate && isNaN(Date.parse(params.endDate))) {
    throw new QueueHttpError('endDate inválido: use ISO 8601', 400)
  }

  const statusList = (params.statuses ?? 'completed,failed')
    .split(',')
    .map(s => parseJobState(s.trim(), 'completed', HISTORY_STATES))
  const { limit, offset } = parseListQuery(params, 100)
  const search = params.search
  const hasSearch = Boolean(search && search.trim())
  const hasDateFilter = Boolean(params.startDate || params.endDate)

  const allNames = await getAllQueueNames(deps)
  const names = params.queue ? allNames.filter(n => n === params.queue) : allNames
  const perQueueLimit = Math.min(offset + limit, MAX_PER_QUEUE_FETCH)
  const queueSource = deps.queues

  const results = await Promise.all(
    names.map(async name => {
      const queue = queueSource.getQueue(name)
      if (!queue) return { jobs: [] as JobInfo[], completedCount: 0, failedCount: 0 }
      try {
        const jobsByStatus = await Promise.all(
          statusList.map(s => fetchJobsByState(deps, queue, name, s, 0, perQueueLimit - 1))
        )
        const [completedCount, failedCount] = await Promise.all([
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ])
        return { jobs: jobsByStatus.flat(), completedCount, failedCount }
      } catch (err) {
        deps.logger?.error(`Error fetching history from ${name}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        return { jobs: [] as JobInfo[], completedCount: 0, failedCount: 0 }
      }
    })
  )

  let allJobs = results.flatMap(r => r.jobs)
  const globalStats: HistoryStats = results.reduce(
    (acc, r) => ({
      completed: (acc.completed ?? 0) + r.completedCount,
      failed: (acc.failed ?? 0) + r.failedCount,
    }),
    { completed: 0, failed: 0 }
  )

  if (hasSearch) {
    const searchLower = search!.toLowerCase()
    allJobs = allJobs.filter(job => matchJobSearch(job, searchLower))
  }

  if (hasDateFilter) {
    // ponytail: date filter applied in-memory over the already-fetched
    // window; index by score in Redis if exactness on large queues matters.
    const startMs = params.startDate ? new Date(params.startDate).getTime() : undefined
    const endMs = params.endDate ? new Date(params.endDate).getTime() : undefined
    allJobs = allJobs.filter(job => {
      const ts = job.finishedOn ?? job.timestamp
      if (startMs !== undefined && ts < startMs) return false
      if (endMs !== undefined && ts > endMs) return false
      return true
    })
  }

  allJobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  const hasFilters = hasSearch || hasDateFilter
  const stats: HistoryStats = hasFilters
    ? allJobs.reduce<HistoryStats>(
        (acc, job) => {
          if (job.status === 'completed') acc.completed = (acc.completed ?? 0) + 1
          else if (job.status === 'failed') acc.failed = (acc.failed ?? 0) + 1
          return acc
        },
        { completed: 0, failed: 0 }
      )
    : globalStats

  const total = hasFilters
    ? allJobs.length
    : statusList.reduce(
        (sum, s) => sum + (s === 'completed' ? (globalStats.completed ?? 0) : (globalStats.failed ?? 0)),
        0
      )

  const jobs = allJobs.slice(offset, offset + limit)

  return { jobs, total, stats, ...(hasFilters && { approximate: true }) }
}
