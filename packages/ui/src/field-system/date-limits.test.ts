import { describe, it, expect } from 'vitest'
import { dateLimitViolations, resolveDateLimit } from './date-limits'

const now = new Date(2026, 9, 22, 15, 0, 0)

describe('date limits (7.14)', () => {
  it("'today' and static limits resolve to local days", () => {
    expect(resolveDateLimit('today', {}, now)).toEqual(new Date(2026, 9, 22))
    expect(resolveDateLimit('2026-10-05T12:00:00.000Z', {}, now)).toEqual(
      new Date(2026, 9, 5)
    )
    expect(resolveDateLimit(undefined, {}, now)).toBeUndefined()
  })

  it('maxDate today: the day itself passes, tomorrow breaks', () => {
    const f = [{ name: 'pago', maxDate: 'today' as const }]
    expect(dateLimitViolations(f, { pago: new Date(2026, 9, 22, 12).toISOString() }, now)).toEqual({})
    expect(
      dateLimitViolations(f, { pago: new Date(2026, 9, 23, 12).toISOString() }, now)
    ).toEqual({ pago: { kind: 'max', limit: new Date(2026, 9, 22) } })
  })

  it('minDate from another field (vencimento ≥ emissão); empty values pass', () => {
    const f = [{ name: 'vencimento', minDate: (v: Record<string, unknown>) => v.emissao as string }]
    const emissao = new Date(2026, 9, 10, 12).toISOString()
    expect(
      dateLimitViolations(f, { emissao, vencimento: new Date(2026, 9, 9, 12).toISOString() }, now)
    ).toEqual({ vencimento: { kind: 'min', limit: new Date(2026, 9, 10) } })
    expect(dateLimitViolations(f, { emissao, vencimento: '' }, now)).toEqual({})
    expect(dateLimitViolations(f, { vencimento: new Date(2020, 0, 1).toISOString() }, now)).toEqual({})
  })
})
