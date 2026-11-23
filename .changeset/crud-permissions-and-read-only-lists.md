---
'@telamonjs/ui': minor
---

`CrudConfig` gains an optional `permissions` model (`CrudPermissions`): `create`, `edit`, `delete` and `view` name the permission each operation needs, checked with `can` (e.g. `perm => checker.can(user, perm)` from `@telamonjs/permissions`, so bypass roles and wildcards work) or, without it, against `actionsConfig.userPermissions`. It gates the "New" button and the create dialog, the row view/edit/delete (including the edit/view actions `ListPage` injects for `dialogs.edit`/`dialogs.view`), the view dialog footer, the edit dialog, the `?create`/`?edit`/`?view` deep links and `dialogs.view.portal.onSaveSection` (also in `CrudViewDialog`). `DataTableActionsConfig` gains `can`, which decides every action `permission` instead of the exact lookup in `userPermissions`.

`CrudConfig.form` and `FormConfig.validation` are now optional. A read-only list drops `form` (no more `validation: undefined as any`): `ListPage` then offers no "New" button and no create or edit dialog. Configs without `permissions` and with a `form` behave exactly as before.
