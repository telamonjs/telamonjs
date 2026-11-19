import type { JobDefinition } from './types.js'

/**
 * Registry of job contracts (dispatch metadata for HTTP handlers/UI) —
 * parallel to `JobRegistry` (core/), see contracts/types.ts for why they're
 * not merged.
 *
 * NOT a singleton: each consumer app builds and owns its own instance
 * (e.g. passed as `contracts` in the HTTP layer's deps).
 */
export class JobContractRegistry {
  private readonly contracts = new Map<string, JobDefinition>()

  /**
   * Register a contract. A duplicate `name` is a warn-and-skip, not a
   * throw — contract modules can be imported from more than one place
   * without that becoming a hard failure.
   */
  register<TData, TResult>(contract: JobDefinition<TData, TResult>): void {
    if (this.contracts.has(contract.name)) {
      console.warn(`Job contract '${contract.name}' already registered, skipping`)
      return
    }
    // Same type-erasure boundary as JobRegistry.register(): a heterogeneous
    // map stores many (TData, TResult) instantiations; get<TData, TResult>()
    // narrows back to a caller-chosen instantiation on read.
    this.contracts.set(contract.name, contract as JobDefinition<unknown, unknown>)
  }

  registerMany(contracts: ReadonlyArray<JobDefinition<unknown, unknown>>): void {
    for (const contract of contracts) {
      this.register(contract)
    }
  }

  get<TData = unknown, TResult = unknown>(
    name: string
  ): JobDefinition<TData, TResult> | undefined {
    return this.contracts.get(name) as JobDefinition<TData, TResult> | undefined
  }

  getAll(): JobDefinition[] {
    return Array.from(this.contracts.values())
  }

  getDispatchable(): JobDefinition[] {
    return this.getAll().filter(c => c.dispatchable)
  }

  getByModule(moduleName: string): JobDefinition[] {
    return this.getAll().filter(c => c.module === moduleName)
  }

  getModules(): string[] {
    return Array.from(new Set(this.getAll().map(c => c.module)))
  }
}
