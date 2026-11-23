---
'@telamonjs/queue': minor
---

DLQ retention, BullMQ job schedulers and Express 5 support.

- `DeadLetterQueue` accepts optional retention (`DeadLetterQueueOptions`: `maxAge` in ms and/or `maxLen`), applied every time an entry is added, and gains `purgeOlderThan(ms)`, which returns the number of entries removed. `QueueManager` forwards it through the new `dlqRetention` config option. Without either option the DLQ keeps entries until they are deleted, retried or cleared, as before.
- `SchedulerReconciler` now schedules through BullMQ job schedulers (`upsertJobScheduler` / `removeJobScheduler` / `getJobSchedulers`) instead of the deprecated repeatable API. On the first reconcile after the upgrade, every legacy repeatable of a managed job is removed together with its pending run before the scheduler is upserted, so existing deployments never run a job twice. The reconcile summary keeps its `added` / `removed` / `updated` meaning.
- `express` and `@types/express` now accept `^4 || ^5`, so the Bull Board dashboard shares a Nest 11 app's Express 5.
- Docs recommend importing `QueueMetrics` / `OptimizedQueueMetrics` from `@telamonjs/queue/monitoring`; the root re-export stays for compatibility.
