import { contractDisplayName } from './helpers.js'
import type { QueueHttpDeps, QueueStatsEntry, QueueStatsResponse } from './types.js'

/**
 * `GET /v1/queue/stats`.
 *
 * Joins `QueueManager.getStats()` (the real registered queues — source of
 * truth) with `contracts` (UI metadata) BY NAME. A queue with no matching
 * contract is NOT dropped (risk 1 in the design doc) — it's included with
 * fallback metadata (`module` derived the same way `JobConfigStore` derives
 * it for an unconfigured job, `dispatchable: false`) and a warning is
 * logged when a logger was injected.
 *
 * ponytail: no cache here. With N queues this is N sequential awaits inside
 * `QueueManager.getStats()`, each doing up to 6 parallel Redis round-trips
 * (waiting/active/completed/failed/delayed/isPaused via `Queue.getStats()`)
 * — so N×6 round-trips per call. Fine for an admin dashboard's polling
 * cadence; add a short-TTL cache if this endpoint gets hit at higher
 * frequency or queue count grows large.
 */
export async function handleGetStats(deps: QueueHttpDeps): Promise<QueueStatsResponse> {
  const rawStats = await deps.queues.getStats()

  const queues: QueueStatsEntry[] = Object.entries(rawStats).map(([name, s]) => {
    const contract = deps.contracts.get(name)
    if (!contract) {
      deps.logger?.warn(
        'Queue has no matching job contract — showing with fallback metadata',
        { queueName: name }
      )
    }

    return {
      name,
      displayName: contractDisplayName(name, contract),
      module: contract?.module ?? name.split('_')[0] ?? name,
      description: contract?.description ?? '',
      dispatchable: contract?.dispatchable ?? false,
      waiting: s.waiting,
      active: s.active,
      completed: s.completed,
      failed: s.failed,
      delayed: s.delayed,
      paused: s.paused === 1,
    }
  })

  const totals = queues.reduce(
    (acc, q) => ({
      totalWaiting: acc.totalWaiting + q.waiting,
      totalActive: acc.totalActive + q.active,
      totalCompleted: acc.totalCompleted + q.completed,
      totalFailed: acc.totalFailed + q.failed,
      totalDelayed: acc.totalDelayed + q.delayed,
    }),
    { totalWaiting: 0, totalActive: 0, totalCompleted: 0, totalFailed: 0, totalDelayed: 0 }
  )

  return { ...totals, queues }
}
