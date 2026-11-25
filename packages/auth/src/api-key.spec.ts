import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { generateApiKey, hashApiKey } from './api-key'
import { generateApiKey as fromBarrel } from './index'

describe('generateApiKey', () => {
  it('returns 32 random bytes as URL-safe base64 (43 chars, no padding)', () => {
    const key = generateApiKey()
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('never repeats', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()))
    expect(keys.size).toBe(100)
  })

  it('prepends the prefix (lets a leaked key be recognized and a key be shown by its start)', () => {
    expect(generateApiKey('svc_')).toMatch(/^svc_[A-Za-z0-9_-]{43}$/)
  })

  it('is exported from the core barrel', () => {
    expect(fromBarrel).toBe(generateApiKey)
  })
})

describe('hashApiKey', () => {
  it('is the hex sha256 of the key — the same digest as node:crypto, so stored hashes stay valid', async () => {
    const key = generateApiKey()
    expect(await hashApiKey(key)).toBe(
      createHash('sha256').update(key).digest('hex')
    )
  })

  it('is deterministic and differs between keys', async () => {
    expect(await hashApiKey('a')).toBe(await hashApiKey('a'))
    expect(await hashApiKey('a')).not.toBe(await hashApiKey('b'))
  })
})
