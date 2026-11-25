# @telamonjs/data

The server half of a TelamonJS list. A `ListPage` sends page, page size, search, sort and filters.
This package reads them on the endpoint and turns them into a query, with no dependencies and
without React, Next or Prisma. A NestJS API also gets the Prisma exception filter, health
endpoint and audit interceptor every API repeats.

```bash
pnpm add @telamonjs/data
```

| Entry | What it has | Needs an ORM? |
| --- | --- | --- |
| `@telamonjs/data` | The wire contract (`PaginationParams`, `PaginatedResponse`, `SortField`, `createPaginatedResponse`), `sanitizePaginationParams`, `resolveSort`, `resolveSortPath`; the audit helpers `computeDiff`, `redactPayload`, `DEFAULT_REDACT_KEYS` | No |
| `@telamonjs/data/prisma` | `buildPrismaOrderBy(Multi)`, `buildSearchConditions`, `buildFilterConditions`, `buildWhereClause`, `createPaginationContext` | Builds Prisma's object shape; never imports `@prisma/client` |
| `@telamonjs/data/nest` | `PrismaExceptionFilter`, `HealthModule`, `createAuditInterceptor`, `SkipAudit`, `isPrismaKnownRequestError`, `isPrismaValidationError` | Needs `@nestjs/common` and `rxjs` (optional peers); never imports `@prisma/client` |

## Sorting what a list sends

A `ListPage` sends the sort field in one of two forms: the column's data path (`customer.name`,
with `list.sortParam: 'path'`) or the TanStack column id (`customer_name`, the default). Both
resolve to the same path:

```ts
import { resolveSortPath } from '@telamonjs/data'
import { buildPrismaOrderBy } from '@telamonjs/data/prisma'

resolveSortPath('customer_name')                          // 'customer.name'
buildPrismaOrderBy('customer_name', 'asc')                // { customer: { name: 'asc' } }
buildPrismaOrderBy('_count.items', 'desc')                // { items: { _count: 'desc' } }
buildPrismaOrderBy('created_at', 'asc', ['created_at'])   // { created_at: 'asc' }
```

Pass the endpoint's `sortableFields`. A listed snake_case field (`created_at`) then stays a
scalar, and anything not listed is rejected:

```ts
import { resolveSort } from '@telamonjs/data'

const sort = resolveSort(query.sortBy ?? 'name', query.sortOrder, {
  defaultOrderBy: 'name',
  defaultOrderDirection: 'asc',
  sortableFields: ['name', 'customer.name', 'created_at'],
})
```

Without an ORM, `resolveSort` and `resolveSortPath` are all you need to build your own
`ORDER BY`.

## Scope-safe `where`

`buildWhereClause` combines search and filters with the endpoint's `baseWhere` (for example
`{ deletedAt: null }`) and the user's visibility rule using `AND`. None of them can overwrite
another, even when they share a key:

```ts
import { buildSearchConditions, buildWhereClause } from '@telamonjs/data/prisma'

const where = buildWhereClause(
  buildSearchConditions(query.search, ['name', 'customer.name']),
  [],
  { deletedAt: null },
  { OR: [{ ownerId: user.id }, { public: true }] }
)
```

## Paginated services

`createPaginationContext` builds a `list` (and `getFilterOptions`) per model from a declarative
config: search fields, typed filters, `sortableFields`, visibility, counts and hooks.

```ts
import { createPaginationContext } from '@telamonjs/data/prisma'

export const { createPaginatedService } = createPaginationContext({
  prisma,
  auth,                                   // () => Promise<{ user } | null>
  filterLabels: () => ({ yes: 'Sim', no: 'Não', active: 'Ativo', inactive: 'Inativo' }),
})

export const customers = createPaginatedService({
  model: 'customer',
  searchFields: ['name', 'email'],
  filters: { active: 'boolean', state: 'string' },
  sortableFields: ['name', 'created_at', '_count.orders'],
})
```

`@telamonjs/ui/server` re-exports these helpers for Next.js server code. A NestJS or plain Node
API installs only this package.

## NestJS (`@telamonjs/data/nest`)

Needs `@nestjs/common` 10 or 11 and `rxjs` 7, optional peers that only this entry imports
(every Nest app already has both).

### Prisma errors as HTTP statuses

`PrismaExceptionFilter` answers Prisma errors with a status instead of a 500. It matches
Prisma's known-request and validation errors by shape (`code` + `name`/`clientVersion`), so it
works with any `@prisma/client` copy, and it never claims other errors: your own filters and
Nest's default handling still get them.

```ts
import { PrismaExceptionFilter } from '@telamonjs/data/nest'

app.useGlobalFilters(new PrismaExceptionFilter())
```

| Prisma | HTTP |
| --- | --- |
| `P2002` unique | 409, `field` = first `target` field |
| `P2003` foreign key | 400, `field` = constraint |
| `P2025` not found | 404 |
| `P2011`, `P2012`, `P2014`, `PrismaClientValidationError` | 400 |
| `P1000`–`P1003` connection | 503 |
| any other code | 500, logged with Nest's `Logger` |

