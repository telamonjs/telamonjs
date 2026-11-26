'use client'

/**
 * useQueueSSE - Server-Sent Events hook for real-time queue updates
 *
 * Connects to the SSE endpoint and updates React Query cache with:
 * - Stats updates (every ~5s from server)
 * - Job events (real-time: started, completed, failed)
 *
 * Gracefully degrades if adapter doesn't support SSE (no-op).
 */

import { useEffect, useRef, useState, useCallback, type RefObject } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useQueueConfigApi } from '../api/provider'
import type { QueueConfigApiAdapter } from '../api/types'
import { logger } from '../../utils/logger'
import type { SSEStatus, TimelineJob, TimelineData } from '../types'
import { isRepeatJob } from './use-queue-events-timeline'

interface JobEvent {
  type:
    | 'job:started'
    | 'job:completed'
    | 'job:failed'
    | 'job:progress'
    | 'job:retrying'
  jobId: string
  jobName: string
  timestamp: string
  data?: unknown
  progress?: number
  error?: string
  result?: unknown
}

function handleJobEventImpl(
  event: JobEvent,
  queryClient: QueryClient,
  refreshStats: () => void
) {
  const statusMap: Record<string, TimelineJob['status']> = {
    'job:started': 'active',
    'job:completed': 'completed',
    'job:failed': 'failed'
  }
  const jobStatus = statusMap[event.type]
  if (!jobStatus) return // ignore progress/retrying for timeline

  queryClient.setQueryData<TimelineData>(
    ['queue', 'events-timeline'],
    (prev) => {
      if (!prev) return prev

      const ts = new Date(event.timestamp).getTime()
      const existing = prev.jobs.find((j) => j.id === event.jobId)

      if (existing) {
        const updated = prev.jobs.map((j) =>
          j.id === event.jobId
            ? {
                ...j,
                status: jobStatus,
                ...(jobStatus === 'completed' && {
                  finishedOn: ts,
                  returnvalue: event.result
                }),
                ...(jobStatus === 'failed' && {
                  finishedOn: ts,
                  failedReason: event.error
                })
              }
            : j
        )
        return { jobs: updated }
      }

      // New job — insert at top
      const newJob: TimelineJob = {
        id: event.jobId,
        name: event.jobName,
        queueName: event.jobName.split('.')[0] || event.jobName,
        queueDisplayName: event.jobName,
        status: jobStatus,
        timestamp: ts,
        processedOn: jobStatus === 'active' ? ts : undefined,
        finishedOn: jobStatus !== 'active' ? ts : undefined,
        failedReason: event.error,
        returnvalue: event.result,
        repeat: isRepeatJob({ id: event.jobId })
      }

      return { jobs: [newJob, ...prev.jobs].slice(0, 100) }
    }
  )

  // Also refresh queue stats so counts update immediately
  refreshStats()
}

interface SSEConnectionContext {
  enabledRef: RefObject<boolean>
  abortRef: RefObject<AbortController | null>
  reconnectRef: RefObject<ReturnType<typeof setTimeout> | null>
  connectRef: RefObject<() => void>
  configApi: QueueConfigApiAdapter | null
  queryClient: QueryClient
  handleJobEvent: (event: JobEvent) => void
  setStatus: (status: SSEStatus) => void
  setLastEvent: (date: Date) => void
}

// Module-level (not a closure inside the hook): react-compiler's
// set-state-in-effect check treats ANY function reachable from an effect's
// call graph as "in the effect", regardless of whether its setState calls
// sit behind an `await` — a queueMicrotask/ref-indirection workaround just
// hides the same call from that analysis by another route. A plain,
// module-level function is a genuinely separate scope the compiler does not
// trace into (same convention already used for the module-level
// `formatDuration` in TempoRealTab.tsx / JobEventTimeline.tsx, which also
// call impure APIs). The connecting/connected/error/disconnected/reconnecting
// transitions all live here now; the hook's effect only calls `connect()`,
// a thin useCallback wrapper with no setState in its own body.
function scheduleSSEReconnect(ctx: SSEConnectionContext) {
  ctx.reconnectRef.current = setTimeout(() => {
    ctx.setStatus('connecting')
    ctx.connectRef.current()
  }, 5_000)
}

/** Aborts the in-flight connection and cancels any pending reconnect. */
function stopSSE(
  abortRef: RefObject<AbortController | null>,
  reconnectRef: RefObject<ReturnType<typeof setTimeout> | null>
) {
  abortRef.current?.abort()
  if (reconnectRef.current) clearTimeout(reconnectRef.current)
}

