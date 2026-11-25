---
'@telamonjs/queue': patch
---

Harden the Bull Board dashboard and the HTTP backend against bad configuration and bad input.

- `createDashboardRouter` now enforces `auth`: with `auth.enabled`, every request under `basePath` needs HTTP basic credentials, exactly like `startDashboard`. It previously ignored `auth` and served the board unprotected.
- `auth.enabled` without a non-empty `username` and `password` now throws a `ConfigurationError` at startup, in both functions, instead of silently skipping auth. The username is no longer logged.
- `startDashboard` no longer installs a SIGTERM handler (it called `process.exit(0)`, killing workers in the same process and skipping the app's own shutdown, and stacked a listener per call). It still returns the Express app, now with the listening HTTP `server` attached: close it from your own shutdown sequence.
- List routes (`jobs`, `jobs/all`, `history`, `history/all`, `config/:jobName/history`) reject a `limit` outside 1–500, a negative `offset`, a non-numeric value and an unknown `state`/`status` with 400, instead of fetching a whole set (`limit=0`) or failing with a 500.
- `PATCH config/:jobName` returns 404 for an unknown job instead of creating a config, and validates its body (`cronPattern` a valid cron pattern, `priority` 1–10, positive integer `concurrency`/`timeout`); the toggle routes require a boolean `enabled` (a missing body was stored as the string `"undefined"`). Invalid input returns 400.
- `retry-all` reports per-job retry failures in the response's `errors` and logs them at warn; a failed orphan prune is logged at warn instead of swallowed; `checkRedisHealth` returns the ping error message in `error`.
- `isValidCronPattern` validates with `cron-parser`, the parser BullMQ uses for repeatable jobs: names (`MON-FRI`, `JAN`), `?`, `L` and a leading seconds field are accepted exactly when BullMQ accepts them. It used to reject day and month names.
