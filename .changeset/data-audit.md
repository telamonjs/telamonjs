---
'@telamonjs/data': minor
---

Audit trail: `createAuditInterceptor()` and `@SkipAudit()` in `@telamonjs/data/nest` hand every successful, authenticated mutation to your `write` as an `AuditEntry` (user, impersonator, action, entity, redacted body, IP, user agent, method, path, status), without blocking the response or failing it when the write fails. The root entry gains the pure helpers `computeDiff`, `redactPayload` and `DEFAULT_REDACT_KEYS`. `rxjs` joins `@nestjs/common` as an optional peer of the `./nest` entry.
