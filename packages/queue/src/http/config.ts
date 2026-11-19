import { parseUpdatedByUser } from './helpers.js'
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

function toPartialConfig(input: JobConfigUpdateInput): Partial<JobConfig> {
  const patch: Partial<JobConfig> = {}
  if (input.description !== undefined) patch.description = input.description ?? undefined
  if (input.cronPattern !== undefined) patch.cronPattern = input.cronPattern ?? undefined
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.concurrency !== undefined) patch.concurrency = input.concurrency ?? undefined
  if (input.timeout !== undefined) patch.timeout = input.timeout ?? undefined
  return patch
}

/** `PATCH /v1/queue/config/:jobName` */
export async function handleUpdateJobConfig(
  deps: QueueHttpDeps,
  jobName: string,
  body: JobConfigUpdateInput,
  actor: string
): Promise<JobConfigWithUser> {
  await deps.jobConfigStore.set(jobName, toPartialConfig(body), actor)
  return handleGetJobConfig(deps, jobName)
}

/** `POST /v1/queue/config/:jobName/toggle` */
export async function handleToggleJobConfig(
  deps: QueueHttpDeps,
  jobName: string,
  enabled: boolean,
  actor: string
): Promise<JobConfigWithUser> {
  await deps.jobConfigStore.toggleEnabled(jobName, enabled, actor)
  return handleGetJobConfig(deps, jobName)
}

/** `POST /v1/queue/config/modules/:module/toggle` */
export async function handleToggleModuleJobConfigs(
  deps: QueueHttpDeps,
  moduleName: string,
  enabled: boolean,
  actor: string
): Promise<{ updated: number }> {
  const changed = await deps.jobConfigStore.toggleModuleJobConfigs(moduleName, enabled, actor)
  return { updated: changed.length }
}

/** `GET /v1/queue/config/:jobName/history?limit=...` */
export async function handleGetJobConfigHistory(
  deps: QueueHttpDeps,
  jobName: string,
  limit = 50
): Promise<JobHistoryEntry[]> {
  const entries = await deps.jobConfigStore.getHistory(jobName, limit)

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
