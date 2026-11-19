/**
 * Job contract metadata — UI/API-facing description of a job (name, module,
 * description, whether it can be dispatched from a web app, optional Zod
 * validation and default BullMQ options).
 *
 * Deliberately PARALLEL to `IJob`/`JobRegistry` (core/), not merged into
 * them: `IJob` is a job's *processing* contract (a `process()` method);
 * `JobContract`/`JobDefinition` is *metadata* consumed by HTTP handlers and
 * the queue dashboard UI. Fusing the two would force every job already in
 * production to grow UI metadata just to keep compiling.
 */
import type { ZodSchema } from 'zod'
import type { JobOptions } from '../core/types.js'

export interface JobContract<TData = unknown, TResult = unknown> {
  /** Unique job identifier (matches the name a worker registers under). */
  name: string
  /** Module/namespace the job belongs to (used for grouping + module-level toggles). */
  module: string
  description: string
  /** Whether this job can be triggered on-demand (e.g. from an admin UI). */
  dispatchable: boolean
  /**
   * Whether failed jobs may be retried by hand (dashboard retry, bulk retry,
   * retry-all). Default `true`. Set `false` when retry is owned elsewhere —
   * e.g. the job's input is re-claimed from the database — so a late manual
   * retry would process the same input twice. The HTTP layer answers 409.
   */
  manualRetry?: boolean
  /** Phantom type carrying TData — never assigned, read-only for inference. */
  _dataType?: TData
  /** Phantom type carrying TResult — never assigned, read-only for inference. */
  _resultType?: TResult
}

export interface JobDefinition<TData = unknown, TResult = unknown>
  extends JobContract<TData, TResult> {
  /** Validates a dispatch payload before it reaches the queue. */
  schema?: ZodSchema<TData>
  defaultOptions?: JobOptions
}
