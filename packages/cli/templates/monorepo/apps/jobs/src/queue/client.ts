/**
 * Queue client — BullMQ (via @telamonjs/queue) shared by the
 * worker and the scheduler. Prefix keeps this app's queues isolated in
 * Redis from any other project sharing the same instance.
 */
import { QueueManager, Job } from '@telamonjs/queue'

export const queueManager = new QueueManager({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '{{redisPort}}', 10),
  },
  prefix: '{{projectSlug}}',
  // No `logger` → the default createLogger(). Pass any ILogger from
  // @telamonjs/logger here (NoOpLogger to silence it).
})

export { Job }
