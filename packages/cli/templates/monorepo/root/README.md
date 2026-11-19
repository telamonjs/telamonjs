# {{appName}}

Admin application generated with `@telamonjs/cli` (`telamonjs create --monorepo`).

## Structure

```
apps/web/         Next.js 15 + @telamonjs/ui — port {{appPort}}
apps/api/         NestJS API, prefix /v1 — port {{apiPort}}
apps/jobs/        BullMQ worker + scheduler (no port)
packages/shared/  Prisma schema + client, shared by web/api/jobs
```

`AGENTS.md` (root) and the guide in each package (`apps/web/AGENTS.md`, the
nested `CLAUDE.md` files) describe what belongs where.

## Getting started

```bash
pnpm install
cp .env.example .env  # fill NEXTAUTH_SECRET (openssl rand -base64 32)
docker compose up -d  # postgres + redis
pnpm db:push
pnpm db:seed          # admin@example.com / 12345
pnpm dev              # apps/web   — http://localhost:{{appPort}}
pnpm dev:api          # apps/api   — http://localhost:{{apiPort}}/v1
pnpm worker           # apps/jobs
```

## Commands

```bash
pnpm build           # shared -> api -> web
pnpm type-check      # every package
pnpm test            # shared + api
pnpm lint:telamonjs  # CrudConfig/dialogs conventions (apps/web)
pnpm db:studio       # Prisma Studio
```

## Default credentials

- Email: `admin@example.com`
- Password: `12345`
