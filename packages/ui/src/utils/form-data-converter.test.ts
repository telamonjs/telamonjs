/**
 * form-data-converter Test Suite
 *
 * FormData conversion, nested/flat transformation.
 */

import { describe, it, expect } from 'vitest'
import { hasNestedStructure } from './form-data-converter'

describe('form-data-converter', () => {
  describe('hasNestedStructure', () => {
    it('returns true for nested objects', () => {
      const nested = {
        pessoa: { nome: 'João', cpf: '123' },
        email: 'joao@email.com',
      }

      expect(hasNestedStructure(nested)).toBe(true)
    })

    it('returns false for flat objects', () => {
      const flat = {
        'pessoa.nome': 'João',
        'pessoa.cpf': '123',
        email: 'joao@email.com',
      }

      expect(hasNestedStructure(flat)).toBe(false)
    })

    it('returns false for null', () => {
      expect(hasNestedStructure(null as any)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(hasNestedStructure(undefined as any)).toBe(false)
    })

    it('returns false for primitives', () => {
      expect(hasNestedStructure('string' as any)).toBe(false)
      expect(hasNestedStructure(123 as any)).toBe(false)
    })

    it('returns false for arrays', () => {
      expect(hasNestedStructure([1, 2, 3] as any)).toBe(false)
    })

    it('returns false for Date objects', () => {
      const data = { date: new Date() }
      expect(hasNestedStructure(data)).toBe(false)
    })

    it('returns false for empty objects', () => {
      expect(hasNestedStructure({})).toBe(false)
    })

    it('returns false for objects with only primitive values', () => {
      const data = {
        name: 'João',
        age: 30,
        active: true,
      }
      expect(hasNestedStructure(data)).toBe(false)
    })

    it('returns false for objects with empty nested objects', () => {
      const data = {
        pessoa: {},
        email: 'test@email.com',
      }
      expect(hasNestedStructure(data)).toBe(false)
    })
  })
})
