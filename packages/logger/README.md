# @telamonjs/logger

Structured logging with **one `ILogger` interface across browser, server and
worker**. Beyond the standard levels it adds three domain extensions
(`success()`, `audit()` and `perf()`), plus child loggers, request IDs and
timers.

The package has a single entry point and it is **browser-safe** (console
adapters only), so importing it from a client component can't drag Node
built-ins into your bundle. It has no runtime dependencies.

## Install

```bash
pnpm add @telamonjs/logger
```

## Quick start

```ts
import { logger } from '@telamonjs/logger'

logger.info('User created', { userId: '123' })
logger.error('Payment failed', { orderId: '456', error: err.message })

const timer = logger.startTimer()
await doWork()
timer.done('Work completed')   // "Work completed (1234ms)"
```

## Pick a logger per runtime

```ts
import {
  createLogger,
  createBrowserLogger,
  createWorkerLogger,
  createServerLogger,
  createTestLogger,
} from '@telamonjs/logger'

const log = createServerLogger()   // JSON lines, no colors: Next.js Server Components, API routes
```

`createLogger(config)` returns a no-op logger when `enabled: false`; otherwise
`format` picks the output: `'simple'` (default, human-readable text),
`'json'` (one JSON object per line: `timestamp`, `level`, `message`, `context`)
or `'pretty'` (a `PrettyLogger`). `createServerLogger()` defaults to `'json'`.
The adapters are exported too (`ConsoleLogger`,
`PrettyLogger`, `BrowserLogger`, `NoOpLogger`). To ship logs elsewhere,
implement `ILogger` or extend `BaseLogger` in your app.

## Audit trails

```ts
logger.audit('user.deleted', {
  userId: actor.id,
  resource: 'user',
  resourceId: target.id,
  changes: { active: { before: true, after: false } },
  reason: 'GDPR erasure request',
  compliance: ['GDPR', 'LGPD'],
})
```

`AuditAction` ships canonical actions (`user.created`, `user.login`,
`permission.granted`, `data.exported`, …) and stays open to any string.

Audit entries are compliance records, so **`audit()` ignores the level
filter**: it writes even when `level` (or `LOG_LEVEL`) is `warn` or `error`,
at INFO severity (`console.log`; `"level":"info"` with
`"context":{"level":"audit","auditAction":…}` in JSON). Only a disabled logger
(`enabled: false`, `createTestLogger()`) drops them.

## Context and performance

```ts
const reqLog = logger.withRequestId(requestId).withUser({ id, email })
const child  = logger.child({ module: 'billing' })

logger.perf('db.query', 42, { table: 'orders' })   // label, duration in ms, context
```

## Entry points

<!-- generated:entries -->
- `@telamonjs/logger`

Every name each entry point exports, runtime and types: [Public API index](https://github.com/telamonjs/telamonjs/blob/main/docs/exports.md).
<!-- /generated:entries -->

## Full docs

**Full docs →** [the logger page of the docs site](https://github.com/telamonjs/telamonjs/tree/main/apps/docs/content/docs/packages)
(MDX sources, readable on GitHub).
