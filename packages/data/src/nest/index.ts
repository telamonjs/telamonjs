/**
 * `@telamonjs/data/nest` — the NestJS + Prisma plumbing every API repeats:
 * a Prisma exception filter, a health module and an audit interceptor. Needs
 * `@nestjs/common` and `rxjs` (optional peers); never imports `@prisma/client` —
 * the app passes its client.
 *
 * @module data/nest
 */

export type {
  PrismaKnownRequestErrorLike,
  PrismaValidationErrorLike,
  PrismaErrorMessage,
  PrismaExceptionFilterOptions,
} from './prisma-exception.filter.js'
export {
  PrismaExceptionFilter,
  isPrismaKnownRequestError,
  isPrismaValidationError,
} from './prisma-exception.filter.js'
export type { HealthCheck, HealthChecks, HealthResponse, HealthModuleOptions } from './health.module.js'
export { HealthModule } from './health.module.js'
export type { AuditEntry, AuditInterceptorOptions } from './audit.interceptor.js'
export { createAuditInterceptor, SkipAudit } from './audit.interceptor.js'
