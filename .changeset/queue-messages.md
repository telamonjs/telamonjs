---
'@telamonjs/queue': patch
---

`createSSEBroadcaster` logs a warning (`SSEBroadcaster failed to unsubscribe on teardown`)
when UNSUBSCRIBE fails while the last client leaves, instead of swallowing the error.

API messages are now English: `GET /v1/queue/history/all` answers 400 with
`Invalid startDate: use ISO 8601` / `Invalid endDate: use ISO 8601` (was
`startDate inválido: ...` / `endDate inválido: ...`), and cleaning all queues (`*`) with
some failures reports `Cleaned N jobs across M queues (K failed)` (was `(K falharam)`).
Update any client that matched on the old text.
