/**
 * Worker — consumes every registered queue (registry.ts). Repeatables live
 * in scheduler.ts (a separate process) — run both to get the equivalent of
 * a single always-on worker.
 * Run with: pnpm --filter {{scope}}/jobs worker
 */
import { queueManager } from './queue/client'
import { registerJobs } from './registry'

registerJobs()

async function main() {
  // --once: exits right after the workers are created, used by the create
  // gate to confirm the process boots without staying alive.
  await queueManager.createWorkers({ concurrency: 1 })
  console.log('Worker started')

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
