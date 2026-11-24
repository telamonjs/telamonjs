---
'@telamonjs/ui': patch
---

ListPage: closing a deep-linked dialog (`?view=<id>`) no longer reopens it when the
set of dialog URL params changes during the close — e.g. `permissions` enabling
`edit`/`create` as the session arrives. The first Escape now always closes the dialog
and clears the param. The URL ↔ dialog sync compares what the URL asks for, not the
spelling of the configured params.
