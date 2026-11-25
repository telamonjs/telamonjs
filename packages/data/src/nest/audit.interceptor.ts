import {
  Inject,
  Injectable,
  Logger,
  SetMetadata,
  type CallHandler,
  type CustomDecorator,
  type ExecutionContext,
  type InjectionToken,
  type NestInterceptor,
  type Type,
} from '@nestjs/common'
import { concatMap, tap, type Observable } from 'rxjs'
import { DEFAULT_REDACT_KEYS, redactPayload } from '../audit.js'

/** One audit row, ready for the app to persist. */
export interface AuditEntry {
  userId: string
  /** `request.user.originalUser.id` while impersonating. */
  impersonatedBy?: string
  /** `CREATE` (POST), `UPDATE` (PUT, PATCH), `DELETE`, or the HTTP method for anything else. */
  action: 'CREATE' | 'UPDATE' | 'DELETE' | (string & {})
  entityType: string
  entityId?: string
  /** The request body, redacted; absent when the body is empty. */
  changes?: unknown
  /** `request.ip`: set Express's `trust proxy` so it reads `X-Forwarded-For`. */
  ipAddress?: string
  userAgent?: string
  method: string
  /** Request path without the query string. */
  path: string
  statusCode: number
}

export interface AuditInterceptorOptions {
  /**
   * Persists one entry. The `inject` tokens follow `context`, in order:
   *
   * ```ts
   * inject: [PrismaService],
   * write: (entry, _context, prisma: PrismaService) => prisma.auditLog.create({ data: entry }),
   * ```
   */
  write: (entry: AuditEntry, context: ExecutionContext, ...deps: never[]) => unknown
  /** Tokens passed to `write`. */
  inject?: InjectionToken[]
  /** Audited HTTP methods. Default `['POST', 'PUT', 'PATCH', 'DELETE']`. */
  methods?: string[]
  /**
   * Entity of a request; `null` skips it. Default: `type` is the first path
   * segment that is not `api` or a version (`/api/v1/orders/42` → `orders`),
   * `id` the `:id` param or the response body's `id`.
   */
  resolveEntity?: (context: ExecutionContext, responseBody: unknown) => { type: string; id?: string } | null
  /** `true` skips the request. `@SkipAudit()` does the same per handler or controller. */
  ignore?: (context: ExecutionContext) => boolean
  /** Key fragments masked in `changes`, on top of `DEFAULT_REDACT_KEYS`. */
  redact?: string[]
  /**
   * Who acts; no `id` skips the request (anonymous writes are not audited).
   * Default: `request.user.id` and `request.user.originalUser.id`, the
   * `@telamonjs/auth` user.
   */
  user?: (request: unknown) => { id?: string; impersonatedBy?: string } | null | undefined
  /** Wait for `write` before answering. Default `false`: the response never waits on the audit. */
  await?: boolean
  /** A `write` that throws or rejects. Default: logged with Nest's `Logger`. The request never fails. */
  onError?: (error: unknown, entry: AuditEntry) => void
}

interface RequestLike {
  method: string
  originalUrl?: string
  url?: string
  params?: Record<string, string>
  body?: unknown
  ip?: string
  headers: Record<string, string | string[] | undefined>
  user?: { id?: unknown; originalUser?: { id?: unknown } }
}

const SKIP_AUDIT = 'telamonjs:skip-audit'
const ACTIONS: Record<string, string> = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' }
// ponytail: leading `api`/`vN` segments are taken as the global prefix; another prefix needs resolveEntity.
const PREFIX = /^(api|v\d+)$/i

/** Skips the audit for one handler, or every handler of a controller. */
export const SkipAudit = (): CustomDecorator<string> => SetMetadata(SKIP_AUDIT, true)

const idOf = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined

function defaultEntity(req: RequestLike, path: string, body: unknown): { type: string; id?: string } | null {
  const type = path.split('/').find((segment) => segment && !PREFIX.test(segment))
  if (!type) return null
  return { type, id: idOf(req.params?.id) ?? idOf((body as { id?: unknown } | null | undefined)?.id) }
}

