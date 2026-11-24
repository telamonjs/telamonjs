---
'@telamonjs/ui': patch
---

`ListPage` with `urlSync` opens a link in the state it carries: `page`, `pageSize`, `sortBy`/
`sortOrder` and `search` from the URL win over the config defaults on mount. Before, they were
only written, so a shared or reloaded link fell back to the defaults. Invalid values are ignored.
