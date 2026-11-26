/**
 * Drift guard for `telamonjs generate crud`.
 *
 * The generator's templates are hand-written string literals derived from
 * the canonical reference (packages/cli/templates/app/src/app/admin/usuarios/**).
 * Nothing here diffs against that reference automatically -- this test is
 * the trip wire: it runs the generator against a fixture Prisma model
 * exercising every field kind (required/optional string, number, boolean,
 * enum with @map + inline comment, relation with a custom FK name, the
 * non-owning side of a 1:1, timestamps, and a credential field) and
 * type-checks the emitted files with `tsc` against the real
 * @telamonjs/ui package. If a template starts emitting code that
 * doesn't compile, this fails.
 *
 * `tsc --noEmit` alone proved insufficient in practice: several generator
 * bugs (missing zod coercion, leaking `senha` in JSON responses, wrong FK
 * name, raw `Number()` pagination) type-checked fine while being wrong at
 * runtime. The second `it` below exercises the exact zod expressions and
 * literal predicates the templates emit -- built via the same
 * `fieldPropName`/`zodFor`/`sensitiveFieldNames` functions the templates
 * call -- against realistic FormData-like and JSON-like payloads, so a
 * regression in generated *behavior* fails here too, not just in a real
 * generated app somebody happens to click through by hand.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

import { parsePrismaModel, type PrismaField } from '../utils/prisma-detector.js'
import { fieldPropName, zodFor } from '../utils/field-mapping.js'
import {
  sensitiveFieldNames,
  PAGINATION_SCHEMA_EXPR,
  RECORD_NOT_FOUND_PREDICATE,
} from '../templates/route-handlers.js'
import { generateFiles } from '../crud.js'
import { lintProject } from '../../lint/lint.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// packages/cli/src/commands/generate/__tests__ -> packages/cli
const cliRoot = join(__dirname, '..', '..', '..', '..')

/**
 * Minimal stand-ins for what a real project provides (templates/app/src/lib/*)
 * -- the generator itself never emits these, it only imports from them.
 */
function writeLibStandins(cwd: string): void {
  mkdirSync(join(cwd, 'src', 'lib'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'lib', 'prisma.ts'), 'export const prisma: any = {}\n')
  writeFileSync(
    join(cwd, 'src', 'lib', 'auth.ts'),
    // Same signature as templates/app/src/lib/auth.ts: the user, or the 401/403 response to return.
    "import { NextResponse } from 'next/server'\n" +
      'export async function requirePermission(..._permissions: [string, ...string[]]): Promise<Record<string, unknown> | NextResponse> {\n' +
      "  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })\n}\n"
  )
  writeFileSync(
    join(cwd, 'src', 'lib', 'utils.ts'),
    // Same signature as templates/app/src/lib/utils.ts -- a nullable DateTime must be guarded before the call.
    'export function formatDate(value: Date | string): string {\n  return String(value)\n}\n'
  )
  writeFileSync(
    join(cwd, 'src', 'lib', 'icons.ts'),
    "import { Circle, type LucideIcon } from 'lucide-react'\nexport function getIcon(_name: string): LucideIcon {\n  return Circle\n}\n"
  )
}

/** Type-checks everything under `cwd/src` with `tsc --noEmit`, against the real @telamonjs/ui. */
function typeCheckGenerated(cwd: string): void {
  writeFileSync(
    join(cwd, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          target: 'ES2017',
          paths: { '@/*': ['./src/*'] },
        },
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: ['node_modules'],
      },
      null,
      2
    )
  )

  try {
    execSync('npx tsc --noEmit -p tsconfig.json', { cwd, stdio: 'pipe' })
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error ? String((error as any).stdout) : String(error)
    throw new Error(`Generated CRUD module failed to type-check:\n${output}`)
  }
}

