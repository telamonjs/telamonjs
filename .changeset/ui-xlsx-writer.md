---
'@telamonjs/ui': minor
'@telamonjs/cli': patch
---

Excel export no longer depends on SheetJS: the `xlsx` peer is gone. npm only carries `xlsx` 0.18.5, flagged by CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS), and the fixed builds are published outside the registry. `exportToExcel` now writes the workbook itself (OOXML parts, zipped with the platform `CompressionStream`), with no dependency at all.

- Same output: columns, headers, cell values, filename, sheet name and 10–50 character column widths. The header row is now really bold on a light gray fill (SheetJS community silently ignored that styling).
- Sheet names follow Excel's rules instead of throwing: at most 31 characters, `\ / ? * [ ] :` become spaces.
- `exportToExcel` and `exportTableData` return a `Promise<void>` that resolves once the download starts (they returned `void`); await it to catch failures.

**Apps:** nothing to change. `xlsx` can be removed from the app's dependencies (`pnpm remove xlsx`) unless the app uses it directly. New apps from `create-telamonjs-app` no longer list it.
