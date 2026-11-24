import type { Request as ExpressRequest } from 'express'
import type { IncomingHttpHeaders } from 'node:http'
import { describe, expect, it } from 'vitest'
import type { GetActorFn } from './types.js'

// Shape of an Express 4 request as `@types/express@4` declares it: different
// from Express 5's, but both carry `headers`. Type-checked by `pnpm type-check`.
interface Express4LikeRequest {
  headers: IncomingHttpHeaders
  params: Record<string, string>
  user?: { id: string }
}

describe('GetActorFn', () => {
  it('accepts callbacks typed with the app own Express 4 or 5 Request', () => {
    const fromExpress5: GetActorFn = (req: ExpressRequest) =>
      String(req.headers['x-actor'] ?? 'anonymous')
    const fromExpress4: GetActorFn = (req: Express4LikeRequest) => req.user?.id ?? 'anonymous'
    const untyped: GetActorFn = req => String(req.headers['x-actor'] ?? 'anonymous')

    const req = { headers: { 'x-actor': 'qa' }, params: {}, user: { id: 'u1' } }
    expect(fromExpress5(req as unknown as ExpressRequest)).toBe('qa')
    expect(fromExpress4(req)).toBe('u1')
    expect(untyped(req)).toBe('qa')
  })
})