const FIXTURE_SCHEMA = `
enum StatusCliente {
  ATIVO // cliente ativo
  INATIVO @map("inativo")
  @@map("status_cliente")
}

model Usuario {
  id       String    @id @default(cuid())
  nome     String
  clientes Cliente[]
}

model Perfil {
  id        String  @id @default(cuid())
  bio       String?
  cliente   Cliente @relation(fields: [clienteId], references: [id])
  clienteId String  @unique
}

model Cliente {
  id             String        @id @default(cuid())
  nome           String
  email          String?
  idade          Int?
  ativo          Boolean       @default(true)
  status         StatusCliente @default(ATIVO)
  dataNascimento DateTime?
  senha          String
  vendedor       Usuario       @relation(fields: [ownerId], references: [id])
  ownerId        String
  perfil         Perfil?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
`

describe('generate crud — compile guard', () => {
  const cwd = mkdtempSync(join(cliRoot, '.crud-compile-'))

  beforeAll(() => {
    mkdirSync(join(cwd, 'prisma'), { recursive: true })
    writeFileSync(join(cwd, 'prisma', 'schema.prisma'), FIXTURE_SCHEMA)
    writeLibStandins(cwd) // a real app has src/lib/prisma.ts, so Route Handlers are emitted
  })

  afterAll(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('emits a CrudConfig module tree that type-checks against @telamonjs/ui', async () => {
    const modelSchema = parsePrismaModel('Cliente', cwd)
    if (!modelSchema) throw new Error('fixture schema.prisma did not parse')

    const files = await generateFiles(
      {
        name: 'clientes',
        model: 'Cliente',
        modelSchema,
        path: 'src/app/admin/clientes',
      },
      cwd
    )
    expect(files.map(f => f.path.replace(cwd, '.'))).toEqual([
      './src/app/admin/clientes/config.tsx',
      './src/app/admin/clientes/page.tsx',
      './src/app/admin/clientes/_components/ClienteDetail.tsx',
      './src/lib/api/clientes-client.ts',
      './src/app/api/clientes/route.ts',
      './src/app/api/clientes/[id]/route.ts',
    ])

    for (const file of files) {
      mkdirSync(dirname(file.path), { recursive: true })
      writeFileSync(file.path, file.content)
    }

    writeLibStandins(cwd)
    typeCheckGenerated(cwd)
  })

  it('the emitted module passes `telamonjs lint` with 0 findings (dialogs pattern, no CRUD routes)', () => {
    // Runs after the compile test wrote the files into cwd.
    const report = lintProject(join(cwd, 'src', 'app', 'admin'))
    expect(report.files).toBe(3)
    expect(report.findings).toEqual([])
  })

  describe('runtime behavior of generated schemas/logic', () => {
    let fields: PrismaField[]

    beforeAll(() => {
      const modelSchema = parsePrismaModel('Cliente', cwd)
      if (!modelSchema) throw new Error('fixture schema.prisma did not parse')
      fields = modelSchema.fields
    })

    /** Evaluates a zod expression string (as emitted by `zodFor`) against the real `z`. */
    function buildZodField(expr: string): z.ZodTypeAny {
      return new Function('z', `return (${expr})`)(z)
    }

    /** Same field set + wrapping the generated config.tsx `validationSchema` and
     * route.ts `createSchema`/`updateSchema` both build from (see config.ts and
     * route-handlers.ts `formFields()`). */
    function formFields(): PrismaField[] {
      return fields.filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt')
    }

    function buildSchema(opts: { forceOptional?: boolean } = {}) {
      const shape: Record<string, z.ZodTypeAny> = {}
      for (const f of formFields()) {
        shape[fieldPropName(f)] = buildZodField(zodFor(f, opts))
      }
      return z.object(shape)
    }

    it('bug 4 — relation field binds to the real FK name from `fields: [ownerId]`, not `${name}Id`', () => {
      const vendedor = fields.find(f => f.name === 'vendedor')
      expect(vendedor?.isRelation).toBe(true)
      expect(fieldPropName(vendedor!)).toBe('ownerId')
      // the raw `ownerId` scalar line must have been deduped away, not kept as a second field
      expect(fields.filter(f => fieldPropName(f) === 'ownerId')).toHaveLength(1)
    })

    it('bug 7 — enum values are bare identifiers (comment + @map stripped, @@map skipped)', () => {
      const status = fields.find(f => f.name === 'status')
      expect(status?.enumValues).toEqual(['ATIVO', 'INATIVO'])
    })

    it('bug 8 — non-owning side of a 1:1 relation (no FK) is not a form/API field', () => {
      expect(fields.find(f => f.name === 'perfil')).toBeUndefined()
    })

    it('bug 1 + 3 — validationSchema/createSchema parse FormData-stringified AND real-typed values', () => {
      const schema = buildSchema()

      // FormData mode (AdminForm's `action` path): everything arrives as a string.
      const fromFormData = schema.parse({
        nome: 'Ana',
        email: 'ana@example.com',
        idade: '30',
        ativo: 'true',
        status: 'ATIVO',
        dataNascimento: String(new Date('1990-01-01T00:00:00.000Z')),
        senha: 'segredo123',
        ownerId: 'user-1',
      })
      expect(fromFormData.idade).toBe(30)
      expect(fromFormData.ativo).toBe(true)
      expect(fromFormData.dataNascimento).toBeInstanceOf(Date)
      expect((fromFormData.dataNascimento as Date).toISOString()).toBe('1990-01-01T00:00:00.000Z')

      // z.coerce.boolean() footgun: 'false' is a non-empty string and would coerce
      // to `true` -- assert the actual (preprocess-based) schema gets this right.
      const withFalse = schema.parse({ ...fromFormData, ativo: 'false' })
      expect(withFalse.ativo).toBe(false)

      // JSON mode (route handler body / RHF resolver pre-submit): real types.
      const fromJson = schema.parse({
        nome: 'Ana',
        email: 'ana@example.com',
        idade: 30,
        ativo: true,
        status: 'ATIVO',
        dataNascimento: '1990-01-01T00:00:00.000Z',
        senha: 'segredo123',
        ownerId: 'user-1',
      })
      expect(fromJson.idade).toBe(30)
      expect(fromJson.dataNascimento).toBeInstanceOf(Date)
    })

    it('bug 1 + 3 — rejects an invalid enum value', () => {
      const schema = buildSchema()
      const result = schema.safeParse({
        nome: 'Ana',
        email: 'ana@example.com',
        idade: 30,
        ativo: true,
        status: 'NAO_EXISTE',
        dataNascimento: '1990-01-01T00:00:00.000Z',
        senha: 'segredo123',
        ownerId: 'user-1',
      })
      expect(result.success).toBe(false)
    })

    it('bug 2 — sensitiveFieldNames flags `senha` and a generated serialize() strips it', () => {
      const names = sensitiveFieldNames(fields)
      expect(names).toEqual(['senha'])

      // Same shape the generated `serialize()` destructure uses (see route-handlers.ts).
      const stripSrc = `({ ${names.map(n => `${n}: _${n}`).join(', ')}, ...rest }) => rest`
      const serialize = new Function(`return (${stripSrc})`)() as (obj: Record<string, unknown>) => Record<string, unknown>

      const raw = { id: '1', nome: 'Ana', senha: '$2b$10$hashedvalue' }
      const result = serialize(raw)
      expect(result).not.toHaveProperty('senha')
      expect(result).toMatchObject({ id: '1', nome: 'Ana' })
    })

    it('bug 6a — updateSchema rejects `null` for a required field, allows it for a nullable one', () => {
      const schema = buildSchema({ forceOptional: true })

      // 'nome' is required on the model -- forceOptional makes it omittable, not nullable.
      expect(schema.safeParse({ nome: null }).success).toBe(false)
      expect(schema.safeParse({ nome: 'Novo Nome' }).success).toBe(true)
      expect(schema.safeParse({}).success).toBe(true)

      // 'email' is optional/nullable on the model -- null is a legitimate "clear it" value.
      expect(schema.safeParse({ email: null }).success).toBe(true)
    })

    it('bug 5 — pagination schema rejects invalid page/pageSize and caps pageSize', () => {
      const paginationSchema = new Function('z', `return (${PAGINATION_SCHEMA_EXPR})`)(z) as z.ZodTypeAny

      expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 10 })
      expect(paginationSchema.safeParse({ page: '0' }).success).toBe(false)
      expect(paginationSchema.safeParse({ page: 'abc' }).success).toBe(false)
      expect(paginationSchema.safeParse({ pageSize: '999' }).success).toBe(false)
      expect(paginationSchema.parse({ page: '2', pageSize: '25' })).toEqual({ page: 2, pageSize: 25 })
    })

    it('bug 6b — record-not-found predicate matches Prisma P2025 and nothing else', () => {
      const isRecordNotFound = new Function('error', `return (${RECORD_NOT_FOUND_PREDICATE})`) as (
        error: unknown
      ) => boolean

      expect(isRecordNotFound({ code: 'P2025' })).toBe(true)
      expect(isRecordNotFound({ code: 'P2002' })).toBe(false)
      expect(isRecordNotFound(new Error('boom'))).toBe(false)
      expect(isRecordNotFound(null)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// i18n ON -- the msg() emission path (config.ts's `i18n` branch: import line,
// msgKey/generateColumn/generateFormField) had no direct test before this --
// crud-compile above only exercises i18n OFF, and the lint fixture that looks
// like generator output (__fixtures__/i18n/src/app/admin/produtos) is
// hand-written, not generated. This runs the real generator against an app
// root that has i18n set up and checks the emitted source, the compile guard
// (same tsc check as above), `telamonjs lint`, and the written message JSONs.
// ---------------------------------------------------------------------------

const FIXTURE_SCHEMA_I18N = `
model Produto {
  id        String   @id @default(cuid())
  nome      String
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`

describe('generate crud — i18n ON', () => {
  const cwd = mkdtempSync(join(cliRoot, '.crud-compile-i18n-'))

  beforeAll(() => {
    mkdirSync(join(cwd, 'prisma'), { recursive: true })
    writeFileSync(join(cwd, 'prisma', 'schema.prisma'), FIXTURE_SCHEMA_I18N)

    // The i18n signal `generateFiles`/`hasI18n` look for, plus the messages/
    // dir `writeModuleMessages` writes into.
    mkdirSync(join(cwd, 'src', 'i18n'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'i18n', 'request.ts'), 'export {}\n')
    mkdirSync(join(cwd, 'messages'), { recursive: true })
    for (const locale of ['pt-BR', 'en', 'es']) {
      writeFileSync(join(cwd, 'messages', `${locale}.json`), '{}\n')
    }
  })

  afterAll(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('emits msg() for title/description/searchPlaceholder/headers/labels, no accented literal in those slots, and type-checks', async () => {
    const modelSchema = parsePrismaModel('Produto', cwd)
    if (!modelSchema) throw new Error('fixture schema.prisma did not parse')

    const files = await generateFiles(
      { name: 'produtos', model: 'Produto', modelSchema, path: 'src/app/admin/produtos' },
      cwd
    )
    for (const file of files) {
      mkdirSync(dirname(file.path), { recursive: true })
      writeFileSync(file.path, file.content)
    }

    const config = files.find((f) => f.path.endsWith('config.tsx'))
    if (!config) throw new Error('config.tsx not generated')

    expect(config.content).toContain("import { msg } from '@telamonjs/ui/i18n'")
    expect(config.content).toContain("title: msg('produtos.title')")
    expect(config.content).toContain("description: msg('produtos.description')")
    expect(config.content).toContain("searchPlaceholder: msg('produtos.searchPlaceholder')")
    // 'nome' is a plain String field -- both a table column and a form field.
    expect(config.content).toContain("header: msg('produtos.fields.nome')")
    expect(config.content).toContain("label: msg('produtos.fields.nome')")

    // `_components/ProdutoDetail.tsx`: `SemanticField.label`/`SemanticCard.title` are
    // `I18nText` too (checked directly against @telamonjs/ui below via
    // typeCheckGenerated) -- reuses the SAME `produtos.fields.nome` key as config.tsx's
    // column header/form label, not a duplicate.
    const detail = files.find((f) => f.path.endsWith('Detail.tsx'))
    if (!detail) throw new Error('Detail.tsx not generated')
    expect(detail.content).toContain("import { msg } from '@telamonjs/ui/i18n'")
    expect(detail.content).toContain("label={msg('produtos.fields.nome')}")
    expect(detail.content).toContain("title={msg('produtos.sections.main')}")
    // No accented pt-BR literal left in a SemanticField label or SemanticCard title
    // (TabItem.label is a plain `string`, not `I18nText` -- 'Informações' there is
    // unavoidable and out of scope, so this only checks label=/title= attributes).
    const ACCENT = /[ãõáéíóúâêôçÃÕÁÉÍÓÚÂÊÔÇ]/
    for (const m of detail.content.matchAll(/\b(?:label|title)=\{'([^']*)'\}/g)) {
      expect(ACCENT.test(m[1]), `literal ${m[0]} in detail.tsx`).toBe(false)
    }

    writeLibStandins(cwd)
    typeCheckGenerated(cwd)

    // `i18n-literal-in-config` is the tool-backed version of "no accented pt-BR
    // literal remains in title:/label:/header:/placeholder:/description:" --
    // reuses the same rule `telamonjs lint` runs, rather than re-implementing the
    // accent/word regex here. Only runs on config.tsx (a ConfigRule), not detail.tsx --
    // that's what the matchAll loop above covers.
    const report = lintProject(join(cwd, 'src', 'app', 'admin'))
    expect(report.findings.filter((f) => f.rule === 'i18n-literal-in-config')).toEqual([])
  })

  it('writes the module block into messages/{pt-BR,en,es}.json', () => {
    for (const locale of ['pt-BR', 'en', 'es']) {
      const data = JSON.parse(readFileSync(join(cwd, 'messages', `${locale}.json`), 'utf-8'))
      expect(data.produtos.title).toBe('Produtos')
      expect(data.produtos.description).toBe('Gerenciamento de produtos')
      expect(data.produtos.searchPlaceholder).toBe('Buscar...')
      expect(data.produtos.fields.nome).toBe('Nome')
      expect(data.produtos.sections.main).toBe('Dados')
    }
  })
})

describe('generate crud — no src/lib/prisma.ts (monorepo apps/web)', () => {
  const cwd = mkdtempSync(join(cliRoot, '.crud-noprisma-'))
  afterAll(() => rmSync(cwd, { recursive: true, force: true }))

  it('skips the Route Handlers, which would import a missing @/lib/prisma', async () => {
    mkdirSync(join(cwd, 'prisma'), { recursive: true })
    writeFileSync(join(cwd, 'prisma', 'schema.prisma'), FIXTURE_SCHEMA)
    const modelSchema = parsePrismaModel('Cliente', cwd)
    if (!modelSchema) throw new Error('fixture schema.prisma did not parse')
    const files = await generateFiles({ name: 'clientes', model: 'Cliente', modelSchema, path: 'src/app/admin/clientes' }, cwd)
    expect(files.some(f => f.path.includes(join('src', 'app', 'api')))).toBe(false)
    expect(files.some(f => f.path.endsWith('clientes-client.ts'))).toBe(true)
  })
})
