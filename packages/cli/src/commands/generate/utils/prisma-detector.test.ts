import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  detectPrismaSchemaPath,
  listPrismaModels,
  parsePrismaModel,
  requirePrismaModel,
} from './prisma-detector.js'

let root: string

function write(path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'telamonjs-prisma-detector-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('detectPrismaSchemaPath', () => {
  it.each(['prisma/schema.prisma', 'database/schema.prisma', 'src/prisma/schema.prisma'])(
    'finds %s',
    path => {
      write(path, 'model User {\n  id String @id\n}\n')
      expect(detectPrismaSchemaPath(root)).toBe(join(root, path))
    }
  )

  it('finds the CLI monorepo schema in packages/shared/prisma', () => {
    write('packages/shared/prisma/schema.prisma', 'model User {\n  id String @id\n}\n')
    expect(detectPrismaSchemaPath(root)).toBe(join(root, 'packages/shared/prisma/schema.prisma'))
  })

  it('finds the monorepo schema from apps/web, through the pnpm workspace root', () => {
    write('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - 'packages/*'\n")
    write('packages/shared/prisma/schema.prisma', 'model User {\n  id String @id\n}\n')
    mkdirSync(join(root, 'apps/web'), { recursive: true })
    expect(detectPrismaSchemaPath(join(root, 'apps/web'))).toBe(
      join(root, 'packages/shared/prisma/schema.prisma')
    )
  })

  it('finds a multi-file schema folder (prisma/schema/*.prisma)', () => {
    write('prisma/schema/schema.prisma', 'generator client {\n  provider = "prisma-client-js"\n}\n')
    write('prisma/schema/user.prisma', 'model User {\n  id String @id\n}\n')
    expect(detectPrismaSchemaPath(root)).toBe(join(root, 'prisma/schema'))
  })

  it('honours package.json#prisma.schema (file or folder)', () => {
    write('package.json', JSON.stringify({ prisma: { schema: 'db/main.prisma' } }))
    write('db/main.prisma', 'model User {\n  id String @id\n}\n')
    write('prisma/schema.prisma', 'model Other {\n  id String @id\n}\n')
    expect(detectPrismaSchemaPath(root)).toBe(join(root, 'db/main.prisma'))

    write('package.json', JSON.stringify({ prisma: { schema: 'db' } }))
    expect(detectPrismaSchemaPath(root)).toBe(join(root, 'db'))
  })

  it('ignores a package.json#prisma.schema that points nowhere', () => {
    write('package.json', JSON.stringify({ prisma: { schema: 'missing.prisma' } }))
    write('prisma/schema.prisma', 'model User {\n  id String @id\n}\n')
    expect(detectPrismaSchemaPath(root)).toBe(join(root, 'prisma/schema.prisma'))
  })

  it('returns null when there is no schema', () => {
    expect(detectPrismaSchemaPath(root)).toBeNull()
  })
})

describe('multi-file schema', () => {
  beforeEach(() => {
    write('prisma/schema/schema.prisma', 'enum Status {\n  ACTIVE\n  INACTIVE\n}\n')
    write('prisma/schema/models/user.prisma', 'model User {\n  id String @id\n  status Status\n}\n')
    write('prisma/schema/post.prisma', 'model Post {\n  id String @id\n  title String\n}\n')
  })

  it('lists models from every file, nested folders included', () => {
    expect(listPrismaModels(root).sort()).toEqual(['Post', 'User'])
  })

  it('resolves enums declared in another file', () => {
    const user = parsePrismaModel('User', root)
    expect(user?.fields.find(f => f.name === 'status')?.enumValues).toEqual(['ACTIVE', 'INACTIVE'])
  })
})

describe('requirePrismaModel', () => {
  it('returns the parsed model', () => {
    write('prisma/schema.prisma', 'model User {\n  id String @id\n  name String\n}\n')
    expect(requirePrismaModel('User', root).fields.map(f => f.name)).toEqual(['id', 'name'])
  })

  it('fails naming the places it looked when there is no schema', () => {
    expect(() => requirePrismaModel('User', root)).toThrow(
      /No Prisma schema found[\s\S]*prisma\/schema\.prisma[\s\S]*packages\/shared\/prisma[\s\S]*--no-prisma-schema/
    )
  })

  it('fails listing the available models when the model is not in the schema', () => {
    write('prisma/schema.prisma', 'model User {\n  id String @id\n}\nmodel Post {\n  id String @id\n}\n')
    expect(() => requirePrismaModel('Usr', root)).toThrow(
      /Model 'Usr' not found in .*schema\.prisma\. Models: User, Post[\s\S]*--no-prisma-schema/
    )
  })
})

describe('parsePrismaModel', () => {
  const parse = (schema: string, model: string) => {
    write('prisma/schema.prisma', schema)
    return parsePrismaModel(model, root)
  }

  it('reads scalar fields, flags and defaults', () => {
    const user = parse(
      [
        'model User {',
        '  id        String   @id @default(cuid())',
        '  email     String   @unique',
        '  nickname  String?',
        '  age       Int      @default(0)',
        '  createdAt DateTime @default(now())',
        '}',
      ].join('\n'),
      'User'
    )
    expect(user?.fields.map(f => [f.name, f.type, f.isRequired, f.isUnique, f.isId])).toEqual([
      ['id', 'String', true, false, true],
      ['email', 'String', true, true, false],
      ['nickname', 'String', false, false, false],
      ['age', 'Int', true, false, false],
      ['createdAt', 'DateTime', true, false, false],
    ])
    expect(user?.fields.find(f => f.name === 'id')?.default).toBe('cuid()')
    expect(user?.fields.find(f => f.name === 'createdAt')).toMatchObject({ section: 'meta', showInTable: false })
    expect(user?.fields.find(f => f.name === 'email')).toMatchObject({ section: 'contact', searchable: true })
  })

  it('does not stop at a } inside a string default', () => {
    const settings = parse(
      [
        'model Setting {',
        '  id    String @id',
        '  value Json   @default("{}")',
        '  label String @default("a } b")',
        '  after String',
        '  @@map("settings")',
        '}',
      ].join('\n'),
      'Setting'
    )
    expect(settings?.fields.map(f => f.name)).toEqual(['id', 'value', 'label', 'after'])
    expect(settings?.fields.find(f => f.name === 'value')?.default).toBe('"{}"')
    expect(settings?.fields.find(f => f.name === 'label')?.default).toBe('"a } b"')
  })

  it('ignores braces, attributes and models inside comments', () => {
    const schema = [
      '// model Ghost { id String @id }',
      'model Post {',
      '  id    String @id // primary key }',
      '  /// Shown in lists {',
      '  title String // not @unique',
      '}',
    ].join('\n')
    const post = parse(schema, 'Post')
    expect(post?.fields.map(f => f.name)).toEqual(['id', 'title'])
    expect(post?.fields.find(f => f.name === 'title')?.isUnique).toBe(false)
    expect(listPrismaModels(root)).toEqual(['Post'])
  })

  it('treats the model name literally, not as a pattern', () => {
    expect(parse('model User {\n  id String @id\n}\n', 'U.er')).toBeNull()
    expect(parse('model User {\n  id String @id\n}\n', 'Use')).toBeNull()
  })

  it('reads enum values, skipping comments and @@map', () => {
    const user = parse(
      [
        'enum Role {',
        '  ADMIN // full access }',
        '  USER  @map("user")',
        '  @@map("roles")',
        '}',
        'model User {',
        '  id   String @id',
        '  role Role   @default(USER)',
        '}',
      ].join('\n'),
      'User'
    )
    expect(user?.fields.find(f => f.name === 'role')?.enumValues).toEqual(['ADMIN', 'USER'])
  })

  it('keeps the owning side of a relation and drops its FK column and back-relations', () => {
    const schema = [
      'model Cliente {',
      '  id      String   @id',
      '  pedidos Pedido[]',
      '  perfil  Perfil?',
      '}',
      'model Perfil {',
      '  id        String  @id',
      '  cliente   Cliente @relation(fields: [donoId], references: [id])',
      '  donoId    String  @unique',
      '}',
      'model Pedido {',
      '  id        String  @id',
      '  cliente   Cliente @relation(fields: [clienteId], references: [id])',
      '  clienteId String',
      '}',
    ].join('\n')
    expect(parse(schema, 'Cliente')?.fields.map(f => f.name)).toEqual(['id'])
    const perfil = parse(schema, 'Perfil')
    expect(perfil?.fields.map(f => f.name)).toEqual(['id', 'cliente'])
    expect(perfil?.fields[1]).toMatchObject({ isRelation: true, relationType: 'Cliente', relationFk: 'donoId' })
  })

  it('returns null for an unknown model', () => {
    expect(parse('model User {\n  id String @id\n}\n', 'Post')).toBeNull()
  })
})
