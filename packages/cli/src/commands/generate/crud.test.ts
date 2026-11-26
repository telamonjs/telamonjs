import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { execaSync } = vi.hoisted(() => ({ execaSync: vi.fn() }))
vi.mock('execa', () => ({ default: { sync: execaSync } }))

import { formatWithPrettier, generateFiles, missingCatalogMessage, registerPermissions } from './crud.js'

describe('formatWithPrettier', () => {
  beforeEach(() => {
    execaSync.mockReset()
  })

  it('passes each path as its own argument, so spaces survive, and never installs prettier', () => {
    execaSync.mockReturnValue({ exitCode: 0 })
    const paths = ['/my app/src/app/admin/clientes/config.tsx', '/my app/src/lib/api/clientes-client.ts']

    expect(formatWithPrettier(paths, '/my app')).toBeUndefined()
    expect(execaSync).toHaveBeenCalledWith('npx', ['--no-install', 'prettier', '--write', ...paths], { cwd: '/my app' })
  })

  it('returns a warning with the reason when prettier fails', () => {
    execaSync.mockImplementation(() => {
      throw Object.assign(new Error('Command failed with exit code 2: npx prettier'), {
        shortMessage: 'Command failed with exit code 2: npx prettier',
        stderr: '[error] config.tsx: SyntaxError: Unexpected token (3:1)\n[error] more',
      })
    })

    const warning = formatWithPrettier(['/app/config.tsx'], '/app')
    expect(warning).toContain('[error] config.tsx: SyntaxError: Unexpected token (3:1)')
    expect(warning).toMatch(/still valid, just unformatted/)
  })

  it('falls back to the error message when there is no stderr', () => {
    execaSync.mockImplementation(() => {
      throw new Error('spawn npx ENOENT')
    })

    expect(formatWithPrettier(['/app/config.tsx'], '/app')).toContain('spawn npx ENOENT')
  })
})

describe('registerPermissions', () => {
  const RBAC = `export const PERMISSIONS: PermissionDefinition[] = [
  { code: 'users.read', category: 'Users', description: 'View users' },
]

export const ADMIN_ROLE_CODE = 'admin'
`
  let cwd: string
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'telamonjs-rbac-'))
  })
  afterEach(() => rmSync(cwd, { recursive: true, force: true }))

  it('adds <name>.read and <name>.write to PERMISSIONS in src/rbac.ts, once', () => {
    mkdirSync(join(cwd, 'src'))
    const rbac = join(cwd, 'src', 'rbac.ts')
    writeFileSync(rbac, RBAC)

    expect(registerPermissions('produtos', cwd)).toBe(rbac)
    const once = readFileSync(rbac, 'utf-8')
    expect(once).toContain(
      `  { code: 'users.read', category: 'Users', description: 'View users' },
  { code: 'produtos.read', category: 'Produtos', description: 'View produtos' },
  { code: 'produtos.write', category: 'Produtos', description: 'Create, edit and delete produtos' },
]`
    )

    expect(registerPermissions('produtos', cwd)).toBe(rbac)
    expect(readFileSync(rbac, 'utf-8')).toBe(once)
  })

  it("finds a monorepo's packages/shared catalog from apps/web", () => {
    const shared = join(cwd, 'packages', 'shared', 'src')
    const web = join(cwd, 'apps', 'web')
    mkdirSync(shared, { recursive: true })
    mkdirSync(web, { recursive: true })
    writeFileSync(join(shared, 'rbac.ts'), RBAC)

    expect(registerPermissions('produtos', web)).toBe(join(shared, 'rbac.ts'))
    expect(readFileSync(join(shared, 'rbac.ts'), 'utf-8')).toContain("code: 'produtos.write'")
  })

  it('returns null without a catalog to patch', () => {
    expect(registerPermissions('produtos', cwd)).toBeNull()
    mkdirSync(join(cwd, 'src'))
    writeFileSync(join(cwd, 'src', 'rbac.ts'), 'export const OTHER = []\n')
    expect(registerPermissions('produtos', cwd)).toBeNull()
  })

  it('without a catalog, the warning holds the entries to paste and the seed to run', () => {
    const message = missingCatalogMessage('produtos')
    expect(message).toContain("  { code: 'produtos.read', category: 'Produtos', description: 'View produtos' },")
    expect(message).toContain("  { code: 'produtos.write', category: 'Produtos', description: 'Create, edit and delete produtos' },")
    expect(message).toContain('pnpm db:seed')
  })
})

describe('generateFiles — an app without requirePermission()', () => {
  // src/lib/auth.ts of apps created before @telamonjs/cli 1.2.0 (no RBAC yet)
  const PRE_RBAC_AUTH = `import { auth } from '@/auth'
export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}
`
  const modelSchema = {
    name: 'Produto',
    fields: [
      { name: 'id', type: 'String', isRequired: true, isUnique: true, isId: true, isRelation: false },
      { name: 'nome', type: 'String', isRequired: true, isUnique: false, isId: false, isRelation: false, showInTable: true },
    ],
  }
  const generate = (cwd: string) =>
    generateFiles({ name: 'produtos', model: 'Produto', modelSchema, path: 'src/app/admin/produtos' }, cwd)

  let cwd: string
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'telamonjs-auth-'))
    mkdirSync(join(cwd, 'src', 'lib'), { recursive: true })
    mkdirSync(join(cwd, 'messages'))
    writeFileSync(join(cwd, 'messages', 'pt-BR.json'), '{}\n')
    writeFileSync(join(cwd, 'src', 'lib', 'prisma.ts'), 'export const prisma = {}\n')
  })
  afterEach(() => rmSync(cwd, { recursive: true, force: true }))

  it('stops before writing anything, naming what to add, instead of emitting handlers that do not compile', async () => {
    writeFileSync(join(cwd, 'src', 'lib', 'auth.ts'), PRE_RBAC_AUTH)

    await expect(generate(cwd)).rejects.toThrow(
      /src\/lib\/auth\.ts does not export requirePermission\(\)[\s\S]*1\.2\.0[\s\S]*templates\/app\/src\/lib\/auth\.ts/
    )
    expect(readFileSync(join(cwd, 'messages', 'pt-BR.json'), 'utf-8')).toBe('{}\n')
  })

  it('stops the same way when src/lib/auth.ts is missing', async () => {
    await expect(generate(cwd)).rejects.toThrow(/does not export requirePermission\(\)/)
  })

  it('generates the Route Handlers once auth.ts exports requirePermission()', async () => {
    writeFileSync(join(cwd, 'src', 'lib', 'auth.ts'), `${PRE_RBAC_AUTH}export async function requirePermission() {}\n`)

    const files = await generate(cwd)
    expect(files.filter(f => f.path.includes(join('src', 'app', 'api')))).toHaveLength(2)
  })

  it('needs no requirePermission() where no Route Handlers are generated (no src/lib/prisma.ts)', async () => {
    rmSync(join(cwd, 'src', 'lib', 'prisma.ts'))
    writeFileSync(join(cwd, 'src', 'lib', 'auth.ts'), PRE_RBAC_AUTH)

    const files = await generate(cwd)
    expect(files.some(f => f.path.includes(join('src', 'app', 'api')))).toBe(false)
  })
})
