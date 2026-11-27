---
'@telamonjs/cli': patch
---

Generated apps: the production compose maps the chosen port to the image's port 3001, so `--port` other than 3001 works in Docker. A MySQL app starts without the bundled PostgreSQL migration, which Prisma refused (P3019); the setup names the first migration (`--name init`), so creating it no longer waits for input.
