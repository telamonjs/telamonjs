# Changelog

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
