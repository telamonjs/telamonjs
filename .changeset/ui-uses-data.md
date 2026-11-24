---
'@telamonjs/ui': patch
---

`@telamonjs/ui/server` and the pagination types re-export `@telamonjs/data`, the new
dependency-free package for the server half of a list, so a Next.js app and its backend share one
definition. Nothing to change in apps: every name and behavior stays, and `getFilterOptions` still
labels boolean options in the library's locale (pt-BR by default).
