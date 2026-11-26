/**
 * Runs the generated Route Handlers against the app template's real
 * `src/lib/auth.ts` and `src/lib/permissions.ts` (copied byte for byte, only
 * their `@/` imports pointed at the copies): a signed-in user without the
 * module's permissions must not list, read, create, update or delete.
 * `@/auth` (the session) and `@/lib/prisma` are stand-ins.
 */
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PrismaField } from '../utils/prisma-detector.js'
import { generateIdRouteHandler, generateRouteHandler } from './route-handlers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// packages/cli/src/commands/generate/templates -> packages/cli
const cliRoot = join(__dirname, '..', '..', '..', '..')
const templateLib = join(cliRoot, 'templates', 'app', 'src', 'lib')

const field = (name: string, extra: Partial<PrismaField> = {}): PrismaField => ({
  name,
  type: 'String',
  isRequired: true,
  isUnique: false,
  isId: false,
  isRelation: false,
  ...extra,
})

const fields: PrismaField[] = [
  field('id', { isId: true, isUnique: true }),
  field('nome', { showInTable: true, searchable: true }),
  field('createdAt', { type: 'DateTime', showInTable: true }),
]

type Ctx = { params: Promise<{ id: string }> }
type Handler = (request: Request, ctx: Ctx) => Promise<Response>
interface Session {
  setUser(user: { id: string; roles: string[]; permissions: string[] } | null): void
}
interface Db {
  calls: string[]
}

const STANDINS = {
  'session.ts': `let user: unknown = null
export function setUser(next: unknown) { user = next }
export async function auth() { return user ? { user } : null }
`,
  'prisma.ts': `export const calls: string[] = []
const row = { id: 'p1', nome: 'Produto', createdAt: new Date(0) }
export const prisma = {
  produto: {
    findMany: async () => { calls.push('findMany'); return [row] },
    count: async () => { calls.push('count'); return 1 },
    findUnique: async ({ where }: { where: { id: string } }) => { calls.push('findUnique:' + where.id); return row },
    create: async ({ data }: { data: object }) => { calls.push('create'); return { ...row, ...data } },
    update: async ({ where, data }: { where: { id: string }; data: object }) => { calls.push('update:' + where.id); return { ...row, ...data } },
    delete: async ({ where }: { where: { id: string } }) => { calls.push('delete:' + where.id); return row },
  },
}
`,
}

describe('generated Route Handlers — permission gates', () => {
  const dir = mkdtempSync(join(cliRoot, '.crud-compile-gates-'))
  let list: Record<'GET' | 'POST', Handler>
  let item: Record<'GET' | 'PATCH' | 'DELETE', Handler>
  let session: Session
  let db: Db

  const ctx: Ctx = { params: Promise.resolve({ id: 'p1' }) }
  const json = (method: string, body: unknown) =>
    new Request('http://localhost/api/produtos/p1', {
      method,
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })

  /** Status of each generated handler, in order: list, create, read, update, delete. */
  async function statuses(): Promise<number[]> {
    return Promise.all([
      list.GET(new Request('http://localhost/api/produtos?page=1&pageSize=10'), ctx),
      list.POST(json('POST', { nome: 'novo' }), ctx),
      item.GET(new Request('http://localhost/api/produtos/p1'), ctx),
      item.PATCH(json('PATCH', { nome: 'editado' }), ctx),
      item.DELETE(new Request('http://localhost/api/produtos/p1', { method: 'DELETE' }), ctx),
    ]).then((responses) => responses.map((r) => r.status))
  }

  beforeAll(async () => {
    const pointAt = (source: string) =>
      source
        .replace("from '@/auth'", "from './session'")
        .replace("from '@/lib/permissions'", "from './permissions'")
        .replace("from '@/lib/auth'", "from './auth'")
        .replace("from '@/lib/prisma'", "from './prisma'")

    for (const [file, source] of Object.entries(STANDINS)) writeFileSync(join(dir, file), source)
    for (const file of ['auth.ts', 'permissions.ts']) {
      writeFileSync(join(dir, file), pointAt(readFileSync(join(templateLib, file), 'utf-8')))
    }
    const options = { name: 'produtos', modelName: 'Produto', fields }
    writeFileSync(join(dir, 'route.ts'), pointAt(generateRouteHandler(options)))
    writeFileSync(join(dir, 'item-route.ts'), pointAt(generateIdRouteHandler(options)))

    list = (await import(join(dir, 'route.ts'))) as typeof list
    item = (await import(join(dir, 'item-route.ts'))) as typeof item
    session = (await import(join(dir, 'session.ts'))) as Session
    db = (await import(join(dir, 'prisma.ts'))) as Db
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  beforeEach(() => {
    db.calls.length = 0
  })

  it('answers 401 to every handler without a session', async () => {
    session.setUser(null)
    expect(await statuses()).toEqual([401, 401, 401, 401, 401])
    expect(db.calls).toEqual([])
  })

  it('answers 403 to a signed-in user without the module permissions, and touches no record', async () => {
    session.setUser({ id: 'u-viewer', roles: [], permissions: [] })
    expect(await statuses()).toEqual([403, 403, 403, 403, 403])
    expect(db.calls).toEqual([])
  })

  it('a permission of another module does not open this one', async () => {
    session.setUser({ id: 'u-other', roles: ['ops'], permissions: ['users.read', 'users.write'] })
    expect(await statuses()).toEqual([403, 403, 403, 403, 403])
    expect(db.calls).toEqual([])
  })

  it('<name>.read opens GET only', async () => {
    session.setUser({ id: 'u-reader', roles: ['reader'], permissions: ['produtos.read'] })
    expect(await statuses()).toEqual([200, 403, 200, 403, 403])
    expect(db.calls.sort()).toEqual(['count', 'findMany', 'findUnique:p1'])
  })

  it('<name>.write opens POST, PATCH and DELETE', async () => {
    session.setUser({ id: 'u-writer', roles: ['writer'], permissions: ['produtos.write'] })
    expect(await statuses()).toEqual([403, 201, 403, 200, 204])
    expect(db.calls.sort()).toEqual(['create', 'delete:p1', 'update:p1'])
  })
})
