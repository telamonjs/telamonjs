import { Request, Response, NextFunction } from 'express'
import superjson from 'superjson'

/**
 * Overrides Express's res.json() to serialize with SuperJSON instead —
 * Decimal, BigInt, Date, Map, Set, etc. survive the round trip. The web app
 * must call `superjson.deserialize` on the response body (see
 * apps/web/src/lib/api/client.ts). Must be registered BEFORE any route
 * handler.
 */
export function superJsonMiddleware(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res)

  res.json = function (data: unknown) {
    try {
      const serialized = superjson.stringify(data)
      res.setHeader('Content-Type', 'application/json')
      return res.end(serialized)
    } catch (error) {
      console.error('SuperJSON serialization failed:', error)
      return originalJson(data)
    }
  } as Response['json']

  next()
}
