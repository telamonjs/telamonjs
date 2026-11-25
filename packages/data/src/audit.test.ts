import { describe, expect, it } from 'vitest'
import { DEFAULT_REDACT_KEYS, computeDiff, redactPayload } from './audit.js'

describe('computeDiff', () => {
  describe('Rendering', () => {
    it('returns only the changed keys as { old, new }', () => {
      expect(computeDiff({ name: 'Ann', age: 30 }, { name: 'Bea', age: 30 })).toEqual({
        name: { old: 'Ann', new: 'Bea' },
      })
    })

    it('reads the keys of after, so a partial DTO works', () => {
      expect(computeDiff({ name: 'Ann', email: 'a@x.io', age: 30 }, { age: 31 })).toEqual({
        age: { old: 30, new: 31 },
      })
    })

    it('nothing changed → {}', () => {
      expect(computeDiff({ name: 'Ann' }, { name: 'Ann' })).toEqual({})
    })
  })

  describe('Edge Cases', () => {
    it('a key missing from before is a change from null', () => {
      expect(computeDiff({}, { tag: 'x' })).toEqual({ tag: { old: null, new: 'x' } })
    })

    it('skips undefined values of after (a DTO field that was not sent)', () => {
      expect(computeDiff({ name: 'Ann' }, { name: undefined })).toEqual({})
    })

    it('null and undefined are the same; null to a value is a change', () => {
      expect(computeDiff({ note: undefined }, { note: null })).toEqual({})
      expect(computeDiff({ note: null }, { note: 'x' })).toEqual({ note: { old: null, new: 'x' } })
    })

    it('compares dates by instant, Date or ISO string on either side', () => {
      const at = new Date('2026-01-02T03:04:05.000Z')
      expect(computeDiff({ at }, { at: '2026-01-02T03:04:05.000Z' })).toEqual({})
      expect(computeDiff({ at }, { at: new Date(at.getTime()) })).toEqual({})
      expect(computeDiff({ at }, { at: '2026-01-03T00:00:00.000Z' })).toEqual({
        at: { old: at, new: '2026-01-03T00:00:00.000Z' },
      })
    })

    it('compares a Decimal-like (toNumber) and numeric strings as numbers', () => {
      const decimal = { toNumber: () => 12.5 }
      expect(computeDiff({ price: decimal }, { price: 12.5 })).toEqual({})
      expect(computeDiff({ price: decimal }, { price: '12.50' })).toEqual({})
      expect(computeDiff({ price: decimal }, { price: 13 })).toEqual({ price: { old: decimal, new: 13 } })
    })

    it('compares arrays and objects by value, shallow keys only', () => {
      expect(computeDiff({ tags: ['a', 'b'] }, { tags: ['a', 'b'] })).toEqual({})
      expect(computeDiff({ tags: ['a', 'b'] }, { tags: ['b', 'a'] })).toEqual({
        tags: { old: ['a', 'b'], new: ['b', 'a'] },
      })
      expect(computeDiff({ meta: { a: 1 } }, { meta: { a: 2 } })).toEqual({
        meta: { old: { a: 1 }, new: { a: 2 } },
      })
    })

    it('compares bigints', () => {
      expect(computeDiff({ n: 1n }, { n: 1n })).toEqual({})
      expect(computeDiff({ n: 1n }, { n: 2n })).toEqual({ n: { old: 1n, new: 2n } })
    })
  })

  describe('State Management', () => {
    it('ignores createdAt and updatedAt by default', () => {
      expect(computeDiff({ updatedAt: new Date(0), createdAt: 1 }, { updatedAt: new Date(), createdAt: 2 })).toEqual(
        {}
      )
    })

    it('ignore replaces the default list', () => {
      expect(computeDiff({ version: 1, updatedAt: 1 }, { version: 2, updatedAt: 2 }, { ignore: ['version'] })).toEqual(
        { updatedAt: { old: 1, new: 2 } }
      )
    })

    it('accepts class instances (a DTO) on either side', () => {
      class UpdateDto {
        constructor(public name: string) {}
      }
      expect(computeDiff(new UpdateDto('Ann'), new UpdateDto('Bea'))).toEqual({ name: { old: 'Ann', new: 'Bea' } })
    })

    it('does not mutate its inputs', () => {
      const before = { name: 'Ann' }
      const after = { name: 'Bea' }
      computeDiff(before, after)
      expect(before).toEqual({ name: 'Ann' })
      expect(after).toEqual({ name: 'Bea' })
    })
  })
})

