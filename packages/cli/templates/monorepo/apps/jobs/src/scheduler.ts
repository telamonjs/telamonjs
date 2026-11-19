/**
 * Scheduler — a separate process from the worker, for repeatable jobs. None
 * are enabled by default; uncomment the example below once you have a real
 * repeatable to run (a cron-like BullMQ repeat is added through the raw
 * queue — QueueManager.add() intentionally excludes `repeat` from its
 * JobOptions).
 * Run with: pnpm --filter {{scope}}/jobs scheduler
 */
import { queueManager } from './queue/client'
import { registerJobs } from './registry'
// import type { ExemploJobData } from './jobs/exemplo.job'

registerJobs()

async function main() {
  // Example — every 5 minutes, jobId prevents duplicate registration on
  // restart:
  //
  // await queueManager
  //   .getQueue<ExemploJobData, void>('exemplo')
  //   ?.getRawQueue()
  //   .add('exemplo', { message: 'scheduled run' }, {
  //     repeat: { every: 5 * 60 * 1000 },
  //     jobId: 'exemplo-repeat',
  //   })

  console.log('Scheduler configured (no repeatables enabled — see the commented example)')

  if (process.argv.includes('--once')) {
    await queueManager.close()
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

process.on('SIGTERM', async () => {
  await queueManager.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await queueManager.close()
  process.exit(0)
})
