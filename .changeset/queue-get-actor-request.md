---
'@telamonjs/queue': patch
---

`GetActorFn` no longer requires Express 5's `Request` type: it takes the minimal `ActorRequest`
(`headers`, optional `user`, now exported from `@telamonjs/queue/nestjs`) and accepts a callback
typed with the app's own Express 4 or 5 `Request`.
