import { contractDisplayName } from './helpers.js'
import {
  QueueHttpError,
  type DispatchRequestBody,
  type DispatchResponse,
  type DispatchableJob,
  type QueueHttpDeps,
} from './types.js'

/** `GET /v1/queue/dispatch` — jobs that can be triggered on demand. */
export async function handleGetDispatchableJobs(
  deps: QueueHttpDeps
): Promise<DispatchableJob[]> {
  return deps.contracts.getDispatchable().map(contract => ({
    name: contract.name,
    displayName: contractDisplayName(contract.name, contract),
    module: contract.module,
    description: contract.description,
    dispatchable: contract.dispatchable,
  }))
}

/** `POST /v1/queue/dispatch` — manually enqueue a dispatchable job. */
export async function handleDispatch(
  deps: QueueHttpDeps,
  body: DispatchRequestBody,
  actor: string
): Promise<DispatchResponse> {
  const { queueName } = body
  const data = body.data ?? {}

  if (!queueName) {
    throw new QueueHttpError('Missing required field: queueName', 400)
  }

  const contract = deps.contracts.get(queueName)
  if (!contract) {
    throw new QueueHttpError(`Unknown queue: ${queueName}`, 404)
  }
  if (!contract.dispatchable) {
    throw new QueueHttpError(`Job is not dispatchable: ${queueName}`, 400)
  }

  if (contract.schema) {
    const validation = contract.schema.safeParse(data)
    if (!validation.success) {
      throw new QueueHttpError(
        `Invalid job data: ${JSON.stringify(validation.error.flatten())}`,
        422
      )
    }
  }

  const queue = deps.queues.getQueue(queueName)
  if (!queue) {
    throw new QueueHttpError(`Unknown queue: ${queueName}`, 404)
  }

  const jobData = {
    ...data,
    triggeredBy: actor,
    triggeredAt: new Date().toISOString(),
  }

  const job = await queue.add(queueName, jobData, contract.defaultOptions)

  return { jobId: job.id ?? '', queueName }
}
