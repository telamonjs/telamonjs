---
'@telamonjs/ui': minor
---

New public `ConfirmActionDialog`: the confirmation behind `confirmDialog` on row and menu actions, now exported for any button. It stays open while `onConfirm` is pending (spinner, disabled buttons, no dismiss), closes when it resolves, and stays open showing the error when it rejects (resolve `false` to stay open without a message). It also renders optional `inputs`.

`confirmDialog.inputs` (`ConfirmDialogInput`: `text`, `textarea`, `select`) were typed but never rendered; they now render, required ones block the confirm while empty, and their values reach the action as a second argument — `handler(row, { inputs })` / `onClick(row, { inputs })` (`ActionContext`), passed only when inputs are declared so existing handlers keep receiving the row alone. `ConfirmDialogInput.label` accepts `I18nText`. A row action whose confirmed run fails keeps its error toast and now leaves the dialog open for a retry instead of closing it.
