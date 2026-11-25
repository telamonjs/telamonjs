---
'@telamonjs/ui': minor
'@telamonjs/cli': patch
---

`arrayQueryFn(fetchAll, { searchFields?, filterFields? })`: a `queryFn` for an endpoint that answers a plain array. It searches, filters, sorts and pages the array in memory and resolves a real `PaginatedResponse`, so apps stop hand-writing one-page wrappers. The generated app's `AGENTS.md` points to it.
