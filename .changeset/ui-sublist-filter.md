---
'@telamonjs/ui': patch
---

Fix: the desktop "Filter..." field of `SubList` (the list inside a `crud` field) did not filter. Its table, pagination and toolbar were memoized on the TanStack table instance, which never changes identity, so they skipped every filter, page and column-visibility change. They now re-render with the list.
