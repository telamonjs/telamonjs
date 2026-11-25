import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'

/** Shape of Prisma's `PrismaClientKnownRequestError`, read without importing `@prisma/client`. */
export interface PrismaKnownRequestErrorLike {
  name: string
  message: string
  /** `P` + four digits, e.g. `P2002`. */
  code: string
  clientVersion?: string
  meta?: Record<string, unknown>
}

/** Shape of Prisma's `PrismaClientValidationError`. */
export interface PrismaValidationErrorLike {
  name: 'PrismaClientValidationError'
  message: string
}

/**
 * `true` for a `PrismaClientKnownRequestError` from any `@prisma/client` copy:
 * a `P####` code plus Prisma's `name` or `clientVersion`. A bare `code: 'P2002'`
 * on some other error does not count.
 */
export function isPrismaKnownRequestError(value: unknown): value is PrismaKnownRequestErrorLike {
  if (typeof value !== 'object' || value === null) return false
  const { code, name, clientVersion } = value as Record<string, unknown>
  return (
    typeof code === 'string' &&
    /^P\d{4}$/.test(code) &&
    (name === 'PrismaClientKnownRequestError' || typeof clientVersion === 'string')
  )
}

/** `true` for a `PrismaClientValidationError` from any `@prisma/client` copy. */
export function isPrismaValidationError(value: unknown): value is PrismaValidationErrorLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { name?: unknown }).name === 'PrismaClientValidationError'
  )
}

/**
 * Text of a response: a literal, or built from the fields Prisma reports
 * (`meta.target` for `P2002`, `meta.field_name` for `P2003`, empty otherwise).
 */
export type PrismaErrorMessage =
  | string
  | ((fields: string[], error: PrismaKnownRequestErrorLike | PrismaValidationErrorLike) => string)

export interface PrismaExceptionFilterOptions {
  /**
   * Replaces the English default text, keyed by Prisma code (`P2002`, …),
   * `validation` (`PrismaClientValidationError`) or `default` (a code this
   * filter does not map, answered with 500).
   */
  messages?: Partial<Record<string, PrismaErrorMessage>>
}

/** Matches a Prisma error by shape: Nest picks a filter with `instanceof`, which calls this. */
class PrismaErrorShape {
  static [Symbol.hasInstance](value: unknown): boolean {
    return isPrismaKnownRequestError(value) || isPrismaValidationError(value)
  }
}

const REASON: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
}

const CONNECTION = { status: 503, message: 'Database connection error' }
const RULES: Record<string, { status: number; message: PrismaErrorMessage }> = {
  P2002: {
    status: 409,
    message: (f) => (f.length ? `Duplicate record: ${f.join(', ')} already exists` : 'Duplicate record'),
  },
  P2003: { status: 400, message: (f) => `Invalid reference: ${f[0] ?? 'related record'} does not exist` },
  P2025: { status: 404, message: 'Record not found' },
  P2011: { status: 400, message: 'Invalid data: a required value is missing' },
  P2012: { status: 400, message: 'Invalid data: a required value is missing' },
  P2014: { status: 400, message: 'Cannot delete: the record is referenced by other records' },
  P1000: CONNECTION,
  P1001: CONNECTION,
  P1002: CONNECTION,
  P1003: CONNECTION,
  validation: { status: 400, message: 'Invalid data' },
  default: { status: 500, message: 'Internal server error' },
}

/** The fields a Prisma error names: the unique `target` (P2002) or the foreign key (P2003). */
function fieldsOf(meta: Record<string, unknown> | undefined): string[] {
  const raw = meta?.target ?? meta?.field_name
  if (Array.isArray(raw)) return raw.map(String)
  return typeof raw === 'string' ? [raw] : []
}

interface ResponseLike {
  status(code: number): { json(body: unknown): unknown }
}

/**
 * Answers Prisma errors with an HTTP status instead of a 500. Catches only
 * Prisma's known-request and validation errors (matched by shape, so a second
 * `@prisma/client` copy works too); every other error still reaches your other
 * filters and Nest's default handling.
 *
 * | Prisma | HTTP |
 * | --- | --- |
 * | `P2002` unique | 409, `field` = first target field |
 * | `P2003` foreign key | 400, `field` = constraint |
 * | `P2025` not found | 404 |
 * | `P2011`, `P2012`, `P2014`, validation error | 400 |
 * | `P1000`–`P1003` connection | 503 |
 * | any other code | 500, logged |
 *
 * Body: `{ statusCode, message, error, field?, timestamp, path }`. Written with
 * Express's `res.status().json()`. Outside HTTP the error is rethrown.
 *
 * ```ts
 * app.useGlobalFilters(new PrismaExceptionFilter({ messages: { P2025: 'Nothing here' } }))
 * ```
 *
 * Subclass and override `catch` to change one case and call `super.catch` for the rest.
 */
@Catch(PrismaErrorShape)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PrismaExceptionFilter')

  constructor(private readonly options: PrismaExceptionFilterOptions = {}) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception
    if (!isPrismaKnownRequestError(exception) && !isPrismaValidationError(exception)) throw exception

    const known = isPrismaKnownRequestError(exception)
    const key = known ? (exception.code in RULES ? exception.code : 'default') : 'validation'
    if (known && key === 'default') {
      this.logger.error(`Unmapped Prisma error ${exception.code}: ${exception.message}`, (exception as Error).stack)
    }

    const fields = known ? fieldsOf(exception.meta) : []
    const rule = RULES[key]
    const text = this.options.messages?.[key] ?? rule.message
    const http = host.switchToHttp()
    http
      .getResponse<ResponseLike>()
      .status(rule.status)
      .json({
        statusCode: rule.status,
        message: typeof text === 'function' ? text(fields, exception) : text,
        error: REASON[rule.status],
        ...((key === 'P2002' || key === 'P2003') && fields.length > 0 && { field: fields[0] }),
        timestamp: new Date().toISOString(),
        path: http.getRequest<{ url?: string }>().url,
      })
  }
}
