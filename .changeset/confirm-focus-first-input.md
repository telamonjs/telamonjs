---
'@telamonjs/ui': patch
---

`ConfirmActionDialog` (and `confirmDialog.inputs` on row actions) focuses the first input on open,
so a reason can be typed right away. Without inputs, focus still starts on Cancel.
