# @telamonjs/data

The server half of a TelamonJS list. A `ListPage` sends page, page size, search, sort and filters.
This package reads them on the endpoint and turns them into a query, with no dependencies and
without React, Next or Prisma. A NestJS API also gets the Prisma exception filter and health
endpoint every API repeats.

```bash
pnpm add @telamonjs/data
```

| Entry | What it has | Needs an ORM? |
| --- | --- | --- |
| `@telamonjs/data` | The wire contract (`PaginationParams`, `PaginatedResponse`, `SortField`, `createPaginatedResponse`), `sanitizePaginationParams`, `resolveSort`, `resolveSortPath` | No |
| `@telamonjs/data/prisma` | `buildPrismaOrderBy(Multi)`, `buildSearchConditions`, `buildFilterConditions`, `buildWhereClause`, `createPaginationContext` | Builds Prisma's object shape; never imports `@prisma/client` |
| `@telamonjs/data/nest` | `PrismaExceptionFilter`, `HealthModule`, `isPrismaKnownRequestError`, `isPrismaValidationError` | Needs `@nestjs/common` (optional peer); never imports `@prisma/client` |

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

Needs `@nestjs/common` 10 or 11, an optional peer that only this entry imports.

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

## License

MIT
