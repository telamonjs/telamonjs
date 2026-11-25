---
'@telamonjs/ui': minor
---

New `@telamonjs/ui/menu` entry point: `filterMenuByPermission` and the menu types (`MenuItem`, `SingleMenuItem`, `GroupMenuItem`, …) with no React or Next.js import, so a menu config in a plain module and its unit tests no longer fail with "Cannot find module 'next/navigation'" from the root barrel. `useCrudMutations` takes a config with any `TResult` (`CrudConfig<T, TFormData, TResult>`), like `ListPage`.
