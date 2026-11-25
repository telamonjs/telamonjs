# Changelog

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
