---
'@telamonjs/ui': minor
---

`CrudConfig.permissions` no longer fails open silently.

- In development, `ListPage` warns once per config when `permissions` declares operations but there is no way to check them (neither `permissions.can`, `actionsConfig.can` nor `actionsConfig.userPermissions`), which means every write button shows. Production behaviour is unchanged.
- New opt-in `permissions.failClosed` (same name and meaning as in `@telamonjs/permissions`): with no checker, every declared operation and every action `permission` is denied instead of allowed — useful while the session that feeds `can` is still loading. Default `false`.
- `applyCrudPermissions` now checks against the `actionsConfig` the list actually uses (it read `config.actionsConfig` for the dialogs only).
