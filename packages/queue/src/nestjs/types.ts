import type { Request } from 'express'

/**
 * Populates `triggeredBy`/`updatedBy` on dispatch/config-write handlers
 * without this package knowing the shape of the consumer's authenticated
 * user. Required (no default) — auth is entirely the consumer's
 * responsibility, see the design doc's "Auth fica com o consumidor".
 */
export type GetActorFn = (req: Request) => string
