/**
 * prisma-helpers Test Suite
 *
 * Prisma query helpers.
 */

import { describe, it, expect } from 'vitest'
import { buildPrismaOrderBy, buildPrismaOrderByMulti } from './prisma-helpers'
import type { SortField } from '../types/pagination'

describe('prisma-helpers', () => {
  describe('buildPrismaOrderBy', () => {
    it('builds simple orderBy for top-level field', () => {
      const result = buildPrismaOrderBy('createdAt', 'desc')

      expect(result).toEqual({ createdAt: 'desc' })
    })

    it('builds nested orderBy for dot notation', () => {
      const result = buildPrismaOrderBy('categoria.nome', 'asc')

      expect(result).toEqual({ categoria: { nome: 'asc' } })
    })

    it('converts underscores to dots (TanStack Table format)', () => {
      const result = buildPrismaOrderBy('categoria_nome', 'asc')

      expect(result).toEqual({ categoria: { nome: 'asc' } })
    })

    it('handles deeply nested paths', () => {
      const result = buildPrismaOrderBy('categoria.unidade.nome', 'asc')

      expect(result).toEqual({
        categoria: {
          unidade: {
            nome: 'asc',
          },
        },
      })
    })

    it('defaults to desc order', () => {
      const result = buildPrismaOrderBy('createdAt')

      expect(result).toEqual({ createdAt: 'desc' })
    })

    it('takes a dotted path verbatim, underscores included', () => {
      // A dot means the client sent a data path (`list.sortParam: 'path'`),
      // never a TanStack column id, so its underscores are part of the names
      expect(buildPrismaOrderBy('order_item.created_at', 'asc')).toEqual({
        order_item: { created_at: 'asc' },
      })
    })

    it('orders by a relation count', () => {
      expect(buildPrismaOrderBy('_count.items', 'asc')).toEqual({
        items: { _count: 'asc' },
      })
      expect(buildPrismaOrderBy('customer._count.orders', 'desc')).toEqual({
        customer: { orders: { _count: 'desc' } },
      })
    })

    it('decodes the TanStack id of a relation count', () => {
      expect(buildPrismaOrderBy('_count_items', 'asc')).toEqual({
        items: { _count: 'asc' },
      })
      expect(buildPrismaOrderBy('customer__count_orders', 'desc')).toEqual({
        customer: { orders: { _count: 'desc' } },
      })
    })

    it('keeps a leading underscore as part of the name', () => {
      expect(buildPrismaOrderBy('_id', 'asc')).toEqual({ _id: 'asc' })
    })

    describe('with sortableFields', () => {
      it('keeps a listed snake_case field intact', () => {
        expect(buildPrismaOrderBy('created_at', 'asc', ['created_at'])).toEqual(
          { created_at: 'asc' }
        )
      })

      it('decodes a TanStack id whose dotted form is listed', () => {
        expect(
          buildPrismaOrderBy('customer_name', 'asc', ['customer.name'])
        ).toEqual({ customer: { name: 'asc' } })
      })

      it('keeps an unlisted underscored value intact instead of guessing', () => {
        expect(buildPrismaOrderBy('created_at', 'asc', ['name'])).toEqual({
          created_at: 'asc',
        })
      })
    })

    it('still decodes underscores without sortableFields (legacy ids)', () => {
      // Ambiguous on purpose: list snake_case fields in sortableFields
      expect(buildPrismaOrderBy('created_at', 'asc')).toEqual({
        created: { at: 'asc' },
      })
    })
  })

  describe('buildPrismaOrderByMulti', () => {
    it('builds array of orderBy for multiple fields', () => {
      const sorting: SortField[] = [
        { field: 'categoria.nome', order: 'asc' },
        { field: 'vigenciaInicio', order: 'desc' },
      ]

      const result = buildPrismaOrderByMulti(sorting)

      expect(result).toEqual([
        { categoria: { nome: 'asc' } },
        { vigenciaInicio: 'desc' },
      ])
    })

    it('handles empty array', () => {
      const result = buildPrismaOrderByMulti([])

      expect(result).toEqual([])
    })

    it('converts underscores to dots', () => {
      const sorting: SortField[] = [
        { field: 'categoria_nome', order: 'asc' },
        { field: 'user_email', order: 'desc' },
      ]

      const result = buildPrismaOrderByMulti(sorting)

      expect(result).toEqual([
        { categoria: { nome: 'asc' } },
        { user: { email: 'desc' } },
      ])
    })

    it('handles deeply nested fields', () => {
      const sorting: SortField[] = [
        { field: 'categoria.unidade.nome', order: 'asc' },
      ]

      const result = buildPrismaOrderByMulti(sorting)

      expect(result).toEqual([
        {
          categoria: {
            unidade: {
              nome: 'asc',
            },
          },
        },
      ])
    })

    it('resolves each field against sortableFields', () => {
      const sorting: SortField[] = [
        { field: 'created_at', order: 'desc' },
        { field: 'customer_name', order: 'asc' },
        { field: '_count.items', order: 'desc' },
      ]

      expect(
        buildPrismaOrderByMulti(sorting, ['created_at', 'customer.name'])
      ).toEqual([
        { created_at: 'desc' },
        { customer: { name: 'asc' } },
        { items: { _count: 'desc' } },
      ])
    })

    it('handles mixed simple and nested fields', () => {
      const sorting: SortField[] = [
        { field: 'createdAt', order: 'desc' },
        { field: 'categoria.nome', order: 'asc' },
        { field: 'status', order: 'asc' },
      ]

      const result = buildPrismaOrderByMulti(sorting)

      expect(result).toEqual([
        { createdAt: 'desc' },
        { categoria: { nome: 'asc' } },
        { status: 'asc' },
      ])
    })
  })
})
