---
'@telamonjs/queue': patch
---

`QueueHttpModule.forRoot()` accepts `readPermission` and `writePermission`. They
declare, on every GET route (SSE included) and every POST/PATCH route
respectively, the permission metadata that `@telamonjs/permissions`' guard
enforces. Without them, an app with global auth and permissions guards let every
logged-in user dispatch, remove and reconfigure jobs; setting them is
recommended. Omitting both keeps the previous behaviour.

`SchedulerReconciler` now logs a `warn` (job name and error message) when it
fails to read one job's repeatables from Redis, instead of swallowing the error.

`engines.node` is now `>=22.12`: the `require` condition points at the ESM build,
which needs `require(esm)` without a flag.
