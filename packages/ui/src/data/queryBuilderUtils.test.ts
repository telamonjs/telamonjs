import { describe, it, expect } from 'vitest'
import {
  buildPrismaWhere,
  generateConditionId,
  getOperatorsForFieldType,
  validateCondition,
  type Operator,
  type QueryCondition,
} from './queryBuilderUtils'

type Translator = Parameters<typeof getOperatorsForFieldType>[1]
// Echoes the key, so assertions see which message each label/error uses
const t = ((key: string) => key) as unknown as Translator

const cond = (
  operator: Operator,
  value: QueryCondition['value'],
  field = 'name'
): QueryCondition => ({ id: `${field}-${operator}`, field, operator, value })

describe('buildPrismaWhere', () => {
  describe('Group shape', () => {
    it('returns undefined for a group without conditions', () => {
      expect(buildPrismaWhere({ logic: 'AND', conditions: [] })).toBeUndefined()
    })

    it('unwraps a single condition instead of nesting it in the logic key', () => {
      expect(buildPrismaWhere({ logic: 'OR', conditions: [cond('equals', 'Ana')] })).toEqual({
        name: 'Ana',
      })
    })

    it('combines several conditions under the group logic', () => {
      const conditions = [cond('gte', 18, 'age'), cond('lt', 65, 'age')]
      expect(buildPrismaWhere({ logic: 'AND', conditions })).toEqual({
        AND: [{ age: { gte: 18 } }, { age: { lt: 65 } }],
      })
      expect(buildPrismaWhere({ logic: 'OR', conditions })).toEqual({
        OR: [{ age: { gte: 18 } }, { age: { lt: 65 } }],
      })
    })

    it('drops conditions without a value, unwrapping what is left', () => {
      const group = {
        logic: 'AND' as const,
        conditions: [cond('equals', ''), cond('contains', null), cond('equals', 'Ana')],
      }
      expect(buildPrismaWhere(group)).toEqual({ name: 'Ana' })
    })

    it('returns undefined when every condition is incomplete', () => {
      const group = { logic: 'AND' as const, conditions: [cond('equals', ''), cond('gt', null)] }
      expect(buildPrismaWhere(group)).toBeUndefined()
    })
  })

  describe('Operators', () => {
    it.each<[Operator, QueryCondition['value'], Record<string, unknown>]>([
      ['equals', 'Ana', { name: 'Ana' }],
      ['notEquals', 'Ana', { name: { not: 'Ana' } }],
      ['contains', 'an', { name: { contains: 'an', mode: 'insensitive' } }],
      ['startsWith', 'A', { name: { startsWith: 'A', mode: 'insensitive' } }],
      ['endsWith', 'a', { name: { endsWith: 'a', mode: 'insensitive' } }],
      ['gt', 1, { name: { gt: 1 } }],
      ['gte', 1, { name: { gte: 1 } }],
      ['lt', 1, { name: { lt: 1 } }],
      ['lte', 1, { name: { lte: 1 } }],
      ['in', ['a', 'b'], { name: { in: ['a', 'b'] } }],
      ['notIn', ['a', 'b'], { name: { notIn: ['a', 'b'] } }],
    ])('maps %s', (operator, value, expected) => {
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond(operator, value)] })).toEqual(
        expected
      )
    })

    it('negates contains with NOT, since Prisma rejects mode inside a not filter', () => {
      // `{ name: { not: { contains, mode } } }` fails Prisma validation:
      // NestedStringFilter has no `mode`
      expect(
        buildPrismaWhere({ logic: 'AND', conditions: [cond('notContains', 'an')] })
      ).toEqual({ NOT: { name: { contains: 'an', mode: 'insensitive' } } })
    })

    it('wraps a scalar value of in/notIn in an array', () => {
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond('in', 'a')] })).toEqual({
        name: { in: ['a'] },
      })
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond('notIn', 'a')] })).toEqual({
        name: { notIn: ['a'] },
      })
    })

    it('ignores the value of isNull/isNotNull', () => {
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond('isNull', '')] })).toEqual({
        name: null,
      })
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond('isNotNull', 'x')] })).toEqual({
        name: { not: null },
      })
    })
  })

  describe('Edge Cases', () => {
    it('keeps falsy values that are real filters (false, 0)', () => {
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond('equals', false, 'active')] })).toEqual(
        { active: false }
      )
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond('gt', 0, 'stock')] })).toEqual({
        stock: { gt: 0 },
      })
    })

    it('passes a Date through untouched', () => {
      const date = new Date('2026-01-01T00:00:00Z')
      expect(buildPrismaWhere({ logic: 'AND', conditions: [cond('gte', date, 'createdAt')] })).toEqual(
        { createdAt: { gte: date } }
      )
    })
  })
})

describe('getOperatorsForFieldType', () => {
  const values = (type: Parameters<typeof getOperatorsForFieldType>[0]) =>
    getOperatorsForFieldType(type, t).map(o => o.value)

  it('offers the text operators for strings', () => {
    expect(values('string')).toEqual([
      'equals',
      'notEquals',
      'contains',
      'notContains',
      'startsWith',
      'endsWith',
      'isNull',
      'isNotNull',
    ])
  })

  it('offers comparisons for numbers and dates', () => {
    const expected = ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isNull', 'isNotNull']
    expect(values('number')).toEqual(expected)
    expect(values('date')).toEqual(expected)
  })

  it('offers only equality for booleans', () => {
    expect(values('boolean')).toEqual(['equals', 'notEquals'])
  })

  it('offers set membership for enums', () => {
    expect(values('enum')).toEqual(['equals', 'notEquals', 'in', 'notIn', 'isNull', 'isNotNull'])
  })

  it('labels every operator through the translator', () => {
    expect(getOperatorsForFieldType('boolean', t)).toEqual([
      { value: 'equals', label: 'data.operatorEquals' },
      { value: 'notEquals', label: 'data.operatorNotEquals' },
    ])
  })
})

describe('validateCondition', () => {
  it('requires a field, then an operator', () => {
    expect(validateCondition(cond('equals', 'x', ''), t)).toBe('data.fieldRequired')
    expect(validateCondition({ ...cond('equals', 'x'), operator: '' as Operator }, t)).toBe(
      'data.operatorRequired'
    )
  })

  it('requires a value except for the null operators', () => {
    expect(validateCondition(cond('equals', ''), t)).toBe('data.valueRequired')
    expect(validateCondition(cond('equals', null), t)).toBe('data.valueRequired')
    expect(validateCondition(cond('isNull', null), t)).toBeNull()
    expect(validateCondition(cond('isNotNull', ''), t)).toBeNull()
  })

  it('accepts falsy values that are real filters', () => {
    expect(validateCondition(cond('equals', false), t)).toBeNull()
    expect(validateCondition(cond('equals', 0), t)).toBeNull()
  })
})

describe('generateConditionId', () => {
  it('returns distinct prefixed ids', () => {
    const ids = new Set(Array.from({ length: 50 }, generateConditionId))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(/^condition_\d+_[a-z0-9]+$/)
  })
})
