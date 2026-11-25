# Changelog

## 1.3.1

### Patch Changes

- 37733ee: Fix: `HealthModule` crashed a Nest 10 app at boot when it used `@nestjs/swagger` 7 ("Cannot read properties of undefined (reading '0')"): the published controller carried no route param types, which Swagger reads. They are now declared explicitly, regardless of how the package or the app is compiled.

## 1.3.0

### Minor Changes

- d33c1fc: `HealthModule.forRoot({ downStatus })`: the status code when a check is down (default 503). `downStatus: 200` keeps 200 for Docker/CI health checks that read only the body.

## 1.2.0

### Minor Changes

- 91e6434: Audit trail: `createAuditInterceptor()` and `@SkipAudit()` in `@telamonjs/data/nest` hand every successful, authenticated mutation to your `write` as an `AuditEntry` (user, impersonator, action, entity, redacted body, IP, user agent, method, path, status), without blocking the response or failing it when the write fails. The root entry gains the pure helpers `computeDiff`, `redactPayload` and `DEFAULT_REDACT_KEYS`. `rxjs` joins `@nestjs/common` as an optional peer of the `./nest` entry.

## 1.1.0

### Minor Changes

- 5fd314b: New `@telamonjs/data/nest` entry (needs `@nestjs/common` 10 or 11, an optional peer; never imports `@prisma/client`). `PrismaExceptionFilter` answers Prisma errors with HTTP statuses (P2002 → 409 with `field`, P2003 → 400, P2025 → 404, P2011/P2012/P2014 and validation errors → 400, P1000–P1003 → 503, other codes → 500 logged), matching them by shape so only Prisma errors reach it; English messages, overridable per code with `messages`. `HealthModule.forRoot({ checks, inject?, imports?, path?, decorators? })` serves `GET /health` with `{ status, timestamp, uptime, <check>: 'connected' | 'disconnected' }` and answers 503 when a check is down. The monorepo template's API now uses both instead of its own filter and health controller, and requires Node 22.12+.

## 1.0.1

### Patch Changes

- 5d52681: `createCachedPaginatedService` no longer shares cached pages or filter options between users when the service has a `visibility` rule: the cache key now includes the signed-in user's id, and nothing is cached when nobody is signed in. Services without `visibility` keep their existing keys.

  `sanitizePaginationParams` now treats a non-numeric or non-finite `page`/`pageSize` (such as `?page=abc`) as page 1 and the default page size, instead of sending `NaN` to the query.

  `buildIncludeClause` returns a new object instead of adding `_count` to the `include` you passed in.

  Filter options now count distinct values with a Prisma `groupBy` instead of loading every row of the table; the returned options are unchanged.

## 1.0.0

### Major Changes

- First release: the server half of a TelamonJS list, moved out of `@telamonjs/ui/server` so a
  backend uses it without installing React.
  - `@telamonjs/data`: the `ListPage` wire contract (`PaginationParams`, `PaginatedResponse`,
    `SortField`, `createPaginatedResponse`), `sanitizePaginationParams`, and `resolveSort` /
    `resolveSortPath`, which read both sort wire formats (`customer.name` and the TanStack id
    `customer_name`) and validate them against `sortableFields`.
  - `@telamonjs/data/prisma`: `buildPrismaOrderBy` / `buildPrismaOrderByMulti` (relation counts
    with `_count.x`), `buildSearchConditions` / `buildFilterConditions` / `buildWhereClause`
    (search, filters, `baseWhere` and visibility combined with `AND`), and
    `createPaginationContext`.
  - Zero dependencies and no React, Next or Prisma import. The boolean filter labels are injected
    (`filterLabels`, English by default), and configuration warnings go to `onWarning`.
