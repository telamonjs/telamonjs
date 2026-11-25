---
'@telamonjs/data': patch
---

`createCachedPaginatedService` no longer shares cached pages or filter options between users when the service has a `visibility` rule: the cache key now includes the signed-in user's id, and nothing is cached when nobody is signed in. Services without `visibility` keep their existing keys.

`sanitizePaginationParams` now treats a non-numeric or non-finite `page`/`pageSize` (such as `?page=abc`) as page 1 and the default page size, instead of sending `NaN` to the query.

`buildIncludeClause` returns a new object instead of adding `_count` to the `include` you passed in.

Filter options now count distinct values with a Prisma `groupBy` instead of loading every row of the table; the returned options are unchanged.
