import { describe, it, expect, vi } from 'vitest'
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import { createApiKeyGuard, staticApiKey } from './api-key.guard'
import {
  createApiKeyGuard as createFromBarrel,
  staticApiKey as staticFromBarrel,
  AllowServiceToken,
  ALLOW_SERVICE_TOKEN_KEY,
} from './index'

const KEY = 'k-0123456789abcdef'

interface FakeRequest {
  headers: Record<string, string | string[] | undefined>
  user?: unknown
  servicePrincipal?: unknown
}

function ctx(request: FakeRequest): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

async function run(
  guard: { canActivate: (c: ExecutionContext) => unknown },
  request: FakeRequest
) {
  return guard.canActivate(ctx(request))
}

describe('createApiKeyGuard', () => {
  describe('key extraction', () => {
    it('reads x-api-key by default and attaches the principal to request.servicePrincipal', async () => {
      const Guard = createApiKeyGuard({ verify: staticApiKey(KEY) })
      const request: FakeRequest = { headers: { 'x-api-key': KEY } }
      expect(await run(new Guard(), request)).toBe(true)
      expect(request.servicePrincipal).toEqual({ name: 'service' })
    })

    it('leaves request.user untouched', async () => {
      const Guard = createApiKeyGuard({ verify: staticApiKey(KEY) })
      const request: FakeRequest = { headers: { 'x-api-key': KEY } }
      await run(new Guard(), request)
      expect(request.user).toBeUndefined()
    })

    it('custom header name, matched case-insensitively (Node lowercases headers)', async () => {
      const Guard = createApiKeyGuard({
        verify: staticApiKey(KEY),
        header: 'X-Internal-Token',
      })
      expect(
        await run(new Guard(), { headers: { 'x-internal-token': KEY } })
      ).toBe(true)
      await expect(
        run(new Guard(), { headers: { 'x-api-key': KEY } })
      ).rejects.toThrow(UnauthorizedException)
    })

    it('bearer: true also reads Authorization: Bearer (header first)', async () => {
      const verify = vi.fn(staticApiKey(KEY))
      const Guard = createApiKeyGuard({ verify, bearer: true })
      expect(
        await run(new Guard(), { headers: { authorization: `Bearer ${KEY}` } })
      ).toBe(true)
      await run(new Guard(), {
        headers: { 'x-api-key': KEY, authorization: 'Bearer other' },
      })
      expect(verify).toHaveBeenLastCalledWith(KEY, expect.anything())
    })

    it('Bearer is ignored unless bearer: true', async () => {
      const Guard = createApiKeyGuard({ verify: staticApiKey(KEY) })
      await expect(
        run(new Guard(), { headers: { authorization: `Bearer ${KEY}` } })
      ).rejects.toThrow(UnauthorizedException)
    })

    it('header: false + bearer: true reads only the Bearer token', async () => {
      const Guard = createApiKeyGuard({
        verify: staticApiKey(KEY),
        header: false,
        bearer: true,
      })
      await expect(
        run(new Guard(), { headers: { 'x-api-key': KEY } })
      ).rejects.toThrow(UnauthorizedException)
      expect(
        await run(new Guard(), { headers: { authorization: `Bearer ${KEY}` } })
      ).toBe(true)
    })
  })

  describe('verification', () => {
    it('missing key → 401 without calling the verifier', async () => {
      const verify = vi.fn(() => ({ name: 'x' }))
      const Guard = createApiKeyGuard({ verify })
      await expect(run(new Guard(), { headers: {} })).rejects.toThrow(
        UnauthorizedException
      )
      expect(verify).not.toHaveBeenCalled()
    })

    it('a repeated header (string[]) is not a key', async () => {
      const Guard = createApiKeyGuard({ verify: staticApiKey(KEY) })
      await expect(
        run(new Guard(), { headers: { 'x-api-key': [KEY, KEY] } })
      ).rejects.toThrow(UnauthorizedException)
    })

    it('verifier returning null → generic 401 that does not echo the key', async () => {
      const Guard = createApiKeyGuard({ verify: () => null })
      const error = await Promise.resolve(
        run(new Guard(), { headers: { 'x-api-key': KEY } })
      ).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(UnauthorizedException)
      expect((error as Error).message).toBe('Invalid or missing API key')
      expect((error as Error).message).not.toContain(KEY)
    })

    it.each([false, 0, '', Number.NaN])(
      'verifier returning %p → 401 (a predicate verifier must not let a wrong key in)',
      async value => {
        const Guard = createApiKeyGuard({ verify: () => value })
        const request: FakeRequest = { headers: { 'x-api-key': 'wrong' } }
        await expect(run(new Guard(), request)).rejects.toThrow(
          UnauthorizedException
        )
        expect(request.servicePrincipal).toBeUndefined()
      }
    )

    it('async verifier (DB lookup) gets the key and the request; its principal is attached', async () => {
      const verify = vi.fn(async (key: string) =>
        key === KEY ? { clientId: 'c1' } : null
      )
      const Guard = createApiKeyGuard({ verify })
      const request: FakeRequest = { headers: { 'x-api-key': KEY } }
      expect(await run(new Guard(), request)).toBe(true)
      expect(verify).toHaveBeenCalledWith(KEY, request)
      expect(request.servicePrincipal).toEqual({ clientId: 'c1' })
    })

    it('an error thrown by the verifier propagates as-is (an outage is not an invalid key)', async () => {
      const outage = new Error('db down')
      const Guard = createApiKeyGuard({
        verify: () => Promise.reject(outage),
      })
      await expect(
        run(new Guard(), { headers: { 'x-api-key': KEY } })
      ).rejects.toBe(outage)
    })

    it('createException builds the 401 (host exception class while linked)', async () => {
      class HostError extends Error {}
      const createException = vi.fn(
        (_status: 401 | 403, message: string) => new HostError(message)
      )
      const Guard = createApiKeyGuard({ verify: () => null, createException })
      await expect(
        run(new Guard(), { headers: { 'x-api-key': KEY } })
      ).rejects.toBeInstanceOf(HostError)
      expect(createException).toHaveBeenCalledWith(
        401,
        'Invalid or missing API key'
      )
    })
  })
})

