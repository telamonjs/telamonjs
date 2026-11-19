/**
 * Prisma schema detection and parsing utilities
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface PrismaField {
  name: string
  type: string
  isRequired: boolean
  isUnique: boolean
  isId: boolean
  isRelation: boolean
  relationType?: string
  /** FK column name from `@relation(fields: [x], ...)` (owning side only). */
  relationFk?: string
  default?: string
  showInTable?: boolean
  searchable?: boolean
  section?: string
  /** Values of the Prisma `enum` this field's type refers to (undefined for non-enum fields). */
  enumValues?: string[]
}

export interface PrismaModel {
  name: string
  fields: PrismaField[]
}

/**
 * Detect Prisma schema file location
 */
export function detectPrismaSchemaPath(
  cwd: string = process.cwd()
): string | null {
  const possiblePaths = [
    join(cwd, 'prisma', 'schema.prisma'),
    join(cwd, 'database', 'schema.prisma'),
    join(cwd, 'src', 'prisma', 'schema.prisma'),
  ]

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path
    }
  }

  return null
}

/**
 * Parse Prisma schema and extract model definition
 */
export function parsePrismaModel(
  modelName: string,
  cwd: string = process.cwd()
): PrismaModel | null {
  const schemaPath = detectPrismaSchemaPath(cwd)

  if (!schemaPath) {
    return null
  }

  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8')
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([^}]+)\\}`, 's')
    const match = schemaContent.match(modelRegex)

    if (!match) {
      return null
    }

    const modelBody = match[1]
    const fields = parseModelFields(modelBody, parseEnums(schemaContent), parseModelNames(schemaContent))

    return {
      name: modelName,
      fields,
    }
  } catch (error) {
    console.error('Error parsing Prisma schema:', error)
    return null
  }
}

/**
 * Parse `enum X { A B C }` blocks from a full schema.prisma source.
 */
function parseEnums(schemaContent: string): Map<string, string[]> {
  const enums = new Map<string, string[]>()
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g

  let match: RegExpExecArray | null
  while ((match = enumRegex.exec(schemaContent)) !== null) {
    const [, name, body] = match
    const values = body
      .split('\n')
      .map(l => l.replace(/\/\/.*$/, '').trim()) // strip inline comments
      .filter(l => l && !l.startsWith('@@')) // skip block attributes (@@map, ...)
      .map(l => l.split(/\s+/)[0]) // value identifier only -- @map("...") renames the DB value, not the TS one
    enums.set(name, values)
  }

  return enums
}

/**
 * Collect every `model X { ... }` name in the schema, so field lines whose
 * type is another model can be recognized as relations even without an
 * explicit `@relation` attribute (the non-owning side of a 1:1, e.g.
 * `profile Profile?`, has none).
 */
function parseModelNames(schemaContent: string): Set<string> {
  const names = new Set<string>()
  const modelRegex = /model\s+(\w+)\s*\{/g

  let match: RegExpExecArray | null
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    names.add(match[1])
  }

  return names
}

/**
 * Parse model fields from model body string
 */
function parseModelFields(
  modelBody: string,
  enums: Map<string, string[]>,
  modelNames: Set<string>
): PrismaField[] {
  const lines = modelBody
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'))
  const fields: PrismaField[] = []

  for (const line of lines) {
    // Skip attributes like @@unique, @@index
    if (line.startsWith('@@')) continue

    const field = parseFieldLine(line, modelNames)
    if (field) {
      if (enums.has(field.type)) field.enumValues = enums.get(field.type)
      fields.push(field)
    }
  }

  // Relation FK columns (e.g. `clienteId`) are represented in generated code
  // by their object-typed sibling (`cliente Cliente @relation(fields: [clienteId], ...)`)
  // instead -- drop the raw scalar so callers don't emit both a 'relationship'
  // field (cliente) and a duplicate 'text' field (clienteId) for the same column.
  // Matched on the actual FK name from `fields: [...]`, not a `${name}Id`
  // naming convention -- Prisma doesn't require the two to match.
  const relationFkNames = new Set(
    fields.filter(f => f.isRelation && f.relationFk).map(f => f.relationFk as string)
  )
  return fields.filter(f => f.isRelation || !relationFkNames.has(f.name))
}

/**
 * Parse a single field line
 * Example: "id String @id @default(cuid())"
 */
function parseFieldLine(line: string, modelNames: Set<string>): PrismaField | null {
  // Basic field pattern: fieldName Type[] modifiers
  const match = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/)

  if (!match) return null

  const [, name, type, isList, optional, rest] = match

  // Back-relation array side (e.g. `posts Post[]`) has no column on this
  // model -- nothing to render in a form/column/API for it.
  if (isList) return null

  const isRequired = !optional
  const isUnique = rest.includes('@unique')
  const isId = rest.includes('@id')
  // A field is a relation when it carries @relation, OR its type is another
  // declared model -- the non-owning side of a 1:1 (e.g. `profile Profile?`)
  // has no @relation attribute at all.
  const isRelation = rest.includes('@relation') || modelNames.has(type)

  // Determine relation type + FK column (owning side only, from `fields: [x]`)
  let relationType: string | undefined
  let relationFk: string | undefined
  if (isRelation) {
    relationType = type
    const fkMatch = rest.match(/fields:\s*\[\s*(\w+)/)
    if (fkMatch) relationFk = fkMatch[1]
  }

  // Non-owning side of a relation has no FK column on this table (it lives
  // on the other model) -- nothing to bind a form/API field to, so skip it
  // like the array back-relation side above. It's not editable by the
  // simple generated CRUD.
  if (isRelation && !relationFk) return null

  // Extract default value
  let defaultValue: string | undefined
  const defaultMatch = rest.match(/@default\(([^)]+)\)/)
  if (defaultMatch) {
    defaultValue = defaultMatch[1]
  }

  // Determine if should show in table (exclude relations, timestamps by default)
  const showInTable =
    !isRelation && !['createdAt', 'updatedAt', 'deletedAt'].includes(name)

  // Determine if searchable (String fields, not IDs)
  const searchable = type === 'String' && !isId && !isRelation

  // Assign section based on field semantics
  let section = 'main'
  if (['email', 'telefone', 'celular', 'phone'].includes(name.toLowerCase())) {
    section = 'contact'
  } else if (['createdAt', 'updatedAt', 'deletedAt'].includes(name)) {
    section = 'meta'
  }

  return {
    name,
    type,
    isRequired,
    isUnique,
    isId,
    isRelation,
    relationType,
    relationFk,
    default: defaultValue,
    showInTable,
    searchable,
    section,
  }
}

/**
 * List all models in Prisma schema
 */
export function listPrismaModels(cwd: string = process.cwd()): string[] {
  const schemaPath = detectPrismaSchemaPath(cwd)

  if (!schemaPath) {
    return []
  }

  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8')
    const modelRegex = /model\s+(\w+)\s*\{/g
    const models: string[] = []

    let match
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      models.push(match[1])
    }

    return models
  } catch (error) {
    console.error('Error listing Prisma models:', error)
    return []
  }
}
