---
'@telamonjs/ui': minor
---

`ListPage` gets a `header` slot: bars, alerts or status panels above the toolbar, rendered inside the list's root. In the embedded and infinite-scroll layouts it keeps its own height and the table fills the rest of the panel, so the footer stays at the bottom — no consumer wrapper (`flex h-full min-h-0 flex-col`) needed.