describe('redactPayload', () => {
  describe('Rendering', () => {
    it('masks secret keys and keeps the rest', () => {
      expect(redactPayload({ email: 'a@x.io', password: 'hunter2' })).toEqual({
        email: 'a@x.io',
        password: '[REDACTED]',
      })
    })

    // Consumer schemas are often pt-BR: a `senha` field must not reach the audit table
    it('masks pt-BR password fields too (senha, novaSenha)', () => {
      expect(redactPayload({ senha: 'x', novaSenha: 'y', nome: 'a' })).toEqual({
        senha: '[REDACTED]',
        novaSenha: '[REDACTED]',
        nome: 'a',
      })
    })

    it('matches keys case-insensitively, inside longer names and across _ and -', () => {
      expect(
        redactPayload({
          newPassword: 'a',
          REFRESH_TOKEN: 'b',
          clientSecret: 'c',
          Authorization: 'd',
          'api-key': 'e',
          api_key: 'f',
          privateKey: 'g',
          name: 'h',
        })
      ).toEqual({
        newPassword: '[REDACTED]',
        REFRESH_TOKEN: '[REDACTED]',
        clientSecret: '[REDACTED]',
        Authorization: '[REDACTED]',
        'api-key': '[REDACTED]',
        api_key: '[REDACTED]',
        privateKey: '[REDACTED]',
        name: 'h',
      })
    })

    it('goes deep through objects and arrays', () => {
      expect(redactPayload({ users: [{ name: 'a', password: 'x' }], auth: { token: 'y', scope: ['read'] } })).toEqual({
        users: [{ name: 'a', password: '[REDACTED]' }],
        auth: { token: '[REDACTED]', scope: ['read'] },
      })
      expect(redactPayload([{ secret: 1 }])).toEqual([{ secret: '[REDACTED]' }])
    })

    it('masks a whole object under a secret key', () => {
      expect(redactPayload({ credentials: { user: 'a', pass: 'b' } })).toEqual({ credentials: '[REDACTED]' })
    })
  })

  describe('State Management', () => {
    it('custom keys replace the default list', () => {
      expect(redactPayload({ ssn: '1', password: 'x' }, ['ssn'])).toEqual({ ssn: '[REDACTED]', password: 'x' })
      expect(redactPayload({ ssn: '1', password: 'x' }, [...DEFAULT_REDACT_KEYS, 'ssn'])).toEqual({
        ssn: '[REDACTED]',
        password: '[REDACTED]',
      })
    })

    it('does not mutate its input', () => {
      const body = { password: 'x', nested: { token: 'y' } }
      redactPayload(body)
      expect(body).toEqual({ password: 'x', nested: { token: 'y' } })
    })
  })

  describe('Edge Cases', () => {
    it('returns primitives, null and undefined as they are', () => {
      expect(redactPayload('text')).toBe('text')
      expect(redactPayload(1)).toBe(1)
      expect(redactPayload(null)).toBeNull()
      expect(redactPayload(undefined)).toBeUndefined()
    })

    it('keeps Dates and class instances (Decimal, Buffer) intact instead of walking them', () => {
      const at = new Date(0)
      const decimal = new (class Decimal {
        token = 'internal'
      })()
      const out = redactPayload({ at, price: decimal }) as Record<string, unknown>
      expect(out.at).toBe(at)
      expect(out.price).toBe(decimal)
    })
  })
})
