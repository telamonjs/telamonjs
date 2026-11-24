---
'@telamonjs/ui': minor
---

`JobDetailPage` takes `moduleLabels` and `jobLabel`, like `QueueTabbedDashboard`. Its title and module badge now resolve through the dashboard's label precedence (`jobLabel` > contract `displayName` > formatted name), and the contract's `description` shows below the title. The page's enable switch also gets an accessible name.
