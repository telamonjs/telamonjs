# Changelog

## 1.5.1

### Patch Changes

- 31371d4: The SSE route drops a client that stops reading once 1 MiB of frames is waiting for it, instead of queueing every frame in memory until `sseMaxAgeMs`.

## 1.5.0

### Minor Changes

- 7289ce5: - A job's `timeout` is now enforced: an attempt that runs past it fails with `JobTimeoutError`, frees its worker slot and retries or goes to the DLQ as usual. The value comes from the dashboard config, then the enqueue options, then the class's `options.timeout` (previously ignored). `process(data, ctx)` receives `ctx.signal`, aborted at the deadline. A handler that ignores it keeps running while the retry starts, so handlers with side effects should honor the signal or be idempotent.
  - `GET /queue/events` ends each stream after `sseMaxAgeMs` (new `QueueHttpModule.forRoot()` option, 5 minutes by default) with a final `event: reconnect` frame, so clients go through the guards again on reconnect. The ui dashboard reconnects on its own; a custom SSE client must reconnect when the stream ends. Streams closed while a guard is still running, or whose client stopped reading, are released.
  - Manual dispatch enqueues the contract schema's parsed output: undeclared keys are dropped (unless the schema uses `.passthrough()`) and defaults and transforms apply.
  - `GET /queue/history/all` treats `statuses` as a set.
  - `JobConfigStore`, `JobEventPublisher` and `createSSEBroadcaster` accept a `prefix` option that scopes config keys and the events channel per app (default unchanged: `telamonjs`). An existing app that adopts a new prefix should pass `keyPrefix: 'telamonjs:config:'`, or move its keys, to keep its dashboard edits.
  - Clearing a job's cron pattern, concurrency, timeout or description from the dashboard now removes the stored value.

## 1.4.2

### Patch Changes

- c3307d8: `createSSEBroadcaster` logs a warning (`SSEBroadcaster failed to unsubscribe on teardown`)
  when UNSUBSCRIBE fails while the last client leaves, instead of swallowing the error.

  API messages are now English: `GET /v1/queue/history/all` answers 400 with
  `Invalid startDate: use ISO 8601` / `Invalid endDate: use ISO 8601` (was
  `startDate inválido: ...` / `endDate inválido: ...`), and cleaning all queues (`*`) with
  some failures reports `Cleaned N jobs across M queues (K failed)` (was `(K falharam)`).
  Update any client that matched on the old text.

## 1.4.1

### Patch Changes

- 956ae42: Fix: 1.4.0 loaded `prom-client` through a module-URL `createRequire`, and any test runner that transpiles the package to CommonJS (Jest + ts-jest in Nest apps) failed to load the root entry with "Cannot use 'import.meta' outside a module". `prom-client` is a static import again, so the root and `./monitoring` load it on import as in 1.3. `@telamonjs/queue/metrics` stays.

## 1.4.0

### Minor Changes

- fd5b2bd: New `@telamonjs/queue/metrics` entry point for the Prometheus collectors
  (`QueueMetrics`, `OptimizedQueueMetrics`, `MetricsConfig`). `prom-client` now
  loads when you construct a collector, not on import, so a plain import of
  `@telamonjs/queue` or `@telamonjs/queue/monitoring` (health checks,
  `getRedisConnectionMetrics`) no longer loads it. The root re-exports of the
  collectors still work and are now marked `@deprecated`: import them from
  `@telamonjs/queue/metrics`.

## 1.3.3

### Patch Changes

- 7a4ee78: `QueueHttpModule.forRoot()` now throws at boot when `readPermission` or `writePermission` is an empty list (or contains an empty `[]` clause), which used to leave the routes open.
- 6844a25: Harden the Bull Board dashboard and the HTTP backend against bad configuration and bad input.

  - `createDashboardRouter` now enforces `auth`: with `auth.enabled`, every request under `basePath` needs HTTP basic credentials, exactly like `startDashboard`. It previously ignored `auth` and served the board unprotected.
  - `auth.enabled` without a non-empty `username` and `password` now throws a `ConfigurationError` at startup, in both functions, instead of silently skipping auth. The username is no longer logged.
  - `startDashboard` no longer installs a SIGTERM handler (it called `process.exit(0)`, killing workers in the same process and skipping the app's own shutdown, and stacked a listener per call). It still returns the Express app, now with the listening HTTP `server` attached: close it from your own shutdown sequence.
  - List routes (`jobs`, `jobs/all`, `history`, `history/all`, `config/:jobName/history`) reject a `limit` outside 1–500, a negative `offset`, a non-numeric value and an unknown `state`/`status` with 400, instead of fetching a whole set (`limit=0`) or failing with a 500.
  - `PATCH config/:jobName` returns 404 for an unknown job instead of creating a config, and validates its body (`cronPattern` a valid cron pattern, `priority` 1–10, positive integer `concurrency`/`timeout`); the toggle routes require a boolean `enabled` (a missing body was stored as the string `"undefined"`). Invalid input returns 400.
  - `retry-all` reports per-job retry failures in the response's `errors` and logs them at warn; a failed orphan prune is logged at warn instead of swallowed; `checkRedisHealth` returns the ping error message in `error`.
  - `isValidCronPattern` validates with `cron-parser`, the parser BullMQ uses for repeatable jobs: names (`MON-FRI`, `JAN`), `?`, `L` and a leading seconds field are accepted exactly when BullMQ accepts them. It used to reject day and month names.

## 1.3.2

### Patch Changes

- 49306d1: `FlowProducer.add()` validates the merged options of every node, like `QueueManager.add()` and `addBulk()`: invalid options (e.g. `attempts: -1`) throw `InvalidJobOptionsError` before any job of the flow is added, instead of reaching BullMQ.

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
