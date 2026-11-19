// Nest's decorators (@Get/@Post/@Inject/...) call Reflect.defineMetadata at
// class-definition time — without this polyfill loaded first, evaluating
// this file throws immediately. Every real Nest app already does this once
// in its own main.ts, but a reusable library can't rely on import order in
// a consumer's app, so it's self-imported here (idempotent — safe even if
// the consumer also imports it). `./queue-http.module.ts` imports this file
// before its own decorators run, so one import here covers both.
import 'reflect-metadata'
import { Body, Get, Inject, Param, Patch, Post, Query, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import {
  handleGetStats,
  handleGetHealth,
  handleGetFailureGroups,
  handleGetDispatchableJobs,
  handleDispatch,
  handlePerformAction,
  handleGetHistory,
  handleGetHistoryAll,
  handleGetJobs,
  handleGetJobsAll,
  handleRetryJob,
  handleRemoveJob,
  handlePromoteJob,
  handleBulkOperation,
  handleGetJobConfigs,
  handleGetJobConfig,
  handleUpdateJobConfig,
  handleToggleJobConfig,
  handleToggleModuleJobConfigs,
  handleGetJobConfigHistory,
  type QueueHttpDeps,
  type DispatchRequestBody,
  type PerformActionBody,
  type JobState,
  type JobIdBody,
  type BulkOperationBody,
  type JobConfigUpdateInput,
} from '../http/index.js'
import { mapQueueHttpError } from './errors.js'
import { QUEUE_HTTP_DEPS, QUEUE_HTTP_GET_ACTOR } from './constants.js'
import type { GetActorFn } from './types.js'

/**
 * Route handlers only — deliberately no `@Controller()`/`@UseGuards()`
 * here. `QueueHttpModule.forRoot()` dynamically subclasses this with both
 * applied per-call (guards are a `forRoot()`-time config, not static).
 * Nest resolves route metadata (`@Get`/`@Post`/...) off the actual method
 * function references, which a subclass that doesn't override them
 * inherits unchanged — this is why the routes still work through the
 * subclass without redeclaring them.
 *
 * Property injection (`@Inject()` on a field, not a constructor param) is
 * used for the same reason: TypeScript only emits constructor
 * `design:paramtypes` metadata on a class that declares its own
 * constructor, and the dynamic subclass below doesn't — constructor
 * injection would silently fail to resolve. Property injection has no such
 * requirement.
 */
export abstract class QueueControllerBase {
  @Inject(QUEUE_HTTP_DEPS)
  protected readonly deps!: QueueHttpDeps

  @Inject(QUEUE_HTTP_GET_ACTOR)
  protected readonly getActor!: GetActorFn

  /** `GET /queue/events` — Server-Sent Events stream. */
  @Get('events')
  async events(@Res() res: Response): Promise<void> {
    if (!this.deps.eventBroadcaster) {
      res.status(501).json({
        message: 'SSE not configured: pass eventBroadcaster in QueueHttpModule.forRoot() deps',
      })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    // ponytail: correct for nginx only — a proxy with a different buffering
    // knob needs its own config. Documented (design doc risk 2), not solved
    // here; out of this package's control.
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const unsubscribe = this.deps.eventBroadcaster.addClient({
      write: chunk => res.write(chunk),
    })
    res.on('close', unsubscribe)
  }

  @Get('stats')
  async getStats() {
    try {
      return await handleGetStats(this.deps)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('health')
  async getHealth() {
    try {
      return await handleGetHealth(this.deps)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('failures')
  async getFailureGroups(@Query('queueName') queueName: string) {
    try {
      return await handleGetFailureGroups(this.deps, { queueName })
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('dispatch')
  async getDispatchableJobs() {
    try {
      return await handleGetDispatchableJobs(this.deps)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('dispatch')
  async dispatch(@Body() body: DispatchRequestBody, @Req() req: Request) {
    try {
      return await handleDispatch(this.deps, body, this.getActor(req))
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('actions')
  async performAction(@Body() body: PerformActionBody) {
    try {
      return await handlePerformAction(this.deps, body)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('history')
  async getHistory(@Query('queueName') queueName: string, @Query('limit') limit?: string) {
    try {
      return await handleGetHistory(this.deps, {
        queueName,
        limit: limit ? parseInt(limit, 10) : undefined,
      })
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('history/all')
  async getHistoryAll(
    @Query('statuses') statuses?: string,
    @Query('queue') queue?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await handleGetHistoryAll(this.deps, {
        statuses,
        queue,
        search,
        startDate,
        endDate,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      })
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('jobs')
  async getJobs(
    @Query('queueName') queueName: string,
    @Query('state') state?: JobState,
    @Query('limit') limit?: string
  ) {
    try {
      return await handleGetJobs(this.deps, {
        queueName,
        state,
        limit: limit ? parseInt(limit, 10) : undefined,
      })
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('jobs/all')
  async getJobsAll(
    @Query('status') status?: JobState,
    @Query('queue') queue?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string
  ) {
    try {
      return await handleGetJobsAll(this.deps, {
        status,
        queue,
        search,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      })
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('jobs/retry')
  async retryJob(@Body() body: JobIdBody) {
    try {
      return await handleRetryJob(this.deps, body)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('jobs/remove')
  async removeJob(@Body() body: JobIdBody) {
    try {
      return await handleRemoveJob(this.deps, body)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('jobs/promote')
  async promoteJob(@Body() body: JobIdBody) {
    try {
      return await handlePromoteJob(this.deps, body)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('jobs/bulk')
  async bulkOperation(@Body() body: BulkOperationBody) {
    try {
      return await handleBulkOperation(this.deps, body)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('config')
  async getJobConfigs() {
    try {
      return await handleGetJobConfigs(this.deps)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('config/:jobName')
  async getJobConfig(@Param('jobName') jobName: string) {
    try {
      return await handleGetJobConfig(this.deps, jobName)
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Patch('config/:jobName')
  async updateJobConfig(
    @Param('jobName') jobName: string,
    @Body() body: JobConfigUpdateInput,
    @Req() req: Request
  ) {
    try {
      return await handleUpdateJobConfig(this.deps, jobName, body, this.getActor(req))
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('config/:jobName/toggle')
  async toggleJobConfig(
    @Param('jobName') jobName: string,
    @Body() body: { enabled: boolean },
    @Req() req: Request
  ) {
    try {
      return await handleToggleJobConfig(this.deps, jobName, body.enabled, this.getActor(req))
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Post('config/modules/:module/toggle')
  async toggleModuleJobConfigs(
    @Param('module') moduleName: string,
    @Body() body: { enabled: boolean },
    @Req() req: Request
  ) {
    try {
      return await handleToggleModuleJobConfigs(
        this.deps,
        moduleName,
        body.enabled,
        this.getActor(req)
      )
    } catch (err) {
      mapQueueHttpError(err)
    }
  }

  @Get('config/:jobName/history')
  async getJobConfigHistory(
    @Param('jobName') jobName: string,
    @Query('limit') limit?: string
  ) {
    try {
      return await handleGetJobConfigHistory(
        this.deps,
        jobName,
        limit ? parseInt(limit, 10) : undefined
      )
    } catch (err) {
      mapQueueHttpError(err)
    }
  }
}
