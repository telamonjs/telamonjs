---
'@telamonjs/data': patch
---

A `'boolean'` filter whose `transform` returns a where fragment (a relation filter such as
`{ some: {} }`) now applies that fragment. It used to be coerced to `false`, so the filter
produced `{ hasOrders: false }` instead of `{ hasOrders: { some: {} } }`. `transform` is typed to
allow that return (`FilterValue | Record<string, unknown>`).
