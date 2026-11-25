---
'@telamonjs/ui': patch
'@telamonjs/cli': patch
---

`@telamonjs/ui` no longer lists `framer-motion` or `@prisma/client` as peer dependencies: only `DashboardFullscreen` used framer-motion (for a fade-in, now CSS), and nothing imports `@prisma/client` (the server helpers build Prisma's object shape). Apps can drop both if nothing else of theirs uses them. Generated apps no longer install `framer-motion`.
