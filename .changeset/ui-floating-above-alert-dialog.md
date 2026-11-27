---
'@telamonjs/ui': patch
---

Select, popover, dropdown menu, tooltip and hover card content opens on `z-[110]`, above the alert dialog (`z-[100]`). A select inside `ConfirmActionDialog`'s `inputs`, or any popover inside an `AlertDialog`, used to open behind the dialog.
