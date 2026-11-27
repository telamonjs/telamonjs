---
'@telamonjs/queue': patch
---

The SSE route drops a client that stops reading once 1 MiB of frames is waiting for it, instead of queueing every frame in memory until `sseMaxAgeMs`.
