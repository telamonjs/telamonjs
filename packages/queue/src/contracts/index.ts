/**
 * @telamonjs/queue/contracts
 *
 * Job contract metadata (name/module/description/dispatchable/schema) for
 * HTTP dispatch + the queue dashboard UI — parallel to `./core`'s
 * `JobRegistry`/`IJob` (job processing), not merged into it.
 */
export type { JobContract, JobDefinition } from './types.js'
export { JobContractRegistry } from './registry.js'
