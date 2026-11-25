---
'@telamonjs/ui': minor
---

`activeFilter(key = 'active', overrides?)`: a ready-made All / Active / Inactive toolbar filter for a boolean column, labelled by the library messages, sending `?<key>=true|false` (nothing for "All", `allValue: 'all'`).

`date` fields: `minDate`/`maxDate` also take another field, `{ field, offsetDays? }` (`{ field: 'start', offsetDays: 1 }` = strictly after it). The calendar follows that field as it changes, and the form rejects a typed day outside.
