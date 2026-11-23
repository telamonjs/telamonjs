---
'@telamonjs/ui': minor
---

Toolbar filters (`list.toolbar.filters`) gain `allValue`, the explicit "no filter" value: it is dropped from the query, shown when nothing is selected and targeted by resets (chips, toggling a button off). With it, the first option is an ordinary option (rendered as a button), `'todos'`/`'all'` are ordinary values, and `defaultValue` applies even when it equals the first option. `TabToolbar.FilterButtons` accepts the same `allValue`. Filters without `allValue` keep the previous rules.
