import { describe, it, expect } from 'vitest'
import type { PrismaField } from './prisma-detector.js'
import { crudFieldType, displayField, fieldPropName, formFields, isSensitive, tsType, zodFor } from './field-mapping.js'

const field = (over: Partial<PrismaField> & Pick<PrismaField, 'name'>): PrismaField => ({
  type: 'String',
  isRequired: true,
  isUnique: false,
  isId: false,
  isRelation: false,
  ...over,
})

describe('fieldPropName', () => {
  it('binds relations to their FK column', () => {
    expect(fieldPropName(field({ name: 'cliente', isRelation: true, relationFk: 'donoId' }))).toBe('donoId')
    expect(fieldPropName(field({ name: 'cliente', isRelation: true }))).toBe('clienteId')
    expect(fieldPropName(field({ name: 'nome' }))).toBe('nome')
  })
})

describe('crudFieldType', () => {
  it.each<[Partial<PrismaField> & Pick<PrismaField, 'name'>, string]>([
    [{ name: 'cliente', isRelation: true }, 'relationship'],
    [{ name: 'status', type: 'Status', enumValues: ['A', 'B'] }, 'relationship'],
    [{ name: 'idade', type: 'Int' }, 'number'],
    [{ name: 'preco', type: 'Decimal' }, 'number'],
    [{ name: 'ativo', type: 'Boolean' }, 'boolean'],
    [{ name: 'nascimento', type: 'DateTime' }, 'date'],
    [{ name: 'senhaHash' }, 'password'],
    [{ name: 'emailContato' }, 'email'],
    [{ name: 'nome' }, 'text'],
  ])('%o -> %s', (over, type) => {
    expect(crudFieldType(field(over))).toBe(type)
  })
})

describe('zodFor', () => {
  it('maps types to zod expressions', () => {
    expect(zodFor(field({ name: 'nome' }))).toBe("z.string().min(1, 'nome é obrigatório')")
    expect(zodFor(field({ name: 'email' }))).toBe("z.string().email('Email inválido')")
    expect(zodFor(field({ name: 'idade', type: 'Int' }))).toBe('z.coerce.number()')
    expect(zodFor(field({ name: 'quando', type: 'DateTime' }))).toBe('z.coerce.date()')
    expect(zodFor(field({ name: 'ativo', type: 'Boolean' }))).toContain('z.preprocess(')
    expect(zodFor(field({ name: 'cliente', isRelation: true }))).toBe('z.string()')
    expect(zodFor(field({ name: 'status', enumValues: ['A', 'B'] }))).toBe("z.enum(['A', 'B'])")
  })

  it('optional fields accept null; forceOptional only lets required fields be omitted', () => {
    const optional = field({ name: 'idade', type: 'Int', isRequired: false })
    const required = field({ name: 'idade', type: 'Int' })
    expect(zodFor(optional)).toBe('z.coerce.number().nullish()')
    expect(zodFor(required, { forceOptional: true })).toBe('z.coerce.number().optional()')
    expect(zodFor(optional, { forceOptional: true })).toBe('z.coerce.number().nullish()')
  })
})

describe('tsType', () => {
  it('maps types, with | null for optional fields', () => {
    expect(tsType(field({ name: 'idade', type: 'Float' }))).toBe('number')
    expect(tsType(field({ name: 'ativo', type: 'Boolean', isRequired: false }))).toBe('boolean | null')
    expect(tsType(field({ name: 'quando', type: 'DateTime' }))).toBe('string')
    expect(tsType(field({ name: 'cliente', isRelation: true }))).toBe('string')
    expect(tsType(field({ name: 'status', enumValues: ['A', 'B'] }))).toBe("'A' | 'B'")
  })
})

describe('formFields / isSensitive / displayField', () => {
  const fields = [
    field({ name: 'id', isId: true }),
    field({ name: 'codigo' }),
    field({ name: 'titulo' }),
    field({ name: 'passwordHash' }),
    field({ name: 'createdAt', type: 'DateTime' }),
    field({ name: 'updatedAt', type: 'DateTime' }),
  ]

  it('formFields drops id and timestamps', () => {
    expect(formFields(fields).map(f => f.name)).toEqual(['codigo', 'titulo', 'passwordHash'])
  })

  it('isSensitive flags credential-like names', () => {
    expect(fields.filter(isSensitive).map(f => f.name)).toEqual(['passwordHash'])
    expect(isSensitive(field({ name: 'senha' }))).toBe(true)
  })

  it('displayField prefers a conventional name, else the first plain string, else undefined', () => {
    expect(displayField(fields)).toBe('titulo')
    expect(displayField([field({ name: 'id', isId: true }), field({ name: 'codigo' })])).toBe('codigo')
    expect(displayField([field({ name: 'id', isId: true }), field({ name: 'idade', type: 'Int' })])).toBeUndefined()
  })
})
