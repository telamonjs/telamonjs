# Changelog

## 1.3.1

### Patch Changes

- 7f6980d: `GetActorFn` no longer requires Express 5's `Request` type: it takes the minimal `ActorRequest`
  (`headers`, optional `user`, now exported from `@telamonjs/queue/nestjs`) and accepts a callback
  typed with the app's own Express 4 or 5 `Request`.

## 1.3.0

### Minor Changes

- d2a390a: `FlowProducer.add()` returns the created flow (BullMQ `JobNode`) instead of `void`: `node.job.id` is
  the root job id to pass to `getFlow(id, node.job.queueName)`, and `node.children` holds the child
  nodes with their ids, so a flow can be tracked without setting `options.jobId` yourself. Existing
  callers that ignore the result are unaffected.

### Patch Changes

- 7d538d0: `FlowProducer` applies the same job-option precedence as `QueueManager.add()`: manager
  `defaultJobOptions` < the job class's own `options` < the flow node's `options`. Flow jobs used to
  get only the node's `options`, so a job class with `attempts: 5` (or the `Job` default of 3 with
  exponential backoff) ran once, without retries, when it was part of a flow. A job given by name
  uses the registered class's options.
- Updated dependencies [2d019f6]
- Updated dependencies [ac040f3]
- Updated dependencies [06e660f]
  - @telamonjs/logger@1.1.0

## 1.2.0

### Minor Changes

- edf44c2: Job contracts take an optional short `label`. The HTTP handlers serve `displayName` as `label`, else `description`, else the job name, so apps that set no label see no change.

## 1.1.0

### Minor Changes

- 81ec7e2: DLQ retention, BullMQ job schedulers and Express 5 support.

  - `DeadLetterQueue` accepts optional retention (`DeadLetterQueueOptions`: `maxAge` in ms and/or `maxLen`), applied every time an entry is added, and gains `purgeOlderThan(ms)`, which returns the number of entries removed. `QueueManager` forwards it through the new `dlqRetention` config option. Without either option the DLQ keeps entries until they are deleted, retried or cleared, as before.
  - `SchedulerReconciler` now schedules through BullMQ job schedulers (`upsertJobScheduler` / `removeJobScheduler` / `getJobSchedulers`) instead of the deprecated repeatable API. On the first reconcile after the upgrade, every legacy repeatable of a managed job is removed together with its pending run before the scheduler is upserted, so existing deployments never run a job twice. The reconcile summary keeps its `added` / `removed` / `updated` meaning.
  - `express` and `@types/express` now accept `^4 || ^5`, so the Bull Board dashboard shares a Nest 11 app's Express 5.
  - Docs recommend importing `QueueMetrics` / `OptimizedQueueMetrics` from `@telamonjs/queue/monitoring`; the root re-export stays for compatibility.

## 1.0.2

### Patch Changes

- 0c032b9: `QueueHttpModule.forRoot()` accepts `readPermission` and `writePermission`. They
  declare, on every GET route (SSE included) and every POST/PATCH route
  respectively, the permission metadata that `@telamonjs/permissions`' guard
  enforces. Without them, an app with global auth and permissions guards let every
  logged-in user dispatch, remove and reconfigure jobs; setting them is
  recommended. Omitting both keeps the previous behaviour.

  `SchedulerReconciler` now logs a `warn` (job name and error message) when it
  fails to read one job's repeatables from Redis, instead of swallowing the error.

  `engines.node` is now `>=22.12`: the `require` condition points at the ESM build,
  which needs `require(esm)` without a flag.

- Updated dependencies [a599b51]
  - @telamonjs/logger@1.0.2

## 1.0.1

First public release of `@telamonjs/queue`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
