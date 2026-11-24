---
'@telamonjs/ui': patch
---

With infinite scroll (the default), `ListPage`'s `urlSync` keeps `page` and `pageSize` out of the
URL and ignores them in a link: every load starts at page 1 with batches of the config's size, so
`pageSize=20` in the URL showed 50 rows. Sort, search and filters still sync.
