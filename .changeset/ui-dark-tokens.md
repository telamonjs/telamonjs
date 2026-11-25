---
'@telamonjs/ui': minor
---

Shell, tabs, breadcrumb, page content and charts follow the theme in dark mode. Hardcoded light
neutrals became theme tokens with the same light look: the `AdminShell` content column
(`bg-slate-50/50` → `bg-muted/30`) and header border (`border-border/60`), the mobile breadcrumb
home link, `PageContent`'s card, the `ContentTabs` underline/pill/glass/gradient variants and the
`TabsList` track (`bg-border`). `LineChart`, `AreaChart`, `BarChart`, `PieChart` and `ChartWidget`
paint axes and ticks with `--muted-foreground`, grid lines with `--border` and the tooltip with
`--background`/`--border`, instead of Recharts' light-only defaults. App CSS that re-tinted these
under `.dark` with `!important` can go.

New `ThemeToggle` (light/dark button on next-themes, translated `shell.toggleTheme` label) and an
opt-in `AdminShell` `themeToggle` prop that shows it in the header (default `false`).
