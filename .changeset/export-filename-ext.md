---
'@telamonjs/ui': patch
---

Exports drop a known extension (`.csv`, `.xls`, `.xlsx`, `.pdf`) from `exportFilename` before
adding the date and the format's own extension: `'report.csv'` exported as Excel used to save
`report.csv_<date>.xlsx`.