async function connectSSE(ctx: SSEConnectionContext): Promise<void> {
  ctx.abortRef.current?.abort()
  if (ctx.reconnectRef.current) clearTimeout(ctx.reconnectRef.current)
  if (!ctx.enabledRef.current) return

  // Check if adapter supports SSE
  if (!ctx.configApi?.getSSEConfig) {
    return
  }

  const controller = new AbortController()
  ctx.abortRef.current = controller
  // No setStatus('connecting') here: the initial/reset value is already
  // 'connecting' by the time this runs (derived at mount, or on the
  // `enabled` render-time comparison in useQueueSSE); a retry sets it from
  // scheduleSSEReconnect's timer callback instead.

  // The server ends every stream after a max age (so its auth guards run
  // again) and announces it with a `reconnect` frame first.
  let plannedEnd = false

  try {
    const { url, token } = await ctx.configApi.getSSEConfig()

    const headers: Record<string, string> = {
      Accept: 'text/event-stream'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(url, {
      headers,
      credentials: 'include',
      signal: controller.signal
    })

    if (!res.ok || !res.body) {
      throw new Error(`SSE: ${res.status} ${res.statusText}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = ''
    let currentData = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          currentData += line.slice(6)
        } else if (line === '') {
          if (currentEvent === 'connected') {
            ctx.setStatus('connected')
          } else if (currentEvent === 'reconnect') {
            plannedEnd = true
          } else if (currentEvent === 'stats' && currentData) {
            try {
              // Skip write while a pause/resume mutation is in flight —
              // its onSettled already invalidates stats when it finishes,
              // so a stale SSE frame here would just cause flicker.
              if (ctx.queryClient.isMutating({ mutationKey: ['queue-action'] }) === 0) {
                const { type: _type, timestamp: _ts, ...stats } =
                  JSON.parse(currentData)
                ctx.queryClient.setQueryData(['queue', 'stats'], stats)
                ctx.setLastEvent(new Date())
              }
            } catch {
              // Stats parse error — ignore
            }
          } else if (currentEvent === 'job' && currentData) {
            try {
              const jobEvent: JobEvent = JSON.parse(currentData)
              ctx.handleJobEvent(jobEvent)
              ctx.setLastEvent(new Date())
            } catch {
              // Job event parse error — ignore
            }
          }
          currentEvent = ''
          currentData = ''
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    logger.warn('[SSE] Connection error', {
      message: err instanceof Error ? err.message : String(err),
    })
    ctx.setStatus('error')
    if (ctx.enabledRef.current) {
      scheduleSSEReconnect(ctx)
    }
    return
  }

  // Stream closed normally — reconnect if still enabled
  if (ctx.enabledRef.current && !ctx.abortRef.current?.signal.aborted) {
    // Planned end: reconnect now and stay 'connected'; the new stream's
    // stats snapshot covers the gap. A failed reconnect lands in the catch above.
    if (plannedEnd) {
      ctx.connectRef.current()
      return
    }
    ctx.setStatus('disconnected')
    scheduleSSEReconnect(ctx)
  }
}

export function useQueueSSE(enabled = true) {
  const queryClient = useQueryClient()
  const configApi = useQueueConfigApi()

  // The 'connecting'/'disconnected' status on enable/disable is DERIVED —
  // computed during render, not set from an effect — via a render-time
  // comparison of the previous `enabled` value (React's "adjusting state
  // when a prop changes" pattern). Every LATER transition (connected,
  // error/reconnecting, the reconnect timer going back to connecting)
  // happens inside `connectSSE` above (module-level, not traced).
  const [status, setStatus] = useState<SSEStatus>(() =>
    enabled ? 'connecting' : 'disconnected'
  )
  const [prevEnabled, setPrevEnabled] = useState(enabled)
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled)
    setStatus(enabled ? 'connecting' : 'disconnected')
  }

  const [lastEvent, setLastEvent] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  // Debounced stats refresh — coalesce rapid job events into a single refetch
  const statsRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshStats = useCallback(() => {
    if (statsRefreshTimer.current) clearTimeout(statsRefreshTimer.current)
    statsRefreshTimer.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'stats'] })
    }, 500)
  }, [queryClient])

  const handleJobEvent = useCallback(
    (event: JobEvent) => handleJobEventImpl(event, queryClient, refreshStats),
    [queryClient, refreshStats]
  )

  // `connectRef` lets scheduleSSEReconnect's timer call the LATEST `connect`
  // without `connectSSE` referencing the hook's `connect` binding directly
  // (that self-reference tripped react-compiler's "accessed before
  // declaration" check before this was extracted to module scope).
  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    return connectSSE({
      enabledRef,
      abortRef,
      reconnectRef,
      connectRef,
      configApi,
      queryClient,
      handleJobEvent,
      setStatus,
      setLastEvent,
    })
  }, [configApi, queryClient, handleJobEvent])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    // `status` for enable/disable is derived above (render-time comparison),
    // so this effect only opens/closes the connection — no setState here.
    if (enabled) {
      connect()
    } else {
      stopSSE(abortRef, reconnectRef)
    }

    return () => {
      // Synchronous abort/clear on cleanup: no dangling connection on a
      // fast unmount, even though `connect()` itself keeps running
      // asynchronously past its first `await`. Delegated to the
      // module-level `stopSSE` (rather than reading `.current` inline
      // here) — it always aborts whatever is the LATEST controller/timer at
      // cleanup time, which is what a reconnect scheduled after this effect
      // last ran needs; a value captured at setup time would be stale.
      stopSSE(abortRef, reconnectRef)
      if (statsRefreshTimer.current) clearTimeout(statsRefreshTimer.current)
    }
  }, [enabled, connect])

  return { status, lastEvent, reconnect: connect }
}
