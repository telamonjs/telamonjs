---
'@telamonjs/ui': patch
---

Fix: the saved views "Share" link now works. It used `?view=`, which `ListPage` reads as the view dialog's entity id, and nothing applied it; it now uses `?sharedView=`, and opening the link applies the view once and removes the param (a broken link shows an error). Also: the query builder shows a number value of `0` instead of an empty input.
