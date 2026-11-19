/**
 * Prisma field -> telamonjs CRUD mapping (FormField `type`, zod expression, TS type).
 *
 * SSOT for field types: apps/docs/content/docs/reference/field-types.mdx.
 * 'select' never exists -- always 'relationship'.
 */
import type { PrismaField } from './prisma-detector.js'

export type CrudFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'boolean'
  | 'date'
  | 'relationship'

/**
 * Property name used in the zod schema / TS interface / FormField `name` for
 * this field. Relation fields are parsed from the Prisma object-typed side
 * (e.g. `cliente Cliente @relation(fields: [clienteId], ...)`) but the value
 * that actually travels over the wire is the FK column (`clienteId`), so
 * that's the name generated code binds to.
 */
export function fieldPropName(field: PrismaField): string {
  // relationFk is the real column name from `@relation(fields: [x], ...)`;
  // `${name}Id` is only a fallback for hand-built PrismaField values that
  // skip the parser (e.g. tests) -- the parser always sets relationFk for
  // relations it keeps (see prisma-detector.ts).
  return field.isRelation ? (field.relationFk ?? `${field.name}Id`) : field.name
}

export function crudFieldType(field: PrismaField): CrudFieldType {
  if (field.isRelation || field.enumValues) return 'relationship'

  switch (field.type) {
    case 'Int':
    case 'Float':
    case 'Decimal':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'DateTime':
      return 'date'
    default: {
      const name = field.name.toLowerCase()
      if (name.includes('password') || name.includes('senha')) return 'password'
      if (name.includes('email')) return 'email'
      return 'text'
    }
  }
}

function zodBase(field: PrismaField): string {
  if (field.enumValues) {
    return `z.enum([${field.enumValues.map(v => `'${v}'`).join(', ')}])`
  }
  if (field.isRelation) return 'z.string()'

  switch (field.type) {
    case 'Int':
    case 'Float':
    case 'Decimal':
      // AdminForm's FormData submit path serializes numbers as String(value)
      // (see AdminForm.tsx) -- coerce so create/edit form parses ('30') and
      // route handler JSON bodies (real number) both work.
      return 'z.coerce.number()'
    case 'Boolean':
      // FormData mode serializes booleans as the literal strings 'true'/'false'.
      // z.coerce.boolean() would treat ANY non-empty string (including 'false')
      // as true, so coerce explicitly instead.
      return "z.preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean())"
    case 'DateTime':
      // ISO string over JSON, Date instance from the 'date' field/RHF -- coerce covers both
      return 'z.coerce.date()'
    default:
      return field.name.toLowerCase().includes('email')
        ? "z.string().email('Email inválido')"
        : `z.string().min(1, '${field.name} é obrigatório')`
  }
}

/**
 * Zod expression for this field.
 *
 * Optional fields use `.nullish()` (accepts `null | undefined`) rather than
 * `.optional()` -- Prisma's optional scalars are nullable at runtime (`T |
 * null`, see `tsType` below), and `.optional()` alone would reject `null`,
 * breaking assignability between the API entity and the form data type.
 *
 * @param opts.forceOptional - used for PATCH/update schemas, where every
 * field is optional regardless of the model's own nullability. A field
 * that's required in the model still rejects `null` in this mode -- only
 * `undefined` (omitted from the PATCH body) is allowed; `.nullish()` there
 * would let `null` through to a NOT NULL column and blow up at the DB.
 */
export function zodFor(field: PrismaField, opts: { forceOptional?: boolean } = {}): string {
  const base = zodBase(field)
  if (opts.forceOptional) {
    return field.isRequired ? `${base}.optional()` : `${base}.nullish()`
  }
  return field.isRequired ? base : `${base}.nullish()`
}

/** TS type for this field, as used in the generated API client's entity interface. */
export function tsType(field: PrismaField): string {
  let type: string
  if (field.enumValues) {
    type = field.enumValues.map(v => `'${v}'`).join(' | ')
  } else if (field.isRelation) {
    type = 'string'
  } else {
    switch (field.type) {
      case 'Int':
      case 'Float':
      case 'Decimal':
        type = 'number'
        break
      case 'Boolean':
        type = 'boolean'
        break
      default:
        type = 'string' // String and DateTime (ISO string) fields
    }
  }
  return field.isRequired ? type : `${type} | null`
}

/** Fields the create/edit form (and the API create/update schemas) take -- everything but id/timestamps. */
export function formFields(fields: PrismaField[]): PrismaField[] {
  return fields.filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt')
}

/** Credential-like field: stripped from JSON responses, never shown in the view dialog. */
export function isSensitive(field: PrismaField): boolean {
  const n = field.name.toLowerCase()
  return n.includes('password') || n.includes('senha') || n.includes('hash')
}

const DISPLAY_NAMES = ['nome', 'name', 'titulo', 'title', 'descricao', 'description']

/**
 * Property that best identifies a record in a title (dialog header, delete
 * confirm): a conventional name field, else the first plain String field.
 * `undefined` when the model has none (callers fall back to `id`).
 */
export function displayField(fields: PrismaField[]): string | undefined {
  const strings = fields.filter(f => f.type === 'String' && !f.isId && !f.isRelation && !f.enumValues && !isSensitive(f))
  return (strings.find(f => DISPLAY_NAMES.includes(f.name.toLowerCase())) ?? strings[0])?.name
}
