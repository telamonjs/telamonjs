---
'@telamonjs/ui': patch
---

A menu item's `permission` accepts readonly arrays (`string | readonly string[]`), so an app can narrow it to its own permission union, `as const` arrays included, without `Omit`.
