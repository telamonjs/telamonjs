---
'@telamonjs/ui': minor
---

`@telamonjs/ui/queue` exports `QueueDashboardHeader` and the type `JobStatusConfig`, names that
don't clash with the root barrel. Its `DashboardHeader` and `StatusConfig` stay exported but are
deprecated: the root barrel has different symbols under those names.
