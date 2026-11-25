---
'@telamonjs/queue': minor
---

New `@telamonjs/queue/metrics` entry point for the Prometheus collectors
(`QueueMetrics`, `OptimizedQueueMetrics`, `MetricsConfig`). `prom-client` now
loads when you construct a collector, not on import, so a plain import of
`@telamonjs/queue` or `@telamonjs/queue/monitoring` (health checks,
`getRedisConnectionMetrics`) no longer loads it. The root re-exports of the
collectors still work and are now marked `@deprecated`: import them from
`@telamonjs/queue/metrics`.
