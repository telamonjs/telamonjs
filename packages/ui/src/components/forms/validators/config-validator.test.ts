import { describe, expect, it } from 'vitest'
import { validateFormField } from './config-validator'
import type { FormField } from '../../../types/forms/admin-form'

// Regression: the validator required 'col-span-N', but the renderer builds `col-span-${span}`.
// The documented contract is span: '2'.
const base = { name: 'campo', label: 'Campo', type: 'text' as const } satisfies FormField

describe('validateFormField — span', () => {
  it("aceita '1'..'12' e 'full' (sufixo da classe)", () => {
    for (const span of ['1', '2', '12', 'full']) {
      expect(validateFormField({ ...base, span }).warnings.some((w) => w.includes('span'))).toBe(false)
    }
  })
  it("avisa em 'col-span-2' e fora do intervalo", () => {
    for (const span of ['col-span-2', '0', '13', 'abc']) {
      expect(validateFormField({ ...base, span }).warnings.some((w) => w.includes('span'))).toBe(true)
    }
  })
})

// PRD 068 item 4: `maskType: 'tel'` picks the landline/mobile mask by itself.
describe('validateFormField — masked', () => {
  const masked = { name: 'tel', label: 'Telefone', type: 'masked' as const } satisfies FormField
  it("aceita maskType: 'tel' sem mask", () => {
    expect(validateFormField({ ...masked, maskType: 'tel' }).errors).toEqual([])
  })
  it('continua exigindo mask sem maskType', () => {
    expect(validateFormField(masked).errors.some((e) => e.includes("'mask'"))).toBe(true)
  })
})
