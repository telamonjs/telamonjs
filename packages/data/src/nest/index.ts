/**
 * `@telamonjs/data/nest` — the NestJS + Prisma plumbing every API repeats:
 * a Prisma exception filter and a health module. Needs `@nestjs/common`
 * (optional peer); never imports `@prisma/client` — the app passes its client.
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
