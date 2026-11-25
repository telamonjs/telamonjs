---
'@telamonjs/ui': minor
---

Add `PermissionMatrix` and `AuditChangesViewer`, the first data-agnostic admin building blocks.

- `PermissionMatrix`: roles × permissions grid of checkboxes grouped by permission group, with search, sticky header and first column, per-group "select all", system roles read-only by default, and an async `onToggle` that shows the cell optimistically, marks it busy and rolls back with a toast on failure.
- `AuditChangesViewer`: renders an audit payload, whether a `{ field: { old, new } }` (or `{ before, after }`) diff, `before`/`after` snapshots diffed field by field with a "show all" toggle, or a plain object with collapsible nested JSON. Password/token/secret-like keys are masked by default; `redactKeys` adds more.
