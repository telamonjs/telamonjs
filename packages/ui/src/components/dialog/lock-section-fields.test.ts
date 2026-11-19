import { describe, it, expect } from 'vitest'
import { lockSectionFields } from './lock-section-fields'

describe('lockSectionFields (edit lockedFields, 7.14)', () => {
  const sections = [
    {
      label: 'Básicas',
      fields: [
        { name: 'faturaId', label: 'Fatura', type: 'relationship' },
        { name: 'valorPago', label: 'Valor', type: 'currency' },
      ],
    },
    {
      label: 'Linhas',
      fields: [[{ name: 'clienteId', label: 'Cliente', type: 'relationship' }]],
    },
  ] as never[]

  it('marks only the locked fields readOnly (flat and row-based)', () => {
    const out = lockSectionFields(sections, ['faturaId', 'clienteId']) as never as {
      fields: ({ name: string; readOnly?: boolean } | { name: string; readOnly?: boolean }[])[]
    }[]
    expect(out[0].fields[0]).toMatchObject({ name: 'faturaId', readOnly: true })
    expect(out[0].fields[1]).not.toHaveProperty('readOnly')
    expect((out[1].fields[0] as { readOnly?: boolean }[])[0].readOnly).toBe(true)
  })

  it('returns the same array when nothing is locked', () => {
    expect(lockSectionFields(sections)).toBe(sections)
  })
})
