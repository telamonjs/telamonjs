import { describe, it, expect } from 'vitest'
import {
  collectHiddenFieldNames,
  omitHiddenFields,
  stripHiddenErrors,
} from './visibility'
import type { FormField, FormSection } from '../../../types/forms/admin-form'

const field = (overrides: Partial<FormField> = {}): FormField => ({
  name: 'field',
  label: 'Field',
  type: 'text',
  ...overrides,
})

describe('collectHiddenFieldNames', () => {
  it('hides a field whose visibleWhen returns false', () => {
    const fields = [field({ name: 'secret', visibleWhen: v => v.show === true })]
    expect(collectHiddenFieldNames({ fields }, { show: false })).toEqual(
      new Set(['secret'])
    )
  })

  it('shows a field whose visibleWhen returns true', () => {
    const fields = [field({ name: 'secret', visibleWhen: v => v.show === true })]
    expect(collectHiddenFieldNames({ fields }, { show: true })).toEqual(
      new Set()
    )
  })

  it('never hides a field without visibleWhen', () => {
    const fields = [field({ name: 'always' })]
    expect(collectHiddenFieldNames({ fields }, {})).toEqual(new Set())
  })

  it('hides every field of a section whose own visibleWhen returns false, regardless of the fields own visibleWhen', () => {
    const sections: FormSection[] = [
      {
        label: 'Cotas',
        visibleWhen: v => v.aplicarCotas === true,
        fields: [
          field({ name: 'percentualPPI' }),
          field({ name: 'percentualPCD', visibleWhen: () => true }),
        ],
      },
    ]
    expect(
      collectHiddenFieldNames({ sections }, { aplicarCotas: false })
    ).toEqual(new Set(['percentualPPI', 'percentualPCD']))
  })

  it('flattens row-structured section fields ([][]) before evaluating', () => {
    const sections: FormSection[] = [
      {
        label: 'Row',
        fields: [
          [field({ name: 'a', visibleWhen: v => v.on === true })],
          [field({ name: 'b' })],
        ],
      },
    ]
    expect(collectHiddenFieldNames({ sections }, { on: false })).toEqual(
      new Set(['a'])
    )
  })
})

describe('omitHiddenFields', () => {
  it('returns the same reference when nothing is hidden', () => {
    const values = { a: 1 }
    expect(omitHiddenFields(values, new Set())).toBe(values)
  })

  it('deletes a flat hidden key without mutating the original', () => {
    const values = { a: 1, b: 2 }
    const result = omitHiddenFields(values, new Set(['b']))
    expect(result).toEqual({ a: 1 })
    expect(values).toEqual({ a: 1, b: 2 }) // original untouched
  })

  it('deletes a dotted nested path', () => {
    const values = { pessoa: { cpf: '123', nome: 'Ana' } }
    const result = omitHiddenFields(values, new Set(['pessoa.cpf']))
    expect(result).toEqual({ pessoa: { nome: 'Ana' } })
  })

  it('keeps File values by reference instead of trying to clone them', () => {
    const file = new File(['x'], 'x.txt')
    const values = { avatar: file, other: 1 }
    const result = omitHiddenFields(values, new Set(['other']))
    expect(result.avatar).toBe(file)
    expect(result).toEqual({ avatar: file })
  })
})

describe('stripHiddenErrors', () => {
  it('is a no-op when nothing is hidden', () => {
    const errors = { name: { message: 'Required' } }
    expect(stripHiddenErrors(errors, new Set())).toBe(errors)
  })

  it('removes a flat error entry', () => {
    const errors: Record<string, unknown> = {
      name: { message: 'Required' },
      secret: { message: 'Required' },
    }
    stripHiddenErrors(errors, new Set(['secret']))
    expect(errors).toEqual({ name: { message: 'Required' } })
  })

  it('removes a nested dotted-path error entry', () => {
    const errors: Record<string, unknown> = {
      pessoa: { cpf: { message: 'Invalid' } },
    }
    stripHiddenErrors(errors, new Set(['pessoa.cpf']))
    expect(errors).toEqual({ pessoa: {} })
  })
})
