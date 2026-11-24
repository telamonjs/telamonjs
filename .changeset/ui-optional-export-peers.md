---
'@telamonjs/ui': minor
'@telamonjs/cli': patch
---

Export peers are lazy and optional.

- `papaparse` is no longer a peer: `exportToCSV` writes RFC 4180 CSV itself (UTF-8 BOM, CRLF, same quoting). Columns that share a header no longer collapse into one.
- `jspdf` and `jspdf-autotable` are now **optional** peers (`peerDependenciesMeta`), loaded with `import()` only when a PDF is exported. Without them the app still builds, and the PDF export fails with a localized toast naming the packages to install (new message `data.exportMissingPeer`) instead of a module-not-found error. `exportToPDF` returns a `Promise<void>` (it returned `void`) and rejects with an error naming both packages.
- `scripts/check-lazy-deps.mjs` now fails the build if any file in `dist/` statically imports an optional peer.

**Apps:** nothing to change; PDF export keeps working where `jspdf` + `jspdf-autotable` are installed. Apps that never export PDF can drop them, and every app can drop `papaparse` and `@types/papaparse` unless it uses them directly. New apps from `create-telamonjs-app` keep the `jspdf` pair and no longer list `papaparse`.
