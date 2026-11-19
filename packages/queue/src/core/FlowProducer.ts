import { FlowProducer as BullFlowProducer } from 'bullmq'
import type { FlowJob, ConnectionOptions, JobNode } from 'bullmq'
import type { QueueManager } from './QueueManager.js'
import type { FlowDefinition, FlowChildJob, JobConstructor } from './types.js'
import type { ILogger } from '@telamonjs/logger'

/**
 * Flow Producer - Create complex job dependencies (DAGs)
 *
 * @example
 * ```ts
 * const flow = new FlowProducer({ queueManager })
 *
 * await flow.add({
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
  async add<TData = unknown>(flow: FlowDefinition<TData>): Promise<void> {
    // Build BullMQ flow structure
    const bullFlow: FlowJob = {
      name: flow.name,
      queueName: this.getQueueName(flow.job),
      data: flow.data,
      opts: flow.options,
      children: this.buildChildren(flow.children),
    }

    await this.producer.add(bullFlow)

    this.logger.info('Flow added', { flowName: flow.name })
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
      opts: child.options,
      children: this.buildChildren(child.children),
    }))
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
