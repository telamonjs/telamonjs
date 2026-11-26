---
"@telamonjs/data": patch
---

- Paginated services honor only filter keys declared as own properties of `filters`.
- `createCachedPaginatedService` keys its cache by the service config and the current user's visibility clause, and runs `visibility` once per call. The clause must be deterministic for a given user. A cached service with `beforeQuery`, `afterQuery`, `customFilterOptions` or a filter `transform` is now returned uncached, with a warning. Existing cache entries are not reused after upgrading.
- `createAuditInterceptor` records writes authenticated by an API key (`request.servicePrincipal`) as `service:<id or name>`, and takes the default `entityType` from the matched route (`/v1/orders/:id` → `orders`) instead of the raw URL.
