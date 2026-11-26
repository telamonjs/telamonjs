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