The body is `{ statusCode, message, error, field?, timestamp, path }`, written with Express's
`res.status().json()`. Outside HTTP (RPC, WebSocket, GraphQL) the error is rethrown. Messages are
English; replace them (in your app's language, say) per code, `validation` or `default`, with a
string or a function of the reported fields:

```ts
new PrismaExceptionFilter({
  messages: {
    P2025: 'Nothing here',
    P2002: (fields) => `${fields.join(', ')} is already taken`,
  },
})
```

To change one case (say, `P2003` on a `DELETE` as 409), subclass it, handle that case in `catch`
and call `super.catch(exception, host)` for the rest.

### Health endpoint

`HealthModule.forRoot()` serves `GET /health`. It runs the checks in parallel and answers 200, or
503 with `status: 'error'` when any check is down, so Docker and load balancers can read the
status code:

```ts
import { Public } from '@telamonjs/auth/nest'
import { HealthModule } from '@telamonjs/data/nest'

HealthModule.forRoot({
  decorators: [Public()],             // class decorators for the controller
  inject: [PrismaService, REDIS],
  checks: (prisma: PrismaService, redis: Redis) => ({
    database: () => prisma.$queryRaw`SELECT 1`,
    redis: () => redis.ping(),
  }),
})
// GET /health → { status: 'ok', timestamp, uptime, database: 'connected', redis: 'connected' }
```

A check is down when it throws, rejects or resolves `false`. `path` changes the route (default
`'health'`); `imports` brings in the modules of the `inject` tokens when they are not global.

### Audit trail

`createAuditInterceptor()` returns an interceptor class that turns every successful,
authenticated `POST`/`PUT`/`PATCH`/`DELETE` into an `AuditEntry` and hands it to your `write`.
The package owns no table: you persist the entry wherever you keep audit rows.

```ts
import { APP_INTERCEPTOR } from '@nestjs/core'
import { createAuditInterceptor } from '@telamonjs/data/nest'

export const AuditInterceptor = createAuditInterceptor({
  inject: [PrismaService],
  write: (entry, _context, prisma: PrismaService) => prisma.auditLog.create({ data: entry }),
})

// app.module.ts
providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }]
```

A Prisma model that takes the entry as it is:

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  userId         String
  impersonatedBy String?
  action         String   // CREATE | UPDATE | DELETE
  entityType     String
  entityId       String?
  changes        Json?
  ipAddress      String?
  userAgent      String?
  method         String
  path           String
  statusCode     Int
  createdAt      DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId, createdAt])
}
```

| Entry field | Comes from |
| --- | --- |
| `userId`, `impersonatedBy` | `request.user.id` and `request.user.originalUser.id`, the `@telamonjs/auth` user (`user` option to read another shape) |
| `action` | `POST` → `CREATE`, `PUT`/`PATCH` → `UPDATE`, `DELETE` → `DELETE`; any other audited method as is |
| `entityType`, `entityId` | The first path segment that is not `api` or a version (`/v1/orders/42` → `orders`), and the `:id` param or the response body's `id` (`resolveEntity` option to change both) |
| `changes` | The request body through `redactPayload`; absent when the body is empty |
| `ipAddress`, `userAgent` | `request.ip` (set Express's `trust proxy` behind a proxy) and the `User-Agent` header |
| `method`, `path`, `statusCode` | The request, without the query string, and the status Nest answered with |

Nothing is written when the handler throws, when there is no user (logins, public sign-ups) or
outside HTTP. The response does not wait for `write` (`await: true` makes it wait), and a
`write` that throws or rejects goes to `onError` (default: Nest's `Logger`) and never fails the
request.

```ts
createAuditInterceptor({
  write,
  methods: ['POST', 'PUT', 'PATCH', 'DELETE'],     // the default
  ignore: (ctx) => ctx.switchToHttp().getRequest().path.startsWith('/v1/webhooks'),
  redact: ['ssn'],                                 // added to DEFAULT_REDACT_KEYS
  resolveEntity: (ctx, body) => ({ type: ctx.getClass().name, id: (body as { id?: string })?.id }),
  onError: (error, entry) => logger.warn({ error, entry }, 'audit write failed'),
})
```

`@SkipAudit()` on a handler or a controller skips it, the same as `ignore`.

### Audit helpers (`@telamonjs/data`)

The root entry has the two pure helpers the interceptor and hand-written audit calls share.
`redactPayload(value, keys = DEFAULT_REDACT_KEYS)` returns a deep copy with the value of every
secret key replaced by `'[REDACTED]'`. A key is secret when, lowercased and without `-`/`_`, it
contains one of `keys`: `password` catches `newPassword`, `token` catches `REFRESH_TOKEN`, `apikey`
catches `api-key`. Spread `DEFAULT_REDACT_KEYS` to add your own.

`computeDiff(before, after)` returns the fields of `after` that changed, as `{ key: { old, new } }`.
It reads only the keys of `after`, so a partial DTO works; `null` equals `undefined`, dates compare
by instant, a Decimal or numeric string compares as a number, and nested objects and arrays compare
as JSON. `createdAt` and `updatedAt` are skipped (`{ ignore }` replaces that list). Use it where you
already load the record, for an `UPDATE` row with before and after:

```ts
import { computeDiff } from '@telamonjs/data'

const before = await prisma.order.findUniqueOrThrow({ where: { id } })
await prisma.order.update({ where: { id }, data: dto })
const changes = computeDiff(before, dto)   // { status: { old: 'OPEN', new: 'PAID' } }; {} when nothing changed
```

## License

MIT
