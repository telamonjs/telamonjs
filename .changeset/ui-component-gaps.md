---
'@telamonjs/ui': minor
---

Close small component gaps found in consumer workarounds:

- `masked` fields: `maskType` gains the `'cpf'`, `'cnpj'` and `'cep'` presets next to `'tel'` and is typed as that union (any other string still falls back to `mask`).
- `textarea` fields: optional `rows` (default 4).
- `StatCard`: truncated label, subtitle and `tinted` value carry their full text in a `title` tooltip.
- `BarChart`: `allowDecimals` for the value axis and `categoryAxisWidth` for the category axis in `vertical` layout.
- `CalendarWithEvents`: `onMonthChange(month)` fires with the first day of the month the user navigates to.
- `ReportTable`: `showFooter` (default `true`) hides the "Showing X of Y records" line.
- Form grids (`AdminForm`, `BaseForm`, `ZustandForm`, `WizardForm`) collapse to one column below `sm`, and every `grid`/`span` value now ships as a static class (`col-span-3`/`col-span-4` were never generated). Desktop layout is unchanged.
- `useCrudMutations`: the mutation resolves after the invalidated list's first refetch attempt, so dialogs close over a fresh list; a failing refetch still settles on its first failure instead of waiting for retries.
- Dialog header `badge.getLabel` may return an `I18nText` (a `msg()` is resolved), like `badge.labels`.
