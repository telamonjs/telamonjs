---
'@telamonjs/ui': minor
---

`@telamonjs/ui/queue` exports `QueueDashboardHeader` and the type `JobStatusConfig`, names that
don't clash with the root barrel. Its `DashboardHeader` and `StatusConfig` stay exported but are
deprecated: the root barrel has different symbols under those names.

The last hardcoded neutrals follow dark mode through theme tokens, with the same light look: the
`Stepper` connectors and progress track, the `ZustandFormServer` loading skeleton, the
`ZustandForm` section dots, the sub-list's inactive dot, the `SkeletonCard` stripe, the `range`
field track, and the `ghost-info` button hover (`hover:bg-slate-500 hover:text-white` →
`hover:bg-muted-foreground hover:text-background`).
