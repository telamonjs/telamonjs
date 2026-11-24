# @telamonjs/data

The server half of a TelamonJS list. A `ListPage` sends page, page size, search, sort and filters.
This package reads them on the endpoint and turns them into a query, with no dependencies and
without React, Next or Prisma.

```bash
pnpm add @telamonjs/data
```

| Entry | What it has | Needs an ORM? |
| --- | --- | --- |
| `@telamonjs/data` | The wire contract (`PaginationParams`, `PaginatedResponse`, `SortField`, `createPaginatedResponse`), `sanitizePaginationParams`, `resolveSort`, `resolveSortPath` | No |
| `@telamonjs/data/prisma` | `buildPrismaOrderBy(Multi)`, `buildSearchConditions`, `buildFilterConditions`, `buildWhereClause`, `createPaginationContext` | Builds Prisma's object shape; never imports `@prisma/client` |

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

## License

MIT
