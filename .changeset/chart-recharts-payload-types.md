---
'@telamonjs/ui': patch
---

`ChartTooltipContent` and `ChartLegendContent` type their `payload` (and the tooltip's `active`
and `label`) with recharts' own `TooltipContentProps` and `LegendPayload` instead of a hand-written
copy, so the payload recharts hands to `content` type-checks as-is and future recharts minors no
longer break the build. `formatter` now receives recharts' documented fifth argument, the whole
tooltip payload, instead of the hovered data row (still available as `item.payload`).