describe('staticApiKey', () => {
  it('accepts the exact key and returns the named principal', async () => {
    expect(await staticApiKey(KEY, 'ci')(KEY, { headers: {} })).toEqual({
      name: 'ci',
    })
  })

  it('rejects a different key, including a prefix or a longer one', async () => {
    const verify = staticApiKey(KEY)
    for (const key of ['nope', KEY.slice(0, -1), `${KEY}x`]) {
      expect(await verify(key, { headers: {} })).toBeNull()
    }
  })

  it('an unset or empty expected key denies everything (never open when unconfigured)', async () => {
    expect(await staticApiKey(undefined)('', { headers: {} })).toBeNull()
    expect(await staticApiKey('')('', { headers: {} })).toBeNull()
    expect(await staticApiKey(() => undefined)('x', { headers: {} })).toBeNull()
  })

  it('a function is resolved on every call (env loaded after import)', async () => {
    const env: { key?: string } = {}
    const verify = staticApiKey(() => env.key)
    expect(await verify(KEY, { headers: {} })).toBeNull()
    env.key = KEY
    expect(await verify(KEY, { headers: {} })).toEqual({ name: 'service' })
  })
})

describe('nest barrel', () => {
  it('exports the guard factory, the static verifier and the decorator', () => {
    expect(createFromBarrel).toBe(createApiKeyGuard)
    expect(staticFromBarrel).toBe(staticApiKey)
    expect(typeof AllowServiceToken).toBe('function')
    expect(ALLOW_SERVICE_TOKEN_KEY).toBe('allowServiceToken')
  })
})
