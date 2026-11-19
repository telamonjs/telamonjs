import type { JobConstructor, IJob } from './types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import {
  JobAlreadyRegisteredError,
  RegistryValidationError,
  InvalidJobNameError,
} from '../utils/errors.js'

/**
 * Job Registry - Stores and manages all registered jobs
 *
 * Singleton pattern to ensure single source of truth
 */
export class JobRegistry {
  private static instance: JobRegistry
  private jobs: Map<string, IJob> = new Map()
  private logger: ILogger = new NoOpLogger()

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): JobRegistry {
    if (!JobRegistry.instance) {
      JobRegistry.instance = new JobRegistry()
    }
    return JobRegistry.instance
  }

  /**
   * Set logger instance (called by QueueManager)
   */
  setLogger(logger: ILogger): void {
    this.logger = logger
  }

  /**
   * Register a job class
   *
   * @param JobClass - Job class constructor
   * @throws Error if job with same name already registered
   *
   * @example
   * ```ts
   * registry.register(SendEmailJob)
   * registry.register(GenerateReportJob)
   * ```
   */
  register<TData = unknown, TResult = unknown>(
    JobClass: JobConstructor<TData, TResult>
  ): void {
    const jobInstance = new JobClass()

    if (!jobInstance.name) {
      throw new InvalidJobNameError(JobClass.name, 'Job name cannot be empty')
    }

    if (this.jobs.has(jobInstance.name)) {
      throw new JobAlreadyRegisteredError(jobInstance.name)
    }

    // The registry stores jobs of many different (TData, TResult)
    // instantiations in one heterogeneous map - widening to the type-erased
    // IJob<unknown, unknown> here is the deliberate boundary where each
    // job's concrete data/result types stop being tracked; get<TData,
    // TResult>() narrows back to a caller-chosen instantiation on read.
    this.jobs.set(jobInstance.name, jobInstance as IJob<unknown, unknown>)
    this.logger.debug('Job registered', { jobName: jobInstance.name })
  }

  /**
   * Register multiple jobs at once
   *
   * @param JobClasses - Array of job class constructors
   *
   * @example
   * ```ts
   * registry.registerMany([
   *   SendEmailJob,
   *   GenerateReportJob,
   *   ImportDataJob
   * ])
   * ```
   */
  registerMany(JobClasses: JobConstructor[]): void {
    for (const JobClass of JobClasses) {
      this.register(JobClass)
    }
  }

  /**
   * Get a registered job by name
   *
   * @param name - Job name
   * @returns Job instance or undefined
   */
  get<TData = unknown, TResult = unknown>(
    name: string
  ): IJob<TData, TResult> | undefined {
    return this.jobs.get(name) as IJob<TData, TResult> | undefined
  }

  /**
   * Check if a job is registered
   *
   * @param name - Job name
   * @returns true if registered, false otherwise
   */
  has(name: string): boolean {
    return this.jobs.has(name)
  }

  /**
   * Get all registered job names
   *
   * @returns Array of job names
   */
  getNames(): string[] {
    return Array.from(this.jobs.keys())
  }

  /**
   * Get all registered jobs
   *
   * @returns Map of job name to job instance
   */
  getAll(): Map<string, IJob> {
    return new Map(this.jobs)
  }

  /**
   * Get count of registered jobs
   */
  count(): number {
    return this.jobs.size
  }

  /**
   * Unregister a job
   *
   * @param name - Job name to unregister
   * @returns true if unregistered, false if not found
   */
  unregister(name: string): boolean {
    const deleted = this.jobs.delete(name)
    if (deleted) {
      this.logger.debug('Job unregistered', { jobName: name })
    }
    return deleted
  }

  /**
   * Clear all registered jobs
   */
  clear(): void {
    this.jobs.clear()
    this.logger.debug('All jobs unregistered')
  }

  /**
   * Get job stats
   */
  getStats(): {
    total: number
    jobs: string[]
  } {
    return {
      total: this.jobs.size,
      jobs: Array.from(this.jobs.keys()),
    }
  }

  /**
   * Validate registry (check for conflicts, missing names, etc)
   *
   * @throws Error if validation fails
   */
  validate(): void {
    if (this.jobs.size === 0) {
      throw new RegistryValidationError('No jobs registered', [
        'No jobs registered',
      ])
    }

    const names = Array.from(this.jobs.keys())
    const duplicates = names.filter(
      (name, index) => names.indexOf(name) !== index
    )
    const errors: string[] = []

    if (duplicates.length > 0) {
      errors.push(`Duplicate job names found: ${duplicates.join(', ')}`)
    }

    for (const [name, job] of this.jobs.entries()) {
      if (!job.process || typeof job.process !== 'function') {
        errors.push(`Job '${name}' must implement process() method`)
      }
    }

    if (errors.length > 0) {
      throw new RegistryValidationError(errors.join('; '), errors)
    }

    this.logger.debug('Registry validation passed', {
      jobCount: this.jobs.size,
    })
  }
}
