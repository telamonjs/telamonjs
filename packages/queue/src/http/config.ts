import { z } from 'zod'
import { isValidCronPattern } from '../core/scheduling.js'
import { parseListQuery, parseUpdatedByUser } from './helpers.js'
import type { JobConfig } from '../job-config/types.js'
import {
  QueueHttpError,
  type JobConfigUpdateInput,
  type JobConfigWithUser,
  type JobHistoryEntry,
  type QueueHttpDeps,
} from './types.js'

/** `GET /v1/queue/config` */
export async function handleGetJobConfigs(deps: QueueHttpDeps): Promise<JobConfig[]> {
  return deps.jobConfigStore.getAll()
}

/** `GET /v1/queue/config/:jobName` */
export async function handleGetJobConfig(
  deps: QueueHttpDeps,
  jobName: string
): Promise<JobConfigWithUser> {
  const config = await deps.jobConfigStore.get(jobName)
  if (!config) {
    throw new QueueHttpError(`Job config not found: ${jobName}`, 404)
  }
  return { ...config, updatedByUser: parseUpdatedByUser(config.updatedBy) }
}

/** `null` clears a field; unknown keys are stripped. Bounds match `JobOptionsSchema`. */
const positiveInt = z.number().int().positive()
const jobConfigUpdateSchema = z.object({
  description: z.string().nullable().optional(),
  cronPattern: z
    .string()
    .refine(isValidCronPattern, 'must be a valid cron pattern')
    .nullable()
    .optional(),
  priority: z.number().int().min(1).max(10).optional(),
  concurrency: positiveInt.nullable().optional(),
  timeout: positiveInt.nullable().optional(),
})

function parseUpdateBody(body: unknown): JobConfigUpdateInput {
  const result = jobConfigUpdateSchema.safeParse(body ?? {})
  if (!result.success) {
    const detail = result.error.issues
      .map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ')
    throw new QueueHttpError(`Invalid job config: ${detail}`, 400)
  }
  return result.data
}

function assertEnabledFlag(enabled: unknown): asserts enabled is boolean {
  if (typeof enabled !== 'boolean') {
    throw new QueueHttpError('Invalid body: enabled must be a boolean', 400)
  }
}

/** 404 instead of letting a write create (and index) a config for a job that doesn't exist. */
async function assertJobConfigExists(deps: QueueHttpDeps, jobName: string): Promise<void> {
  if (!(await deps.jobConfigStore.get(jobName))) {
    throw new QueueHttpError(`Job config not found: ${jobName}`, 404)
  }
}

function toPartialConfig(input: JobConfigUpdateInput): Partial<JobConfig> {
  const patch: Partial<JobConfig> = {}
  if (input.description !== undefined) patch.description = input.description ?? undefined
  if (input.cronPattern !== undefined) patch.cronPattern = input.cronPattern ?? undefined
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.concurrency !== undefined) patch.concurrency = input.concurrency ?? undefined
  if (input.timeout !== undefined) patch.timeout = input.timeout ?? undefined
  return patch
}

/** `PATCH /v1/queue/config/:jobName` — 404 for an unknown job, 400 for an invalid field. */
export async function handleUpdateJobConfig(
  deps: QueueHttpDeps,
  jobName: string,
  body: JobConfigUpdateInput,
  actor: string
): Promise<JobConfigWithUser> {
  const input = parseUpdateBody(body)
  await assertJobConfigExists(deps, jobName)
  await deps.jobConfigStore.set(jobName, toPartialConfig(input), actor)
  return handleGetJobConfig(deps, jobName)
}

/** `POST /v1/queue/config/:jobName/toggle` — `enabled` must be a boolean; 404 for an unknown job. */
export async function handleToggleJobConfig(
  deps: QueueHttpDeps,
  jobName: string,
  enabled: unknown,
  actor: string
): Promise<JobConfigWithUser> {
  assertEnabledFlag(enabled)
  await assertJobConfigExists(deps, jobName)
  await deps.jobConfigStore.toggleEnabled(jobName, enabled, actor)
  return handleGetJobConfig(deps, jobName)
}

/** `POST /v1/queue/config/modules/:module/toggle` */
export async function handleToggleModuleJobConfigs(
  deps: QueueHttpDeps,
  moduleName: string,
  enabled: unknown,
  actor: string
): Promise<{ updated: number }> {
  assertEnabledFlag(enabled)
  const changed = await deps.jobConfigStore.toggleModuleJobConfigs(moduleName, enabled, actor)
  return { updated: changed.length }
}

/** `GET /v1/queue/config/:jobName/history?limit=...` */
export async function handleGetJobConfigHistory(
  deps: QueueHttpDeps,
  jobName: string,
  limit?: number
): Promise<JobHistoryEntry[]> {
  const entries = await deps.jobConfigStore.getHistory(
    jobName,
    parseListQuery({ limit }, 50).limit
  )

  return entries.map((entry, index) => ({
    id: `${jobName}-${index}`,
    action: entry.action,
    changedBy: entry.by || null,
    changedByUser: parseUpdatedByUser(entry.by),
    before: entry.before ? { value: entry.before } : null,
    after: entry.after ? { value: entry.after } : null,
    reason: entry.field ? `Campo: ${entry.field}` : null,
    createdAt: entry.at,
  }))
}
