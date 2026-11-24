---
'@telamonjs/ui': patch
---

Queue Real-time timeline: rows no longer overlap when a job label is long (for example a contract
`description` used as the display name). The label truncates with a tooltip, the duration keeps its
width, and the virtualized rows are measured instead of pinned to a fixed height.
