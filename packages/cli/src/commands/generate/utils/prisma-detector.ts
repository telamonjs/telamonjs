/**
 * Prisma schema detection and parsing utilities
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'

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

/** Single-file schema locations, tried in order (in the app, then at the workspace root). */
const SCHEMA_FILES = [
  'prisma/schema.prisma',
  'database/schema.prisma',
  'src/prisma/schema.prisma',
  // `telamonjs create --monorepo`: the schema lives in the shared package
  'packages/shared/prisma/schema.prisma',
]

/** Multi-file schema folders (`prismaSchemaFolder`): every `*.prisma` inside, nested folders included. */
const SCHEMA_FOLDERS = ['prisma/schema', 'packages/shared/prisma/schema']

/**
 * The app itself, then -- when it sits inside a pnpm workspace (a monorepo's
 * `apps/web`) -- the workspace root, where `packages/shared/prisma` lives.
 */
function searchRoots(cwd: string): string[] {
  const app = resolve(cwd)
  for (let dir = app; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir === app ? [app] : [app, dir]
    if (dirname(dir) === dir) return [app]
  }
}

function schemaFiles(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: 'utf-8' })
    .filter(file => file.endsWith('.prisma'))
    .sort()
    .map(file => join(folder, file))
}

function isSchemaFolder(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory() && schemaFiles(path).length > 0
}

/** `package.json#prisma.schema` (a file or a folder): the path Prisma itself would use. */
function configuredSchema(root: string): string | null {
  const pkgPath = join(root, 'package.json')
  if (!existsSync(pkgPath)) return null
  let schema: unknown
  try {
    schema = (JSON.parse(readFileSync(pkgPath, 'utf-8')) as { prisma?: { schema?: unknown } }).prisma?.schema
  } catch {
    // ponytail: an unparsable package.json is not ours to report -- fall through to the fixed paths
    return null
  }
  if (typeof schema !== 'string') return null
  const path = resolve(root, schema)
  return existsSync(path) && (statSync(path).isFile() || isSchemaFolder(path)) ? path : null
}

/**
 * Detect the Prisma schema: `package.json#prisma.schema`, then the fixed
 * single-file locations, then a multi-file schema folder -- in the app and,
 * inside a pnpm workspace, at the workspace root. Returns a `.prisma` file or
 * a folder of them.
 */
export function detectPrismaSchemaPath(
  cwd: string = process.cwd()
): string | null {
  for (const root of searchRoots(cwd)) {
    const configured = configuredSchema(root)
    if (configured) return configured
    for (const file of SCHEMA_FILES) {
      if (existsSync(join(root, file))) return join(root, file)
    }
    for (const folder of SCHEMA_FOLDERS) {
      if (isSchemaFolder(join(root, folder))) return join(root, folder)
    }
  }

  return null
}

/** The whole schema source (every file of a multi-file schema, concatenated), or null when there is none. */
function readPrismaSchema(cwd: string): { path: string; content: string } | null {
  const path = detectPrismaSchemaPath(cwd)
  if (!path) return null
  const files = statSync(path).isDirectory() ? schemaFiles(path) : [path]
  return { path, content: files.map(file => readFileSync(file, 'utf-8')).join('\n') }
}

/**
 * Like `parsePrismaModel`, but fails with a message the user can act on:
 * where the schema was looked for, or which models it does have.
 */
export function requirePrismaModel(modelName: string, cwd: string = process.cwd()): PrismaModel {
  const hint = 'Pass --no-prisma-schema to generate generic fields instead.'
  const schemaPath = detectPrismaSchemaPath(cwd)
  if (!schemaPath) {
    const places = ['package.json#prisma.schema', ...SCHEMA_FILES, ...SCHEMA_FOLDERS.map(f => `${f}/*.prisma`)]
    throw new Error(
      `No Prisma schema found in ${searchRoots(cwd).join(' or ')} (looked for ${places.join(', ')}). ${hint}`
    )
  }
  const model = parsePrismaModel(modelName, cwd)
  if (!model) {
    const models = listPrismaModels(cwd).join(', ') || '(none)'
    throw new Error(`Model '${modelName}' not found in ${schemaPath}. Models: ${models}. ${hint}`)
  }
  return model
}

/**
 * Parse Prisma schema and extract model definition
 */
