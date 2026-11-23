import { describe, it, expect } from 'vitest'
import { sessionState, stampSessionTimes } from './session'

describe('stampSessionTimes', () => {
  it('sets authTime and accessAt to the same instant, mutating the token', () => {
    const token: Record<string, unknown> = { id: 'u1' }
    const stamped = stampSessionTimes(token, 1000)
    expect(stamped).toBe(token)
    expect(stamped).toMatchObject({ id: 'u1', authTime: 1000, accessAt: 1000 })
  })

  it('defaults to Date.now()', () => {
    const before = Date.now()
    const { authTime, accessAt } = stampSessionTimes({})
    expect(authTime).toBeGreaterThanOrEqual(before)
    expect(accessAt).toBe(authTime)
  })
})

describe('sessionState', () => {
  const token = { authTime: 1000, accessAt: 2000 }

  it('fresh when nothing changed after the token was issued', () => {
    expect(sessionState(token, {})).toBe('fresh')
    expect(
      sessionState(token, { revokedAt: 1000, accessChangedAt: 2000 })
    ).toBe('fresh')
  })

  it('revoked when the revocation is newer than the login', () => {
    expect(sessionState(token, { revokedAt: 1001 })).toBe('revoked')
  })

  it('stale when access changed after the claims were computed', () => {
    expect(sessionState(token, { accessChangedAt: 2001 })).toBe('stale')
  })

  it('revoked wins over stale', () => {
    expect(
      sessionState(token, { revokedAt: 5000, accessChangedAt: 5000 })
    ).toBe('revoked')
  })

  it('null/undefined marks mean nothing changed', () => {
    expect(
      sessionState(token, { revokedAt: null, accessChangedAt: undefined })
    ).toBe('fresh')
    expect(sessionState({}, { revokedAt: null, accessChangedAt: null })).toBe(
      'fresh'
    )
  })

  it('missing claims count as 0: tokens issued before adoption are caught by any later mark', () => {
    expect(sessionState({}, {})).toBe('fresh')
    expect(sessionState({}, { revokedAt: 1 })).toBe('revoked')
    expect(sessionState({}, { accessChangedAt: 1 })).toBe('stale')
  })

  it('accepts Date and number marks alike', () => {
    expect(sessionState(token, { revokedAt: new Date(1001) })).toBe('revoked')
    expect(sessionState(token, { accessChangedAt: new Date(2001) })).toBe(
      'stale'
    )
    expect(
      sessionState(token, {
        revokedAt: new Date(999),
        accessChangedAt: new Date(1999),
      })
    ).toBe('fresh')
  })
})
