---
'@telamonjs/ui': patch
---

Fix: an indeterminate `Checkbox` (e.g. a `PermissionMatrix` group with only some permissions granted) drew a check, which read as "all granted". It now draws a dash.
