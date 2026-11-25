import { FlowProducer as BullFlowProducer } from 'bullmq'
import type { FlowJob, ConnectionOptions, JobNode } from 'bullmq'
import type { QueueManager } from './QueueManager.js'
import type {
  FlowDefinition,
  FlowChildJob,
  JobConstructor,
  JobOptions,
} from './types.js'
import type { ILogger } from '@telamonjs/logger'

/**
 * Flow Producer - Create complex job dependencies (DAGs)
 *
 * @example
 * ```ts
 * const flow = new FlowProducer({ queueManager })
 *
 * const node = await flow.add({
 *   name: 'import-flow',
 *   job: ValidateCSVJob,
 *   data: { fileUrl: '...' },
 *   children: [
 *     {
 *       job: ImportDataJob,
 *       data: { validatedData: '...' },
 *       children: [
 *         { job: SendNotificationJob, data: {} },
 *         { job: GenerateReportJob, data: {} }
 *       ]
 *     }
 *   ]
 * })
 * ```
 */
export class FlowProducer {
  private producer: BullFlowProducer
  private queueManager: QueueManager
  private logger: ILogger

  constructor(config: {
    queueManager: QueueManager
    options?: { connection?: ConnectionOptions }
  }) {
    this.queueManager = config.queueManager
    this.logger = config.queueManager['logger']
    // Same Redis and key prefix as the manager's queues, or the flow jobs land
    // in BullMQ's defaults (localhost, prefix "bull") where no worker listens.
    const { redis, prefix } = config.queueManager['config']
    this.producer = new BullFlowProducer({
      connection: config.options?.connection ?? redis,
      prefix,
    })
  }

  /**
   * Add a flow (job with children dependencies)
   *
   * @param flow - Flow definition with root job and children
   * @returns The created tree (BullMQ `JobNode`): `node.job.id` is the root
   *   job id to pass to `getFlow(id, node.job.queueName)`; `node.children`
   *   holds the child nodes, each with its own `job.id`
   *
   * Flow execution order (BullMQ): children run first, in parallel; a parent
   * runs only after all of its children completed, so the root runs last.
   *
   * Example DAG:
   * ```
   *       ValidateCSV
   *           |
   *      ImportData
   *        /      \
   *   Notify    Report
   * ```
   */
  async add<TData = unknown>(flow: FlowDefinition<TData>): Promise<JobNode> {
    // Build BullMQ flow structure
    const bullFlow: FlowJob = {
      name: flow.name,
      queueName: this.getQueueName(flow.job),
      data: flow.data,
      opts: this.getOptions(flow.job, flow.options),
      children: this.buildChildren(flow.children),
    }

    const node = await this.producer.add(bullFlow)

    this.logger.info('Flow added', { flowName: flow.name, jobId: node.job.id })
    return node
  }

  /**
   * Recursively build children structure
   */
  private buildChildren(children?: FlowChildJob[]): FlowJob[] | undefined {
    if (!children || children.length === 0) return undefined

    return children.map(child => ({
      name: this.getJobName(child.job),
      queueName: this.getQueueName(child.job),
      data: child.data,
      opts: this.getOptions(child.job, child.options),
      children: this.buildChildren(child.children),
    }))
  }

  /**
   * Same precedence and validation as QueueManager.add(): manager defaults <
   * the job class's own options < the flow node's options, and invalid options
   * throw InvalidJobOptionsError while the tree is built, before anything is
   * added. A string job uses the registered class, when there is one.
   */
  private getOptions(
    job: JobConstructor | string | undefined,
    options?: JobOptions
  ): JobOptions {
    const classOptions =
      typeof job === 'function'
        ? new job().options
        : job
          ? this.queueManager['registry'].get(job)?.options
          : undefined
    const merged = {
      ...this.queueManager['config'].defaultJobOptions,
      ...classOptions,
      ...options,
    }
    this.queueManager['assertValidJobOptions'](this.getQueueName(job), merged)
    return merged
  }

  /**
   * Get job name from JobConstructor or string
   */
  private getJobName(job: JobConstructor | string): string {
    if (typeof job === 'string') {
      return job
    }
    const instance = new job()
    return instance.name
  }

  /**
   * Get queue name from JobConstructor or string
   */
  private getQueueName(job?: JobConstructor | string): string {
    if (!job) return 'default'
    return this.getJobName(job)
  }

  /**
   * Get flow by ID
   */
  async getFlow(
    flowId: string,
    queueName: string = 'default'
  ): Promise<JobNode> {
    return await this.producer.getFlow({ id: flowId, queueName })
  }

  /**
   * Close flow producer
   */
  async close(): Promise<void> {
    await this.producer.close()
    this.logger.info('FlowProducer closed')
  }
}
