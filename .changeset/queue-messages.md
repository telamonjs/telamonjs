---
'@telamonjs/queue': patch
---

`createSSEBroadcaster` logs a warning (`SSEBroadcaster failed to unsubscribe on teardown`)
when UNSUBSCRIBE fails while the last client leaves, instead of swallowing the error.
