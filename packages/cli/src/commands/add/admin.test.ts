/**
 * `telamonjs add admin` against real generated apps: both layouts are
 * scaffolded once from the templates (no install, no git), then copied
 * fresh for each test.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { createApp } from '../create.js'
import { createMonorepoApp } from '../create-monorepo.js'
import { AdminKitError, addAdmin } from './admin.js'

const count = (text: string, needle: string) => text.split(needle).length - 1

function snapshot(dir: string): Map<string, string> {
  const files = new Map<string, string>()
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const path = join(d, entry)
      if (statSync(path, { throwIfNoEntry: false })?.isDirectory()) walk(path)
      else if (existsSync(path)) files.set(relative(dir, path), readFileSync(path, 'utf-8'))
    }
  }
  walk(dir)
  return files
}

describe('addAdmin', () => {
  let fixtures: string
  let work: string
  let app: string
  let mono: string

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    fixtures = mkdtempSync(join(tmpdir(), 'telamonjs-add-admin-'))
    const cwd = process.cwd()
    process.chdir(fixtures)
    try {
      await createApp('shop', { provider: 'postgresql', port: 3001, skipInstall: true, skipGit: true, monorepo: false })
    } finally {
      process.chdir(cwd)
    }
    await createMonorepoApp('shop-mono', join(fixtures, 'shop-mono'), {
      provider: 'postgresql',
      appPort: 3001,
      skipInstall: true,
      skipGit: true,
      isLocalDev: false,
      cliVersion: '9.9.9',
    })
    vi.restoreAllMocks()
  })

  afterAll(() => rmSync(fixtures, { recursive: true, force: true }))

  beforeEach(() => {
    work = mkdtempSync(join(tmpdir(), 'telamonjs-add-admin-run-'))
    app = join(work, 'shop')
    mono = join(work, 'shop-mono')
    cpSync(join(fixtures, 'shop'), app, { recursive: true })
    // dereference: false keeps the dangling .env symlinks as they are
    cpSync(join(fixtures, 'shop-mono'), mono, { recursive: true, verbatimSymlinks: true })
  })

  afterEach(() => rmSync(work, { recursive: true, force: true }))

  const read = (root: string, rel: string) => readFileSync(join(root, rel), 'utf-8')

  describe('single app', () => {
    it('audit: model, catalog, menu, messages, dependency, module files and audited routes', () => {
      const result = addAdmin('audit', { cwd: app })

      expect(result.layout).toBe('app')
      expect(result.warnings).toEqual([])
      expect(result.created).toEqual(
        expect.arrayContaining([
          'src/lib/audit.ts',
          'src/app/api/audit/route.ts',
          'src/app/api/audit/[id]/route.ts',
          'src/lib/api/audit-client.ts',
          'src/app/admin/auditoria/config.tsx',
          'src/app/admin/auditoria/page.tsx',
          'src/app/admin/auditoria/_components/AuditDetail.tsx',
        ])
      )

      const schema = read(app, 'prisma/schema.prisma')
      expect(schema).toContain('// telamonjs:admin:audit — added by')
      expect(schema).toMatch(/model AuditLog \{[\s\S]*@@index\(\[entityType, entityId\]\)/)
      expect(schema).toContain('// telamonjs:admin:audit:end')

      expect(read(app, 'src/rbac.ts')).toContain("{ code: 'audit.read', category: 'Audit', description: 'View the audit log' },")

      const menu = read(app, 'src/config/menu.ts')
      const children = menu.slice(menu.indexOf("id: 'admin-group'"))
      expect(children).toContain("id: 'auditoria'")
      expect(menu).toContain("title: msg('nav.audit'),")
      expect(menu).toContain("permission: 'audit.read',")
      // inside the group, before the array closes
      expect(menu.indexOf("id: 'auditoria'")).toBeLessThan(menu.lastIndexOf('    ],'))

      const pt = JSON.parse(read(app, 'messages/pt-BR.json'))
      const en = JSON.parse(read(app, 'messages/en.json'))
      expect(pt.nav).toMatchObject({ users: 'Usuários', audit: 'Auditoria' })
      expect(en.auditoria.title).toBe('Audit log')
      expect(JSON.parse(read(app, 'messages/es.json')).auditoria.columns.who).toBe('Quién')

      expect(JSON.parse(read(app, 'package.json')).dependencies['@telamonjs/data']).toMatch(/^\^\d/)

      for (const route of [
        'src/app/api/usuarios/route.ts',
        'src/app/api/usuarios/[id]/route.ts',
        'src/app/api/roles/route.ts',
        'src/app/api/roles/[id]/route.ts',
        'src/app/api/roles/[id]/permissions/[permissionId]/route.ts',
      ]) {
        expect(read(app, route), route).toContain("import { audit } from '@/lib/audit'")
        expect(read(app, route), route).toContain('await audit(request, currentUser, {')
      }
      expect(read(app, 'src/app/api/usuarios/[id]/route.ts')).toContain("active === false ? 'DEACTIVATE'")
      expect(read(app, 'src/app/api/roles/[id]/permissions/[permissionId]/route.ts')).toContain('return toggle(request, ctx, false)')

      expect(result.nextSteps).toContain('pnpm db:migrate --name add-audit')
    })

    it('parameters: model, both permissions, menu, messages and module files; routes untouched', () => {
      const routesBefore = read(app, 'src/app/api/usuarios/route.ts')
      addAdmin('parameters', { cwd: app })

      expect(read(app, 'prisma/schema.prisma')).toMatch(/model Parameter \{[\s\S]*key\s+String\s+@unique/)
      const rbac = read(app, 'src/rbac.ts')
      expect(rbac).toContain("code: 'parameters.read'")
      expect(rbac).toContain("code: 'parameters.write'")
      expect(read(app, 'src/config/menu.ts')).toContain("permission: 'parameters.read',")
      expect(JSON.parse(read(app, 'messages/en.json')).parametros.types.BOOLEAN).toBe('Yes/No')
      for (const file of [
        'src/lib/parameters.ts',
        'src/app/api/parameters/route.ts',
        'src/app/api/parameters/[id]/route.ts',
        'src/app/api/parameters/public/route.ts',
        'src/lib/api/parameters-client.ts',
        'src/app/admin/parametros/config.tsx',
        'src/app/admin/parametros/page.tsx',
      ]) {
        expect(existsSync(join(app, file)), file).toBe(true)
      }
      expect(read(app, 'src/app/api/usuarios/route.ts')).toBe(routesBefore)
    })

    it('is idempotent: a second run changes nothing and duplicates nothing', () => {
      addAdmin('audit', { cwd: app })
      addAdmin('parameters', { cwd: app })
      const first = snapshot(app)

      const again = addAdmin('audit', { cwd: app })
      addAdmin('parameters', { cwd: app })

      expect(again.created).toEqual([])
      expect(again.modified).toEqual([])
      expect(again.kept).toContain('src/lib/audit.ts')
      expect(snapshot(app)).toEqual(first)
      const schema = read(app, 'prisma/schema.prisma')
      expect(count(schema, 'model AuditLog')).toBe(1)
      expect(count(schema, 'model Parameter ')).toBe(1)
      expect(count(read(app, 'src/rbac.ts'), "'audit.read'")).toBe(1)
      expect(count(read(app, 'src/config/menu.ts'), "id: 'auditoria'")).toBe(1)
      expect(count(read(app, 'src/app/api/roles/[id]/route.ts'), 'await audit(')).toBe(2)
    })

    it('keeps a module file the app already changed', () => {
      addAdmin('audit', { cwd: app })
      writeFileSync(join(app, 'src/lib/audit.ts'), '// mine\n')
      addAdmin('audit', { cwd: app })
      expect(read(app, 'src/lib/audit.ts')).toBe('// mine\n')
    })

    it('--dry-run reports the plan and writes nothing', () => {
      const before = snapshot(app)
      const result = addAdmin('audit', { cwd: app, dryRun: true })

      expect(result.created).toContain('src/lib/audit.ts')
      expect(result.modified).toEqual(
        expect.arrayContaining(['prisma/schema.prisma', 'src/rbac.ts', 'src/config/menu.ts', 'messages/pt-BR.json', 'package.json'])
      )
      expect(snapshot(app)).toEqual(before)
    })

    it('warns instead of patching a route handler that no longer matches the template', () => {
      const path = join(app, 'src/app/api/roles/route.ts')
      const edited = read(app, 'src/app/api/roles/route.ts').replace('return NextResponse.json(role, { status: 201 })', 'return Response.json(role)')
      writeFileSync(path, edited)

      const result = addAdmin('audit', { cwd: app })

      expect(readFileSync(path, 'utf-8')).toBe(edited)
      expect(result.warnings).toEqual([expect.stringContaining('src/app/api/roles/route.ts was changed')])
    })

    it("keeps the app's own model of the same name, with a warning", () => {
      const path = join(app, 'prisma/schema.prisma')
      writeFileSync(path, `${read(app, 'prisma/schema.prisma')}\nmodel AuditLog {\n  id String @id\n}\n`)

      const result = addAdmin('audit', { cwd: app })

      expect(count(readFileSync(path, 'utf-8'), 'model AuditLog')).toBe(1)
      expect(result.warnings).toEqual([expect.stringContaining('already has a model AuditLog')])
    })

    it('writes its own file in a multi-file schema folder', () => {
      mkdirSync(join(app, 'prisma/schema'))
      renameSync(join(app, 'prisma/schema.prisma'), join(app, 'prisma/schema/schema.prisma'))

      addAdmin('audit', { cwd: app })

      expect(read(app, 'prisma/schema/audit.prisma')).toContain('model AuditLog {')
      expect(read(app, 'prisma/schema/schema.prisma')).not.toContain('AuditLog')
    })
  })

  describe('monorepo', () => {
    it('audit + parameters: shared schema and catalog, web files, API modules wired into AppModule', () => {
      const audit = addAdmin('audit', { cwd: mono })
      addAdmin('parameters', { cwd: mono })

      expect(audit.layout).toBe('monorepo')
      expect(audit.warnings).toEqual([])
      expect(read(mono, 'packages/shared/prisma/schema.prisma')).toContain('model AuditLog {')
      expect(read(mono, 'packages/shared/src/rbac.ts')).toContain("code: 'parameters.write'")
      expect(read(mono, 'apps/web/src/config/menu.ts')).toContain("id: 'parametros'")
      expect(JSON.parse(read(mono, 'apps/web/messages/pt-BR.json')).nav.parameters).toBe('Parâmetros')
      for (const file of [
        'apps/web/src/app/admin/auditoria/config.tsx',
        'apps/web/src/lib/api/audit-client.ts',
        'apps/web/src/app/admin/parametros/config.tsx',
        'apps/web/src/lib/api/parameters-client.ts',
        'apps/api/src/modules/audit/audit.controller.ts',
        'apps/api/src/modules/audit/audit.interceptor.ts',
        'apps/api/src/modules/parameters/parameters.controller.ts',
        'apps/api/src/modules/parameters/parameter-value.spec.ts',
      ]) {
        expect(existsSync(join(mono, file)), file).toBe(true)
      }
      // single-app-only files stay out
      expect(existsSync(join(mono, 'apps/web/src/lib/audit.ts'))).toBe(false)
      expect(existsSync(join(mono, 'src'))).toBe(false)

      const appModule = read(mono, 'apps/api/src/app.module.ts')
      expect(appModule).toContain("import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'")
      expect(appModule).toContain("import { AuditModule } from './modules/audit/audit.module'")
      expect(appModule).toContain(
        "import { RolesModule } from './modules/roles/roles.module'\nimport { AuditModule } from './modules/audit/audit.module'\nimport { AuditInterceptor } from './modules/audit/audit.interceptor'\nimport { ParametersModule } from './modules/parameters/parameters.module'\n\n/**"
      )
      expect(appModule).toMatch(/RolesModule,\n {4}AuditModule,\n {4}ParametersModule,\n {2}\]/)
      expect(appModule).toContain('{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor },\n  ],')
      expect(audit.nextSteps[1]).toContain('pnpm db:push')
    })

    it('is idempotent', () => {
      addAdmin('audit', { cwd: mono })
      addAdmin('parameters', { cwd: mono })
      const first = snapshot(mono)

      expect(addAdmin('audit', { cwd: mono }).modified).toEqual([])
      expect(addAdmin('parameters', { cwd: mono }).modified).toEqual([])
      expect(snapshot(mono)).toEqual(first)
      expect(count(read(mono, 'apps/api/src/app.module.ts'), 'AuditModule')).toBe(2)
    })
  })

  describe('refusals', () => {
    it('refuses an app that is not template-shaped, pointing at the runtime pieces', () => {
      const plain = join(work, 'plain')
      mkdirSync(join(plain, 'prisma'), { recursive: true })
      writeFileSync(join(plain, 'package.json'), '{}')
      writeFileSync(join(plain, 'prisma/schema.prisma'), 'model User {\n  id String @id\n}\n')

      expect(() => addAdmin('audit', { cwd: plain })).toThrow(AdminKitError)
      expect(() => addAdmin('audit', { cwd: plain })).toThrow(/src\/rbac\.ts[\s\S]*createAuditInterceptor/)
      expect(snapshot(plain).size).toBe(2)
    })

    it('rejects an unknown module', () => {
      expect(() => addAdmin('billing', { cwd: app })).toThrow(/Unknown admin module "billing". Available: audit, parameters/)
    })
  })
})
