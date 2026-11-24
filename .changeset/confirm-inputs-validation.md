---
'@telamonjs/ui': minor
---

`ConfirmActionDialog` and `confirmDialog.inputs`: length, date and native field options, and an opt-in "disabled until valid" mode.

- `ConfirmDialogInput` gains `minLength`/`maxLength` (on the trimmed value; `minLength` checks an optional field only once it is filled), `min`/`max` for `date` (set on the native input and validated), `options` as `{ value, label }` (new `ConfirmDialogOption`; plain strings still work), `placeholder`, `description` (help text announced with the field), `rows` for `textarea`, `suggestions` for `text` (a native `<datalist>`) and the native `inputMode`/`autoComplete`.
- A `minLength`/`maxLength` input shows how many characters are missing or over as the user types, before any confirm attempt (new `validation.charactersMissing`/`charactersOver` messages in pt-BR, en and es).
- New `disableUntilValid` (on `ConfirmActionDialog` and on `ConfirmDialogConfig`): the confirm stays disabled while any input fails, and every failing field shows its message live — muted until edited, as an error once edited or after an attempt — so the reason is always visible. Without it, nothing changes: the confirm stays enabled and messages show from the first attempt, as in 1.2.
