---
"@telamonjs/cli": patch
---

Generated apps:

- The seed creates the default admin only on an empty database and never changes an existing account. In production the first admin's password comes from `SEED_ADMIN_PASSWORD`, and the container stops if the seed fails.
- `docker-compose.prod.yml` reads `NEXTAUTH_SECRET` and `DB_PASSWORD` (plus `SEED_ADMIN_PASSWORD` on an empty database) from the environment and binds the database port to `127.0.0.1`.
- `next.config.js` starts with an empty `images.remotePatterns`; add the hosts your images come from. Existing apps: replace `hostname: '**'` with those hosts.
- The Docker image builds again (the Prisma schema is copied before install) and includes the migrations; the entrypoint retries `prisma migrate deploy` until the database answers. `.gitignore` no longer ignores `prisma/migrations/**/*.sql`.
- `telamonjs db dump` keeps `database/dumps/` out of git.
- Granting roles or permissions (user roles, invitations, role permissions) is limited to permissions the acting user holds; only an admin grants the `admin` role, and a user can't edit another with more access.
- Deleting a role takes effect on its holders' next request.
- The single-app audit log records the client IP added by the reverse proxy (`TRUSTED_PROXY_HOPS`, default 1).
- `telamonjs generate crud` emits Route Handlers that require `<name>.read` / `<name>.write`, registers both codes in `src/rbac.ts` (run the app's `db:seed` script afterwards), and stops in apps created before CLI 1.2.0, which have no RBAC.