function defaultUser(req: unknown): { id?: string; impersonatedBy?: string } {
  const user = (req as RequestLike).user
  return { id: idOf(user?.id), impersonatedBy: idOf(user?.originalUser?.id) }
}

const isEmpty = (body: unknown): boolean =>
  body == null || (typeof body === 'object' && Object.keys(body).length === 0)

/**
 * An interceptor class that hands every successful, authenticated mutation to
 * `write` as an `AuditEntry`. Nothing is written when the handler throws or the
 * request is anonymous; a failing `write` is reported to `onError` and never
 * fails the request. Register it globally or per controller:
 *
 * ```ts
 * const AuditInterceptor = createAuditInterceptor({
 *   inject: [PrismaService],
 *   write: (entry, _context, prisma: PrismaService) => prisma.auditLog.create({ data: entry }),
 * })
 * // providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }]
 * ```
 *
 * Outside HTTP (RPC, WebSocket) requests pass through untouched.
 */
export function createAuditInterceptor(options: AuditInterceptorOptions): Type<NestInterceptor> {
  const methods = options.methods ?? ['POST', 'PUT', 'PATCH', 'DELETE']
  const keys = [...DEFAULT_REDACT_KEYS, ...(options.redact ?? [])]
  const resolveUser = options.user ?? defaultUser

  @Injectable()
  class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger('AuditInterceptor')
    private readonly deps: unknown[]

    constructor(...deps: unknown[]) {
      this.deps = deps
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      if (context.getType() !== 'http') return next.handle()
      const req = context.switchToHttp().getRequest<RequestLike>()
      const method = String(req.method).toUpperCase()
      if (
        !methods.includes(method) ||
        Reflect.getMetadata(SKIP_AUDIT, context.getHandler()) ||
        Reflect.getMetadata(SKIP_AUDIT, context.getClass()) ||
        options.ignore?.(context)
      ) {
        return next.handle()
      }
      const user = resolveUser(req)
      if (!user?.id) return next.handle()
      const { id: userId, impersonatedBy } = user

      const record = async (body: unknown): Promise<void> => {
        const path = String(req.originalUrl ?? req.url ?? '').split('?')[0]
        const entity = options.resolveEntity ? options.resolveEntity(context, body) : defaultEntity(req, path, body)
        if (!entity) return
        const userAgent = req.headers['user-agent']
        const entry: AuditEntry = {
          userId,
          ...(impersonatedBy && { impersonatedBy }),
          action: ACTIONS[method] ?? method,
          entityType: entity.type,
          ...(entity.id !== undefined && { entityId: entity.id }),
          ...(!isEmpty(req.body) && { changes: redactPayload(req.body, keys) }),
          ...(req.ip && { ipAddress: req.ip }),
          ...(typeof userAgent === 'string' && { userAgent }),
          method,
          path,
          statusCode: context.switchToHttp().getResponse<{ statusCode: number }>().statusCode,
        }
        try {
          await options.write(entry, context, ...(this.deps as never[]))
        } catch (error) {
          if (options.onError) options.onError(error, entry)
          else this.logger.error(`Audit write failed for ${method} ${path}`, (error as Error)?.stack)
        }
      }

      // A throwing resolveEntity or onError must not become an unhandled rejection either.
      const safeRecord = (body: unknown): Promise<void> =>
        record(body).catch((error: unknown) => this.logger.error('Audit failed', (error as Error)?.stack))

      return options.await
        ? next.handle().pipe(concatMap(async (body) => (await safeRecord(body), body)))
        : next.handle().pipe(tap((body) => void safeRecord(body)))
    }
  }

  ;(options.inject ?? []).forEach((token, index) => Inject(token)(AuditInterceptor, undefined, index))
  return AuditInterceptor
}
