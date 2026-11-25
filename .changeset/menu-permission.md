---
'@telamonjs/ui': minor
---

Menu items can declare a `permission` (a string, or an array where any of them grants, like a CrudConfig action's `permission`). Pass `AdminShell` a `can` checker (`can={perm => checker.can(session.user, perm)}` with `@telamonjs/permissions`) and the sidebar and Cmd+K palette show only the items it grants; the breadcrumb still labels routes from the full menu. The same rule is exported as `filterMenuByPermission(menu, can)`, which also drops groups left empty (unless they have an `href`) and stray separators. This replaces the hand-written `filterMenuByPermissions` helpers and custom `permission` fields apps carried until now.
