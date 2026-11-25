---
'@telamonjs/ui': patch
---

- Paginated `ListPage` (`list.infiniteScroll: false`) now honors `list.defaultPageSize`, `list.defaultSortBy`/`defaultSortOrder` and, with `urlSync`, a link's `page`/`pageSize`/`sortBy`/`sortOrder`/`search`. The `DataTable` created the table first with the store defaults (10 rows, no sort), so the first query and the URL ignored them.
- `ListPage` with `urlSync` follows the URL after mount: Back/Forward and a link to the same page now update page, page size, sort, search, `urlFilters` and the toolbar filters listed in them (and refetch), instead of keeping the state read at mount. Returning to the page through a link that carries the list's params applies them, where the state left by the previous visit used to overwrite the link. Params the list does not own (`useUrlFilters`, dialogs) are left alone.
