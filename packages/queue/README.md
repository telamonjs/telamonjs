<a href="https://github.com/telamonjs/telamonjs"><img alt="TelamonJS" src="https://cdn.jsdelivr.net/gh/telamonjs/telamonjs@main/.github/assets/logo-mark.svg" height="40"></a>

# @telamonjs/queue

[![npm](https://img.shields.io/npm/v/@telamonjs/queue.svg)](https://www.npmjs.com/package/@telamonjs/queue) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/telamonjs/telamonjs/blob/main/LICENSE)

A batteries-included **BullMQ engine** for background jobs: a `Job` base class,
`QueueManager`/`Worker` orchestration, a shared-connection `QueueRegistry`, a
Redis-backed `JobConfigStore` (enable/disable, cron, priority and concurrency
per job, changeable at runtime), dead-letter queues, flows, a Bull Board
dashboard, Prometheus metrics and an HTTP backend for a custom dashboard.

It pairs with **`@telamonjs/ui/queue`**, the React dashboard frontend
(`QueueTabbedDashboard` + `createNestJSAdapter`) for your own admin.

**Requires a reachable Redis.** The Bull Board dashboard runs its own Express
server; Express 4 and 5 are both supported, so it shares a Nest 11 app's Express 5.

## Install

<!-- generated:peers -->
```bash
pnpm add @telamonjs/queue
```

| Peer dependency | Range |
| --- | --- |
| `@nestjs/common` (optional) | `^10.0.0 \|\| ^11.0.0` |
| `@nestjs/core` (optional) | `^10.0.0 \|\| ^11.0.0` |
<!-- /generated:peers -->

Installing it also installs its dependencies: `bullmq`, `ioredis`, `cron-parser`,
`zod`, `@telamonjs/logger`, `express`, `@types/express`, `express-basic-auth`,
`@bull-board/api`, `@bull-board/express` and `prom-client`. What each import
actually loads at runtime:

| Import | Loads |
| --- | --- |
| `@telamonjs/queue` (root) | The core: BullMQ, ioredis, the job/worker/registry engine, plus `prom-client` for the deprecated metrics re-export. No Express, no Bull Board |
| `@telamonjs/queue/dashboard` | Express, `express-basic-auth` and the Bull Board UI |
| `@telamonjs/queue/metrics` | The Prometheus collectors and `prom-client` |
| `@telamonjs/queue/monitoring` | Health checks and `getRedisConnectionMetrics`, plus the collectors (and `prom-client`) |
| `@telamonjs/queue/nestjs` | The Nest binding; needs the optional Nest peers |

The Nest peers are only needed for `@telamonjs/queue/nestjs`.

## Define a job and run a worker

```ts
import { Job, QueueManager } from '@telamonjs/queue'

export class SendWelcomeEmail extends Job<{ userId: string }> {
  name = 'email_send-welcome'
  options = { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } }

  async process({ userId }: { userId: string }) {
    // ...
  }
}

const manager = new QueueManager({ redis: { host: 'localhost', port: 6379 } })
manager.register(SendWelcomeEmail)
await manager.createWorkers()
```

**Timeouts.** An attempt that runs past its `timeout` (dashboard value, else the
enqueue options, else the class's `options.timeout`) fails with
`JobTimeoutError`, frees its worker slot and is retried. `process(data, ctx)`
gets `ctx.signal`, which aborts at the deadline. JavaScript cannot kill a running
handler: one that ignores the signal keeps running while the retry starts, so
the same job can run twice at once. Handlers with side effects must honor
`ctx.signal` or be safe to run twice.

## Config-driven jobs: toggle and cron without a redeploy

```ts
import type { JobConstructor } from '@telamonjs/queue'
import { JobConfigStore, setupFromConfig } from '@telamonjs/queue/job-config'

const store = new JobConfigStore({ redis: { host: 'localhost', port: 6379 } })
const jobs = new Map<string, JobConstructor>([['email_send-welcome', SendWelcomeEmail]])
await setupFromConfig(manager, store, jobs)
// enabled, cron pattern, priority and concurrency now live in Redis:
// change them from your admin UI, no restart required
```

`SchedulerReconciler` (`@telamonjs/queue/scheduler`) applies the cron side as
BullMQ job schedulers (`upsertJobScheduler`, one per job, id = job name).
Repeatables written by earlier versions (`add(..., { repeat })`) are
replaced on the first reconcile after the upgrade: the legacy repeatable and
its pending run are removed, then the scheduler is upserted, so no job runs twice.

**Several apps on one Redis?** Give each app its own `prefix` and pass the same
value to `QueueManager`/`QueueRegistry`, `JobConfigStore`, `JobEventPublisher`
and `createSSEBroadcaster`: configs then live under `${prefix}:config:` and
events go to `${prefix}:job-events`. Left at the default (`telamonjs`), the apps
share one config index and one event channel, so each app's bootstrap disables
the other's jobs and each dashboard lists, edits and streams the other's jobs.
Giving an existing app a new `prefix` moves its config keys: pass
`keyPrefix: 'telamonjs:config:'` to keep reading them, or rename the keys first,
otherwise bootstrap reseeds every job from code and dashboard edits are lost.

## Dead-letter queue

Jobs that exhaust their attempts land in one DLQ per `QueueManager`. It keeps
entries until you delete, retry or clear them, unless you give it a retention:

```ts
const manager = new QueueManager({
  redis: { host: 'localhost', port: 6379 },
  dlqRetention: { maxAge: 30 * 24 * 60 * 60 * 1000, maxLen: 10_000 }, // both optional
})

// Or on demand, e.g. from your own cron:
const removed = await manager.getDLQ()?.purgeOlderThan(7 * 24 * 60 * 60 * 1000)
```

Retention runs each time an entry is added. A standalone `DeadLetterQueue`
takes the same options as its fourth constructor argument.

## Bull Board and metrics

```ts
import { createDashboardRouter, startDashboard } from '@telamonjs/queue/dashboard'

const auth = { enabled: true, username: 'admin', password: process.env.DASHBOARD_PASSWORD! }

// Standalone server: the Express app, with the listening `server` attached
const dashboard = startDashboard({ port: 3005, queueManager: manager, auth })
process.on('SIGTERM', () => dashboard.server.close()) // shutdown is yours

// Or mounted into your own Express app — `auth` is enforced the same way
app.use('/admin/queue', createDashboardRouter({ queueManager: manager, auth }))
```

Both functions put HTTP basic auth in front of the board when `auth.enabled`, and
throw a `ConfigurationError` at startup if `username` or `password` is missing or
empty. `startDashboard` installs no signal handlers: close `dashboard.server` from
your own shutdown sequence.

`@telamonjs/queue/metrics` exposes the Prometheus collectors, `QueueMetrics` and
`OptimizedQueueMetrics`.
The root still re-exports both for compatibility, marked `@deprecated`: import
them from `@telamonjs/queue/metrics`. `@telamonjs/queue/monitoring` has the
health checks and `getRedisConnectionMetrics(redis)`, a pure function for a
Redis pool panel.

## HTTP backend for the ui dashboard

`QueueTabbedDashboard` expects about 18 REST routes (stats, dispatch, jobs,
retry/remove/promote/bulk, history, config, …) plus an SSE stream. This package
ships that backend as framework-agnostic handlers (`./http`) and a NestJS
binding (`./nestjs`). You bring your own auth guards, your Redis credentials
and a `JobContract` per job the UI should see or dispatch.

```ts
import { JobContractRegistry } from '@telamonjs/queue/contracts'
import { z } from 'zod'

const contracts = new JobContractRegistry()
contracts.register({
  name: 'email_send-welcome',
  module: 'notifications',
  label: 'Welcome email', // optional short name for dashboard rows and titles
  description: 'Sends the welcome email to a newly registered user',
  dispatchable: true,
  schema: z.object({ userId: z.string() }), // validates a manual dispatch server-side (422); the job gets the parsed output
})
```

The API serves each job's `displayName` as the contract's `label`, else its
`description`, else the job name. The dashboard shows `description` as secondary
text, and its `jobLabel` prop overrides `displayName` on the app side.

```ts
import { createSSEBroadcaster } from '@telamonjs/queue'
import { handleGetStats, queueSourceFromManager } from '@telamonjs/queue/http'
import { QueueHttpModule } from '@telamonjs/queue/nestjs'
import type { Request } from 'express'

type AuthedRequest = Request & { user: { email: string } }
const queues = queueSourceFromManager(manager)
const eventBroadcaster = createSSEBroadcaster({
  redis: { host: 'localhost', port: 6379 },
  getStats: () => handleGetStats({ queues, jobConfigStore: store, contracts }),
})

@Module({
  imports: [
    QueueHttpModule.forRoot({
      depsFactory: () => ({ queues, jobConfigStore: store, contracts, eventBroadcaster }),
      guards: [MyAuthGuard],          // auth is entirely yours
      getActor: req => (req as AuthedRequest).user.email, // set by your guard
    }),
  ],
})
export class QueueDashboardModule {}
```

Then point `<QueueTabbedDashboard apiUrl="https://api.example.com/v1" />` at the
path where the controller is mounted (`@Controller('queue')`, so `/v1/queue/*`
behind a `v1` global prefix).

**API and worker in separate processes?** `queueSourceFromManager` needs every
job class registered where it runs and opens two Redis connections per queue.
Use the shared-connection registry your API already has instead:

```ts
import { queueSourceFromRegistry } from '@telamonjs/queue/http'

const queues = queueSourceFromRegistry(queueRegistry, () => contracts.getAll().map(c => c.name))
```

The name list also gates lookups: a queue outside it resolves to `undefined`
and the handlers answer 404, so a request-supplied name can't create a queue in Redis.

**Set `readPermission` and `writePermission`.** Without them the routes
declare no permission metadata, so a guard that reads it (`@telamonjs/permissions`'
`createPermissionsGuard()`, global or in `guards`) lets every authenticated user
call every route, including dispatch, remove and job config edits:

```ts
QueueHttpModule.forRoot({
  depsFactory: () => ({ queues, jobConfigStore: store, contracts, eventBroadcaster }),
  getActor: req => (req as AuthedRequest).user.email,
  readPermission: 'queue.read',   // every GET route, SSE stream included
  writePermission: 'queue.write', // every POST/PATCH route
})
```

Each option takes what `@Permissions(...)` takes: a string, or a list of clauses
(OR between entries, an inner array is AND). They are metadata only: the
permissions guard enforces them, so it must run on these routes. Omit both and
the behaviour is unchanged.

The SSE route sets `X-Accel-Buffering: no`, which only disables buffering on
nginx; other reverse proxies need their own config.

Guards run once per request, and an SSE stream is one long request. The route
ends each stream after `sseMaxAgeMs` (a `forRoot()` option, 5 minutes by
default) so the client reconnects through your guards: an expired token, a
revoked session or a removed `readPermission` stops the feed within that time.
The last frame of such a stream is `event: reconnect`. The ui dashboard
reconnects at once on it, without showing a disconnect; a custom client should
do the same. A client that stops reading is dropped sooner: once 1 MiB of frames
is waiting for it, the route closes the stream.

Job events (`jobStarted`, `jobCompleted`, `jobFailed`) are published over Redis
pub/sub by `JobEventPublisher`; consume them through the SSE stream in your web app.

## Entry points

<!-- generated:entries -->
- `@telamonjs/queue`
- `@telamonjs/queue/job-config`
- `@telamonjs/queue/contracts`
- `@telamonjs/queue/dashboard`
- `@telamonjs/queue/monitoring`
- `@telamonjs/queue/metrics`
- `@telamonjs/queue/utils`
- `@telamonjs/queue/scheduler`
- `@telamonjs/queue/http`
- `@telamonjs/queue/nestjs`

Every name each entry point exports, runtime and types: [Public API index](https://github.com/telamonjs/telamonjs/blob/main/docs/exports.md).
<!-- /generated:entries -->

## Full docs

**Full docs →** [the queue section of the docs site](https://telamonjs.com/docs/queue)
(scheduling, priorities, dead-letter queues, metrics, error handling, the
dashboard; MDX sources, readable on GitHub).
