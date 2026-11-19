import { Job } from '../queue/client'

export interface ExemploJobData {
  message: string
}

/**
 * Trivial example job — swap this for real logic and add its own
 * `*.job.ts` file per queue (see registry.ts).
 */
export class ExemploJob extends Job<ExemploJobData, void> {
  name = 'exemplo' as const

  async process(data: ExemploJobData): Promise<void> {
    console.log(`[exemplo] ${data.message}`)
  }
}
