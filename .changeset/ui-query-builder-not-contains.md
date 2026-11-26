---
'@telamonjs/ui': patch
---

The query builder's "does not contain" condition emits `{ NOT: { field: { contains, mode } } }`.
It used to emit `{ field: { not: { contains, mode } } }`, which Prisma rejects (a `not` filter takes
no `mode`), so applying that condition failed the list query.
