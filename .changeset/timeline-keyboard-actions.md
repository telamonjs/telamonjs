---
'@telamonjs/ui': patch
---

Queue dashboard real-time timeline (`QueueDashboard`): job rows are now buttons (Tab, Enter/Space
open the details, visible focus ring) inside a list, and the row actions work: retry calls the
adapter's `retryJob` (failed jobs only; hidden for `manualRetry: false` queues), remove calls
`removeJob` after an inline confirmation (not offered for active jobs), both with the same toasts
as the jobs list, and both hidden under `readOnly`. The actions also appear on keyboard focus, not
only on hover. The hardcoded `#REPEAT` tag is gone; a "Recurring" badge marks only job scheduler /
repeatable iterations. The timeline details (and its expanded view) and `DispatchJobModal` close
on Escape and are announced as modal dialogs.
