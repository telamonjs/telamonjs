---
'@telamonjs/ui': patch
---

`ListPage` with `urlSync` keeps `pageSize` and the sort in the URL when a deep link already
carries them: 1.4.1 skipped the second write of the mount (back to the URL being opened) while
the first one, with the store's defaults, was still in flight, so the URL ended on the defaults.
`useUrlSync` now compares a write against its own pending navigation.
