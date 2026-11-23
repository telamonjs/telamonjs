---
'@telamonjs/ui': minor
---

`ListPage`'s `toolbarContent` also accepts a function that receives the list's current query (`ListQueryState`: `search`, `filters`, `sorting` and the `params` the list passes to `query.queryFn`), so an app's own export/PDF button can fetch exactly what the list shows. The plain `ReactNode` form keeps working.
