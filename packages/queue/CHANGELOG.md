# Changelog

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
