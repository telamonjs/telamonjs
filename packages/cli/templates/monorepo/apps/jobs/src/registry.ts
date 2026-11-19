/**
 * Static list of the worker's jobs. Add a `.register()` call here for every
 * new `*.job.ts` you create.
 */
import { queueManager } from './queue/client'
import { ExemploJob } from './jobs/exemplo.job'

export function registerJobs() {
  queueManager.register(ExemploJob)
}
