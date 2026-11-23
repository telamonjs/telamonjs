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

    it('keeps snake_case column names intact', () => {
      const result = buildPrismaOrderBy('created_at', 'asc')

      expect(result).toEqual({ created_at: 'asc' })
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

    it('splits only on dots when a path mixes dots and underscores', () => {
      const result = buildPrismaOrderBy('order_item.created_at', 'asc')

      expect(result).toEqual({ order_item: { created_at: 'asc' } })
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

    it('keeps snake_case column names intact', () => {
      const sorting: SortField[] = [
        { field: 'created_at', order: 'asc' },
        { field: 'user.email_address', order: 'desc' },
      ]

      const result = buildPrismaOrderByMulti(sorting)

      expect(result).toEqual([
        { created_at: 'asc' },
        { user: { email_address: 'desc' } },
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
