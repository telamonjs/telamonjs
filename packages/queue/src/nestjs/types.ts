import type { IncomingHttpHeaders } from 'node:http'

/**
 * The part of the request `getActor` can rely on. Both Express 4 and 5
 * requests (and Fastify's raw request) satisfy it, so apps on either
 * `@types/express` major type their callback with their own `Request`.
 */
export interface ActorRequest {
  headers: IncomingHttpHeaders
  /** Set by the app's auth guard/middleware, when it has one */
  user?: unknown
}

/**
 * Populates `triggeredBy`/`updatedBy` on dispatch/config-write handlers
 * without this package knowing the shape of the consumer's authenticated
 * user. Required (no default) — auth is entirely the consumer's
 * responsibility, see the design doc's "Auth fica com o consumidor".
 *
 * Declared through a method signature so the parameter is checked
 * bivariantly: a callback typed `(req: Request) => string` with the app's
 * own Express `Request` (4 or 5) is accepted.
 */
export type GetActorFn = {
  bivarianceHack(req: ActorRequest): string
}['bivarianceHack']
