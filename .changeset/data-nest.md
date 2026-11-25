---
'@telamonjs/data': minor
'@telamonjs/cli': patch
---

New `@telamonjs/data/nest` entry (needs `@nestjs/common` 10 or 11, an optional peer; never imports `@prisma/client`). `PrismaExceptionFilter` answers Prisma errors with HTTP statuses (P2002 → 409 with `field`, P2003 → 400, P2025 → 404, P2011/P2012/P2014 and validation errors → 400, P1000–P1003 → 503, other codes → 500 logged), matching them by shape so only Prisma errors reach it; English messages, overridable per code with `messages`. `HealthModule.forRoot({ checks, inject?, imports?, path?, decorators? })` serves `GET /health` with `{ status, timestamp, uptime, <check>: 'connected' | 'disconnected' }` and answers 503 when a check is down. The monorepo template's API now uses both instead of its own filter and health controller, and requires Node 22.12+.
