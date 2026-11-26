---
'@telamonjs/data': minor
---

The ORM-agnostic types `AuthUser`, `FilterFieldConfig`, `FilterFieldType`, `FilterValue`,
`FilterOption` and `FilterLabels` are now exported from `@telamonjs/data` too (`/prisma` keeps
re-exporting them). `AuthUser.role` accepts a bare code or an object carrying one
(`string | { code: string }`), so the `RoleInfo` of `@telamonjs/auth` fits without a cast, and
`PaginatedService.list` is typed as `Promise<PaginatedResponse<T>>` (same shape as before).
