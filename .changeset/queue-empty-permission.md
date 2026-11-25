---
'@telamonjs/queue': patch
---

`QueueHttpModule.forRoot()` now throws at boot when `readPermission` or `writePermission` is an empty list (or contains an empty `[]` clause), which used to leave the routes open.
