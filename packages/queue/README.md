# @telamonjs/queue

A batteries-included **BullMQ engine** for background jobs: a `Job` base class,
`QueueManager`/`Worker` orchestration, a shared-connection `QueueRegistry`, a
Redis-backed `JobConfigStore` (enable/disable, cron, priority and concurrency
per job, changeable at runtime), dead-letter queues, flows, a Bull Board
dashboard, Prometheus metrics and an HTTP backend for a custom dashboard.

It pairs with **`@telamonjs/ui/queue`**, the React dashboard frontend
(`QueueTabbedDashboard` + `createNestJSAdapter`) for your own admin.

**Requires a reachable Redis.** The Bull Board dashboard runs its own Express server.

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

`bullmq` and `ioredis` come as dependencies. The Nest peers are only needed for
`@telamonjs/queue/nestjs`.

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

## Bull Board and metrics

```ts
import { startDashboard } from '@telamonjs/queue/dashboard'

startDashboard({
  port: 3005,
  queueManager: manager,
  auth: { enabled: true, username: 'admin', password: process.env.DASHBOARD_PASSWORD! },
})
```

`@telamonjs/queue/monitoring` exposes Prometheus collectors (`prom-client`) and
`getRedisConnectionMetrics(redis)`, a pure function for a Redis pool panel.

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
  description: 'Send a welcome email',
  dispatchable: true,
  schema: z.object({ userId: z.string() }), // validates a manual dispatch server-side (422)
})
```

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

Job events (`jobStarted`, `jobCompleted`, `jobFailed`) are published over Redis
pub/sub by `JobEventPublisher`; consume them through the SSE stream in your web app.

## Entry points

<!-- generated:entries -->
- `@telamonjs/queue`
- `@telamonjs/queue/job-config`
- `@telamonjs/queue/contracts`
- `@telamonjs/queue/dashboard`
- `@telamonjs/queue/monitoring`
- `@telamonjs/queue/utils`
- `@telamonjs/queue/scheduler`
- `@telamonjs/queue/http`
- `@telamonjs/queue/nestjs`

Every name each entry point exports, runtime and types: [Public API index](https://github.com/telamonjs/telamonjs/blob/main/docs/exports.md).
<!-- /generated:entries -->

## Full docs

**Full docs →** [the queue section of the docs site](https://github.com/telamonjs/telamonjs/tree/main/apps/docs/content/docs/queue)
(scheduling, priorities, dead-letter queues, metrics, error handling, the
dashboard; MDX sources, readable on GitHub).
