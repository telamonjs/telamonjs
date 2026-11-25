---
'@telamonjs/ui': patch
---

- Paginated `ListPage` (`list.infiniteScroll: false`) now honors `list.defaultPageSize`, `list.defaultSortBy`/`defaultSortOrder` and, with `urlSync`, a link's `page`/`pageSize`/`sortBy`/`sortOrder`/`search`. The `DataTable` created the table first with the store defaults (10 rows, no sort), so the first query and the URL ignored them.
