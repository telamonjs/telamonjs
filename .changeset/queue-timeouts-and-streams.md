---
"@telamonjs/queue": minor
---

- A job's `timeout` is now enforced: an attempt that runs past it fails with `JobTimeoutError`, frees its worker slot and retries or goes to the DLQ as usual. The value comes from the dashboard config, then the enqueue options, then the class's `options.timeout` (previously ignored). `process(data, ctx)` receives `ctx.signal`, aborted at the deadline. A handler that ignores it keeps running while the retry starts, so handlers with side effects should honor the signal or be idempotent.
- `GET /queue/events` ends each stream after `sseMaxAgeMs` (new `QueueHttpModule.forRoot()` option, 5 minutes by default) with a final `event: reconnect` frame, so clients go through the guards again on reconnect. The ui dashboard reconnects on its own; a custom SSE client must reconnect when the stream ends. Streams closed while a guard is still running, or whose client stopped reading, are released.
- Manual dispatch enqueues the contract schema's parsed output: undeclared keys are dropped (unless the schema uses `.passthrough()`) and defaults and transforms apply.
- `GET /queue/history/all` treats `statuses` as a set.
- `JobConfigStore`, `JobEventPublisher` and `createSSEBroadcaster` accept a `prefix` option that scopes config keys and the events channel per app (default unchanged: `telamonjs`). An existing app that adopts a new prefix should pass `keyPrefix: 'telamonjs:config:'`, or move its keys, to keep its dashboard edits.
- Clearing a job's cron pattern, concurrency, timeout or description from the dashboard now removes the stored value.
