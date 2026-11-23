---
'@telamonjs/ui': minor
---

Queue dashboard: module and job labels (#7).

- `QueueTabbedDashboard` takes `moduleLabels` (module key → `I18nText`), used as the group titles in the Real-time and Configuration tabs. Its key order is the group order.
- Job labels prefer the job contract's `displayName` over the formatted job name, in queue rows, timeline and history rows, job details and modal titles. A new `jobLabel` prop overrides both.
- `moduleIcons` also accepts React nodes and icon components (e.g. Lucide icons), not only emoji strings.
- Both tabs now order module groups the same way (`moduleLabels` order, then alphabetically). The queues table has fixed column widths, so columns line up across groups.
- The "Disabled"/"Inactive" job badges are neutral instead of the blue `secondary` variant.
