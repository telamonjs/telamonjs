---
'@telamonjs/ui': patch
---

The view dialog footer now follows the row actions: **Edit** is hidden when `standard.edit` is `false`, and both **Edit** and **Delete** honor the action's `permission` (against `userPermissions`) and its `visible`/`enabled` for the record — evaluated against the list row, or the fetched record on a deep link. Before, the footer offered Edit whenever `dialogs.edit` existed and Delete whenever `standard.delete` was set, so users who could not edit or delete a row from the table still got the buttons in the dialog. `ViewDialog` gains the optional `canEdit`/`canDelete` gates (also accepted by `CrudViewDialog`'s `footer`).
