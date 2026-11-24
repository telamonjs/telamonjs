---
'@telamonjs/ui': minor
---

Sort by data paths: opt-in `list.sortParam` and server helpers that read both wire forms.

**Client.** `list.sortParam: 'path'` makes `ListPage` send a column's `accessorKey` with its dots
(`customer.name`, `_count.items`) as `sortBy`, instead of TanStack's column id (`customer_name`,
`_count_items`). Columns without an `accessorKey` keep sending their `id`. It applies to `queryFn`,
`exportAll`, `list.onExport`, `toolbarContent` and the `urlSync` URL. The default stays `'id'`, so
nothing changes on the wire until a list opts in; `'path'` becomes the default in the next major.
Stored sorts accept both forms in both modes: `defaultSortBy: 'customer.name'` and saved views now
highlight the right header (before, a dotted stored field showed no arrow and a header click added
a second sort entry).

**Backend contract.** `'id'`: `sortBy` is the column id, a dotted `accessorKey` with `.` → `_`.
`'path'`: `sortBy` is the data path; order `_count.<relation>` with `{ <relation>: { _count: dir } }`.
Before opting in, make sure the endpoint accepts the dotted form: a whitelist keyed by
`customer_name` falls back to its default order for `customer.name` — add the dotted key alongside.

**Server helpers.** `buildPrismaOrderBy` / `buildPrismaOrderByMulti` take an optional
`sortableFields` and read both forms: a value with a dot is used as-is (underscores kept, e.g.
`order_item.created_at`); `_count.x` / `_count_x` produce Prisma's relation-count order; a listed
value is used as-is (`created_at` stays a column); other underscored values are decoded as legacy
ids (`customer_name` → `customer.name`) — with `sortableFields`, only when the decoded path is listed.
`createPaginatedService` passes its `sortableFields` through, and `sortableFields` now accepts a
legacy id whose dotted form is listed (a dotted entry was rejected before, contrary to its docs).

Behaviour changes for helper callers: `_count`/leading-underscore fields now build valid Prisma
(they produced an empty key before); a value mixing dots and underscores is no longer re-split on
its underscores; a `sortableFields` entry in `_` form (`customer_name`) is now taken as a scalar —
list the dotted path (`customer.name`) instead.
