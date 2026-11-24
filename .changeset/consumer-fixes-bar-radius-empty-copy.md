---
'@telamonjs/ui': patch
---

Four fixes reported by consumer apps:

- `BarChart` rounds the bar's end in `layout='vertical'` (horizontal bars): `[0, 4, 4, 0]` instead of the top corners.
- `ListPage`'s empty state no longer says "Start by adding a new item" when the "New" button is hidden (no `form`, no `dialogs.create`, or `permissions.create` denied). It shows the neutral `list.emptyDescriptionNoCreate` message instead; an explicit `list.emptyDescription` still wins and the search/filter "no results" copy is unchanged.
- The `next-auth` peer is widened from exactly `5.0.0-beta.31` to `^5.0.0-beta.20`, the first v5 beta that accepts Next 15 and React 19 and already has every `next-auth/react` API the package uses.
- `AdminForm` now spaces its sections in the non-flush layout without tabs (a `display: contents` wrapper kept the form's `space-y-6` from reaching them).