export function parsePrismaModel(
  modelName: string,
  cwd: string = process.cwd()
): PrismaModel | null {
  const schema = readPrismaSchema(cwd)

  if (!schema) {
    return null
  }

  const blocks = parseBlocks(schema.content)
  // Compared by equality: the name is never turned into a pattern
  const model = blocks.find(b => b.keyword === 'model' && b.name === modelName)

  if (!model) {
    return null
  }

  const enums = new Map(
    blocks
      .filter(b => b.keyword === 'enum')
      .map(b => [
        b.name,
        codeLines(b.body)
          .filter(l => !l.startsWith('@@')) // skip block attributes (@@map, ...)
          .map(l => l.split(/\s+/)[0]), // value identifier only -- @map("...") renames the DB value, not the TS one
      ])
  )
  // Every model name, so a field whose type is another model is a relation even
  // without `@relation` (the non-owning side of a 1:1, e.g. `profile Profile?`)
  const modelNames = new Set(blocks.filter(b => b.keyword === 'model').map(b => b.name))

  return {
    name: modelName,
    fields: parseModelFields(model.body, enums, modelNames),
  }
}

interface SchemaBlock {
  keyword: string
  name: string
  body: string
}

/**
 * Index just past a `"string"` or a `//` comment starting at `i` (the only
 * comment form Prisma has; `///` is one too), or `i` itself when neither starts there.
 */
function skipNonCode(src: string, i: number): number {
  if (src.startsWith('//', i)) {
    const end = src.indexOf('\n', i)
    return end === -1 ? src.length : end
  }
  if (src[i] === '"') {
    let j = i + 1
    while (j < src.length && src[j] !== '"' && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
    return j + 1
  }
  return i
}

/** Index of the bracket closing the `{` or `(` at `open`, ignoring any inside strings and comments. */
function matchingClose(src: string, open: number): number {
  const [opening, closing] = src[open] === '(' ? ['(', ')'] : ['{', '}']
  let depth = 0
  for (let i = open; i < src.length; ) {
    const next = skipNonCode(src, i)
    if (next !== i) {
      i = next
      continue
    }
    if (src[i] === opening) depth++
    else if (src[i] === closing && --depth === 0) return i
    i++
  }
  return src.length // unterminated: the rest of the source
}

/** Top-level `model|enum|... Name { ... }` blocks, brace-aware (see `matchingClose`). */
function parseBlocks(schema: string): SchemaBlock[] {
  const blocks: SchemaBlock[] = []
  const header = /\b(model|enum|view|type|datasource|generator)\s+(\w+)\s*\{/y
  for (let i = 0; i < schema.length; ) {
    const next = skipNonCode(schema, i)
    if (next !== i) {
      i = next
      continue
    }
    header.lastIndex = i
    const match = header.exec(schema)
    if (!match) {
      i++
      continue
    }
    const open = i + match[0].length - 1
    const close = matchingClose(schema, open)
    blocks.push({ keyword: match[1], name: match[2], body: schema.slice(open + 1, close) })
    i = close + 1
  }
  return blocks
}

/** A block body's lines, trailing comments stripped (not inside strings), blank ones dropped. */
function codeLines(body: string): string[] {
  return body
    .split('\n')
    .map(line => {
      for (let i = 0; i < line.length; ) {
        if (line.startsWith('//', i)) return line.slice(0, i)
        const next = skipNonCode(line, i)
        i = next === i ? i + 1 : next
      }
      return line
    })
    .map(line => line.trim())
    .filter(Boolean)
}

/**
 * Parse model fields from model body string
 */
function parseModelFields(
  modelBody: string,
  enums: Map<string, string[]>,
  modelNames: Set<string>
): PrismaField[] {
  const fields: PrismaField[] = []

  for (const line of codeLines(modelBody)) {
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
  const defaultAt = rest.indexOf('@default(')
  if (defaultAt !== -1) {
    // Balanced, so `@default(cuid())` and `@default("a)b")` come out whole
    const open = defaultAt + '@default'.length
    defaultValue = rest.slice(open + 1, matchingClose(rest, open))
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
  const schema = readPrismaSchema(cwd)

  if (!schema) {
    return []
  }

  return parseBlocks(schema.content)
    .filter(b => b.keyword === 'model')
    .map(b => b.name)
}
