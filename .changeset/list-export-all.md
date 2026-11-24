---
'@telamonjs/ui': minor
---

`ListPage` export can cover every matching row, or hand the export to the app. The default is unchanged: "All" exports the rows already loaded.

- `list.exportAll: true | { pageSize?, maxRows? }`: "All" fetches every row matching the current search, filters and sort through `query.queryFn`, page by page and sequentially, honoring `totalPages`. A progress toast offers Cancel. Rows are capped at `maxRows` (default 10 000), with a warning when the file holds fewer rows than the server total. Requests use `exportAll.pageSize`, else `defaultPageSize` (50).
- `list.onExport(state: ListQueryState, format)`: an app-side export (e.g. a server-generated file). The menu lists the formats only and calls it with the same query `toolbarContent` receives. It wins over `exportAll`, shows the menu without `enableExport`, and errors show the export error toast.
- `list.exportFormats` picks the formats offered.
- `ExportMenu` gains `loadAll` (+ `allCount`) and `onServerExport`, and `DataTable` gains `exportMenuProps` to pass them through. New public `fetchAllPages()` helper and `ExportFormat`, `ExportLoadAllContext`, `ExportAllOptions`, `FetchAllPagesOptions`, `DataTableExportMenuProps` types.

Fix: the paginated `ListPage` (`infiniteScroll: false`) no longer exports through a raw `Object.values` CSV without headers. It uses the same Excel/CSV/PDF menu as the infinite list, with the list's columns and filename, now also available below `lg` through a compact trigger.
