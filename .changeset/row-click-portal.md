---
'@telamonjs/ui': patch
---

Clicking inside a row action's confirm dialog (its title, an `inputs` field) no longer opens the row's view dialog behind it, which left the confirm buttons unclickable. React bubbles clicks from portaled content (dialogs, the "..." menu, popovers) through the component tree, so they reached the row's click handler. `InfiniteList`, `DataTable` (table rows), `VirtualDataTable` and `MobileCard` now only treat clicks inside the row's own DOM as row clicks, and ignore links and form fields as well as buttons and checkboxes. `VirtualDataTable` rows previously reacted to every click, buttons included.
