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

describe('date limits from another field ({ field, offsetDays })', () => {
  const start = new Date(2026, 9, 10, 12).toISOString()

  it("resolves to that field's day, shifted by offsetDays (negative too)", () => {
    expect(resolveDateLimit({ field: 'start' }, { start }, now)).toEqual(new Date(2026, 9, 10))
    expect(resolveDateLimit({ field: 'start', offsetDays: 1 }, { start }, now)).toEqual(new Date(2026, 9, 11))
    expect(resolveDateLimit({ field: 'start', offsetDays: -2 }, { start }, now)).toEqual(new Date(2026, 9, 8))
  })

  it('no limit while the other field is empty or invalid', () => {
    expect(resolveDateLimit({ field: 'start', offsetDays: 1 }, {}, now)).toBeUndefined()
    expect(resolveDateLimit({ field: 'start' }, { start: 'nope' }, now)).toBeUndefined()
  })

  it('a date-only instant (00:00Z) keeps its calendar day before the offset', () => {
    expect(
      resolveDateLimit({ field: 'start', offsetDays: 1 }, { start: '2026-10-10T00:00:00.000Z' }, now)
    ).toEqual(new Date(2026, 9, 11))
  })

  it('the form rejects a day before the other field + offset (strict end > start)', () => {
    const f = [{ name: 'end', minDate: { field: 'start', offsetDays: 1 } }]
    expect(dateLimitViolations(f, { start, end: start }, now)).toEqual({
      end: { kind: 'min', limit: new Date(2026, 9, 11) },
    })
    expect(dateLimitViolations(f, { start, end: new Date(2026, 9, 11, 12).toISOString() }, now)).toEqual({})
  })
})
