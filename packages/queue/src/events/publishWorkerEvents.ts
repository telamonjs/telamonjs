import type { Job as BullJob } from 'bullmq'
import type { Worker } from '../core/Worker.js'
import type { JobEventPublisher } from './JobEventPublisher.js'
import { jobStarted, jobCompleted, jobFailed } from './JobEventPublisher.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'

export interface PublishWorkerEventsOptions {
  logger?: ILogger
}

/**
 * Wires BullMQ's `active`/`completed`/`failed` worker events to
 * `JobEventPublisher.publish()` via the `jobStarted`/`jobCompleted`/
 * `jobFailed` factories - the 1-call replacement for the ~20-line
 * event-listener block every consumer worker hand-wrote (and the point
 * where `JobEvent`'s shape becomes public, versioned API - the web app's SSE
 * endpoint consumes it).
 *
 * Returns an unsubscribe function that removes only the listeners this call
 * added. It does not close the workers or the publisher - their lifecycle
 * stays the caller's responsibility.
 */
export function publishWorkerEvents(
  workers: Worker[],
  publisher: JobEventPublisher,
  opts?: PublishWorkerEventsOptions
): () => void {
  const logger = opts?.logger ?? new NoOpLogger()
  const unsubscribers: Array<() => void> = []

  for (const worker of workers) {
    const raw = worker.getRawWorker()
    const workerName = worker.getName()

    const onActive = (job: BullJob) => {
      void publisher.publish(jobStarted(job.id ?? '', job.name, job.data))
    }
    const onCompleted = (job: BullJob, result: unknown) => {
      void publisher.publish(jobCompleted(job.id ?? '', job.name, result))
    }
    const onFailed = (job: BullJob | undefined, error: Error) => {
      if (!job) {
        logger.warn('publishWorkerEvents: "failed" event with no job', {
          workerName,
          error: error.message,
        })
        return
      }
      void publisher.publish(jobFailed(job.id ?? '', job.name, error.message))
    }

    raw.on('active', onActive)
    raw.on('completed', onCompleted)
    raw.on('failed', onFailed)

    unsubscribers.push(() => {
      raw.off('active', onActive)
      raw.off('completed', onCompleted)
      raw.off('failed', onFailed)
    })
  }

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
