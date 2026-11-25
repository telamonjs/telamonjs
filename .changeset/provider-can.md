---
'@telamonjs/ui': minor
---

`PermissionsProvider`: give the session's permission checker once instead of injecting it into every CrudConfig.

```tsx
<PermissionsProvider can={perm => checker.can(session?.user, perm)}>
  <AdminShell menuConfig={menuConfig}>{children}</AdminShell>
</PermissionsProvider>
```

- Every `ListPage` below checks `config.permissions.*` and action `permission`s with it (row actions, the view dialog footer, portal section saving), and `AdminShell` filters the menu with it.
- A checker the config declares itself (`permissions.can`, `actionsConfig.can`, `actionsConfig.userPermissions`) wins, and so does `AdminShell`'s own `can`. Without a provider nothing changes.
- New `permissions.export` on `CrudPermissions`: gates the toolbar export menu (`list.enableExport` / `list.onExport`) the same way `create` gates the "New" button.
