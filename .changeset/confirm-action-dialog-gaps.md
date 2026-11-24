---
'@telamonjs/ui': minor
---

`ConfirmActionDialog` covers what apps kept local copies for. All additions are optional; `children` is still the trigger.

- `body`: free content between the description and the buttons.
- `confirmDisabled`: disables only the confirm button, from the caller's state.
- `pending` + `pendingText`: caller-controlled pending. Passing `pending` (even `false`) means confirming never closes the dialog; the caller closes it when its mutation settles. While `true`, both buttons are disabled, the confirm shows a spinner and `pendingText`, and the dialog cannot be dismissed. Without `pending` the dialog keeps awaiting `onConfirm` and closing on success; `pendingText` labels that pending state too.
- `title` / `description` accept JSX as well as text or `msg()`.
- `ConfirmDialogInput` (also used by `confirmDialog.inputs` on row and menu actions) gains `type: 'date'` (native input, `YYYY-MM-DD`) and `validate(value, values) => I18nText | undefined`, shown as the field error and blocking the confirm.

Migrating a local `ConfirmActionDialog` / `ConfirmFormDialog` copy (open/onOpenChange, pending, JSX title):

| Local prop | Public prop |
| --- | --- |
| `open`, `onOpenChange`, `title`, `description`, `confirmText`, `pendingText`, `pending`, `variant`, `confirmDisabled`, `onConfirm` | same name, same meaning |
| `children` (content between description and buttons) | `body` |
| hard-coded "Confirmar" / "Cancelar" | localized defaults (or `confirmText` / `cancelText`) |

Behaviour differences: with `pending` set, ESC and the overlay no longer dismiss the dialog while pending (the local copies only disabled Cancel), and a promise rejected by `onConfirm` is shown inside the dialog.
