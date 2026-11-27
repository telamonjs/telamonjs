/**
 * Safety net for `telamonjs create`: generates a real app into a tmp dir
 * (skipping install/git — no network, no subprocess) and checks the
 * essential structure landed and every `{{placeholder}}` got resolved.
 */
import { describe, expect, it, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from './create.js'

describe('createApp — generated app structure', () => {
  const cwds: string[] = []

  afterEach(() => {
    for (const dir of cwds.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('scaffolds the expected files with template placeholders resolved', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'telamonjs-create-'))
    cwds.push(workDir)
    const originalCwd = process.cwd()
    process.chdir(workDir)

    try {
      await createApp('my-test-app', {
        provider: 'postgresql',
        port: 3001,
        skipInstall: true,
        skipGit: true,
        monorepo: false,
      })
    } finally {
      process.chdir(originalCwd)
    }

    const projectPath = join(workDir, 'my-test-app')

    const expectedFiles = [
      'package.json',
      '.env.example',
      'next.config.js',
      'docker-compose.yml',
      'prisma/schema.prisma',
      'public/logo.svg',
      'src/app/admin/usuarios/config.tsx',
      'src/app/admin/usuarios/_components/UsuarioDetail.tsx',
      'src/app/api/usuarios/[id]/route.ts',
      'src/app/admin/papeis/config.tsx',
      'src/app/admin/papeis/page.tsx',
      'src/app/admin/papeis/_components/RolesMatrix.tsx',
      'src/app/api/roles/route.ts',
      'src/app/api/roles/matrix/route.ts',
      'src/app/api/roles/[id]/permissions/[permissionId]/route.ts',
      'src/rbac.ts',
      'src/lib/permissions.ts',
      'src/lib/icons.ts',
      'AGENTS.md',
      '.claude/skills/telamonjs-crud/SKILL.md',
      // stored as _gitignore/_npmrc (npm strips the dotted names from the tarball)
      '.gitignore',
      '.npmrc',
    ]
    for (const file of expectedFiles) {
      expect(existsSync(join(projectPath, file)), `missing ${file}`).toBe(true)
    }
    // CRUD lives in ListPage dialogs — no dedicated routes.
    for (const gone of ['adicionar', '[id]']) {
      expect(existsSync(join(projectPath, 'src/app/admin/usuarios', gone))).toBe(false)
    }

    // package.json parses and carries the resolved deps/name.
    const pkg = JSON.parse(
      readFileSync(join(projectPath, 'package.json'), 'utf-8')
    )
    expect(pkg.name).toBe('my-test-app')
    expect(pkg.dependencies['@telamonjs/ui']).toMatch(/^\^?\d+\.\d+\.\d+/)
    expect(pkg.devDependencies['@telamonjs/cli']).toMatch(/^\^\d+\.\d+\.\d+/)

    // No generated file may still carry a {{placeholder}} — the whole tree,
    // not a list (docker-compose.prod.yml once slipped through a list).
    const hits = execSync(`grep -rlE '\\{\\{[a-zA-Z]+\\}\\}' . || true`, {
      cwd: projectPath,
      encoding: 'utf-8',
    }).trim()
    expect(hits, `files with unresolved placeholders:\n${hits}`).toBe('')
    const prodCompose = readFileSync(join(projectPath, 'docker-compose.prod.yml'), 'utf-8')
    expect(prodCompose).toContain('image: postgres:16-alpine')
    // Production secrets come from the environment, never from the template,
    // and the database is not reachable from other hosts.
    expect(prodCompose).toContain('NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:?')
    expect(prodCompose).toContain('POSTGRES_PASSWORD: ${DB_PASSWORD:?')
    expect(prodCompose).toContain('DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/')
    expect(prodCompose).not.toMatch(/development-secret|PASSWORD: password|:password@/)
    expect(prodCompose).toContain("- '127.0.0.1:5432:5432'")
    // The image's server listens on 3001 (Dockerfile PORT): the host port maps to it
    expect(prodCompose).toContain("- '3001:3001'")

    // The Docker deps stage runs the root postinstall (`prisma generate`):
    // without the schema already copied, the image does not build.
    const dockerfile = readFileSync(join(projectPath, 'Dockerfile'), 'utf-8')
    const copySchema = dockerfile.indexOf('COPY prisma ./prisma')
    expect(copySchema).toBeGreaterThan(-1)
    expect(copySchema).toBeLessThan(dockerfile.indexOf('RUN pnpm install'))
    // `prisma migrate deploy` (docker-entrypoint.sh) needs the migrations in
    // the image, and the runner has no database client to probe with.
    expect(readFileSync(join(projectPath, '.dockerignore'), 'utf-8')).not.toMatch(/^prisma\/migrations/m)
    const entrypoint = readFileSync(join(projectPath, 'docker-entrypoint.sh'), 'utf-8')
    expect(entrypoint).not.toMatch(/pg_isready|mysqladmin/)
    expect(entrypoint).toMatch(/until pnpm prisma migrate deploy/)
    // The seed is idempotent: a failure (e.g. no SEED_ADMIN_PASSWORD on an
    // empty production database) must stop the container, not be swallowed.
    expect(entrypoint).not.toMatch(/db:seed\s*\|\|/)
    expect(entrypoint).toMatch(/if ! pnpm db:seed; then[\s\S]*SEED_ADMIN_PASSWORD[\s\S]*exit 1/)

    // Migrations are code (committed); dumps never are.
    execSync('git init -q', { cwd: projectPath })
    const ignored = execSync(
      'git check-ignore prisma/migrations/20251015035454_init/migration.sql database/dumps/x.sql.gz || true',
      { cwd: projectPath, encoding: 'utf-8' }
    )
    expect(ignored.trim()).toBe('database/dumps/x.sql.gz')

    // pnpm 10+ ignores pnpm.overrides and blocks prisma's build scripts
    // unless the app pins its package manager.
    expect(pkg.packageManager).toBe('pnpm@9.15.9')

    // Auth works self-hosted in production and every gate fails closed
    // (an auth error yields a truthy body without `user`).
    const read = (rel: string) => readFileSync(join(projectPath, rel), 'utf-8')
    expect(read('src/auth.ts')).toContain('trustHost: true')
    expect(read('src/app/admin/layout.tsx')).toContain('if (!session?.user)')
    // src/, not the root: with src/app, Next.js ignores a root middleware.ts.
    expect(existsSync(join(projectPath, 'middleware.ts'))).toBe(false)
    expect(read('src/middleware.ts')).toContain('if (!req.auth?.user)')
    // The session cookie rides same-site form posts: /api writes from another
    // origin are refused before any Route Handler runs
    expect(read('src/middleware.ts')).toContain("matcher: ['/admin/:path*', '/api/:path*']")
    expect(read('src/middleware.ts')).toContain('new URL(origin).host !== host')
    // /_next/image is public: a wildcard host turns it into a fetch proxy
    // to any server the app can reach.
    expect(read('next.config.js')).not.toMatch(/hostname:\s*['"]\*\*['"]/)

    // .env.example: DATABASE_URL resolved, secret left blank for the dev
    // to generate — not a hardcoded value baked into the template.
    const envExample = readFileSync(join(projectPath, '.env.example'), 'utf-8')
    expect(envExample).toContain('DATABASE_URL="postgresql://')
    expect(envExample).toMatch(/^NEXTAUTH_SECRET=\s*$/m)

    // Database-backed RBAC: the core tables, no role enum, permissions in the
    // JWT at sign-in and a freshness check on every token renewal.
    const schema = read('prisma/schema.prisma')
    for (const model of ['Role', 'Permission', 'RolePermission', 'UserRole']) {
      expect(schema).toMatch(new RegExp(`^model ${model} \\{`, 'm'))
    }
    expect(schema).not.toContain('enum RoleName')
    expect(schema).toContain('accessChangedAt   DateTime?')
    expect(schema).toContain('sessionsRevokedAt DateTime?')
    expect(read('prisma/migrations/20251015035454_init/migration.sql')).toContain('CREATE TABLE "role_permissions"')
    expect(read('prisma/seed.ts')).toContain('diffPermissionCatalog(')
    expect(read('src/auth.ts')).toContain('loadAccess(prisma, user.id)')
    expect(read('src/auth.ts')).toContain('sessionState(token')
    expect(pkg.dependencies['@telamonjs/permissions']).toMatch(/^\^\d+\.\d+\.\d+/)
  })
})

describe('createApp — MySQL on a custom port', () => {
  it('ships no PostgreSQL migrations and maps the custom host port to the image port', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'telamonjs-create-mysql-'))
    const originalCwd = process.cwd()
    process.chdir(workDir)
    try {
      await createApp('my-mysql-app', {
        provider: 'mysql',
        port: 3200,
        skipInstall: true,
        skipGit: true,
        monorepo: false,
      })
      const projectPath = join(workDir, 'my-mysql-app')
      // The shipped init migration is PostgreSQL SQL with a postgresql lock:
      // `prisma migrate` refuses it on MySQL (P3019). db:migrate creates one.
      expect(existsSync(join(projectPath, 'prisma/migrations'))).toBe(false)
      expect(readFileSync(join(projectPath, 'prisma/schema.prisma'), 'utf-8')).toContain('provider = "mysql"')
      const prodCompose = readFileSync(join(projectPath, 'docker-compose.prod.yml'), 'utf-8')
      expect(prodCompose).toContain("- '3200:3001'")
      expect(prodCompose).toContain('NEXTAUTH_URL: http://localhost:3200')
    } finally {
      process.chdir(originalCwd)
      rmSync(workDir, { recursive: true, force: true })
    }
  })
})

describe('createApp --monorepo — generated tree', () => {
  const cwds: string[] = []

  afterEach(() => {
    for (const dir of cwds.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('scaffolds apps/web, apps/api, apps/jobs and packages/shared with placeholders resolved', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'telamonjs-create-mono-'))
    cwds.push(workDir)
    const originalCwd = process.cwd()
    process.chdir(workDir)

    try {
      await createApp('teste-mono', {
        provider: 'postgresql',
        port: 3001,
        skipInstall: true,
        skipGit: true,
        monorepo: true,
      })
    } finally {
      process.chdir(originalCwd)
    }

    const root = join(workDir, 'teste-mono')

    const expectedFiles = [
      'pnpm-workspace.yaml',
      'package.json',
      'tsconfig.base.json',
      '.gitignore',
      'apps/web/.npmrc',
      '.env.example',
      'docker-compose.yml',
      'traefik/dynamic.yml',
      'CLAUDE.md',
      'README.md',
      'packages/shared/package.json',
      'packages/shared/tsconfig.json',
      'packages/shared/src/lib/prisma.ts',
      'packages/shared/prisma/schema.prisma',
      'apps/api/package.json',
      'apps/api/src/main.ts',
      'apps/api/src/app.module.ts',
      'apps/api/src/common/guards/jwt-auth.guard.ts',
      'apps/api/src/modules/usuarios/usuarios.controller.ts',
      'apps/api/src/modules/usuarios/usuarios.service.spec.ts',
      'apps/jobs/package.json',
      'apps/jobs/src/worker.ts',
      'apps/jobs/src/scheduler.ts',
      'apps/web/package.json',
      'apps/web/src/app/admin/usuarios/config.tsx',
      'apps/web/src/lib/api/client.ts',
      'apps/web/src/lib/api/usuarios-client.ts',
      'apps/web/src/lib/api/roles-client.ts',
      'apps/web/src/app/admin/papeis/page.tsx',
      'apps/web/src/auth.ts',
      'packages/shared/src/rbac.ts',
      'apps/api/src/common/guards/permissions.guard.ts',
      'apps/api/src/modules/roles/roles.controller.ts',
      'apps/api/src/modules/roles/roles.service.spec.ts',
      'apps/web/AGENTS.md',
    ]
    for (const file of expectedFiles) {
      expect(existsSync(join(root, file)), `missing ${file}`).toBe(true)
    }

    // The usuarios CRUD Route Handlers and Prisma move out of apps/web —
    // the API and packages/shared own them now.
    for (const gone of [
      'apps/web/src/app/api/usuarios',
      'apps/web/src/app/api/roles',
      'apps/web/src/lib/prisma.ts',
      'apps/web/src/rbac.ts',
      'apps/web/prisma',
      'apps/api/src/common/guards/admin.guard.ts',
    ]) {
      expect(existsSync(join(root, gone)), `should not exist: ${gone}`).toBe(false)
    }
    // Only api/auth/[...nextauth] remains under apps/web/src/app/api.
    expect(existsSync(join(root, 'apps/web/src/app/api/auth/[...nextauth]'))).toBe(true)

    // No file should carry an unresolved {{placeholder}} — checked across
    // every generated file, not just an explicit list (renderTemplatePlaceholders
    // covers the whole tree in monorepo mode).
    const { execSync: exec } = await import('node:child_process')
    const hits = exec(
      `grep -rl '{{[a-zA-Z]*}}' . --include='*.json' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.md' --include='*.yml' --include='*.yaml' || true`,
      { cwd: root, encoding: 'utf-8' }
    ).trim()
    expect(hits, `files with unresolved placeholders:\n${hits}`).toBe('')

    // Package names use the @<slug>/* scope.
    const apiPkg = JSON.parse(readFileSync(join(root, 'apps/api/package.json'), 'utf-8'))
    const webPkg = JSON.parse(readFileSync(join(root, 'apps/web/package.json'), 'utf-8'))
    const sharedPkg = JSON.parse(readFileSync(join(root, 'packages/shared/package.json'), 'utf-8'))
    expect(apiPkg.name).toBe('@teste-mono/api')
    expect(webPkg.name).toBe('@teste-mono/web')
    expect(sharedPkg.name).toBe('@teste-mono/shared')
    expect(apiPkg.dependencies['@teste-mono/shared']).toBe('workspace:*')

    // Ports: api = web + 1000.
    expect(webPkg.scripts.dev).toContain('-p 3001')
    const mainTs = readFileSync(join(root, 'apps/api/src/main.ts'), 'utf-8')
    expect(mainTs).toContain("|| Number('4001')")

    // packages/shared migrations are committed (apps/web carries the app
    // template's .gitignore, whose *.sql must not reach them).
    exec('git init -q', { cwd: root })
    const ignored = exec(
      'git check-ignore packages/shared/prisma/migrations/20251015035454_init/migration.sql || true',
      { cwd: root, encoding: 'utf-8' }
    )
    expect(ignored.trim()).toBe('')

    // /_next/image is public: no wildcard host in the web app either.
    expect(readFileSync(join(root, 'apps/web/next.config.js'), 'utf-8')).not.toMatch(
      /hostname:\s*['"]\*\*['"]/
    )
  })

  // Regression: commander leaves `--port` as a string; `appPort + 1000` must
  // stay arithmetic ("3591" + 1000 must not concatenate into "35911000").
  it('computes apiPort by addition even when appPort arrives as a numeric string', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'telamonjs-create-mono-portstr-'))
    cwds.push(workDir)
    const originalCwd = process.cwd()
    process.chdir(workDir)

    try {
      await createApp('teste-mono-port', {
        provider: 'postgresql',
        port: '3591' as unknown as number,
        skipInstall: true,
        skipGit: true,
        monorepo: true,
      })
    } finally {
      process.chdir(originalCwd)
    }

    const mainTs = readFileSync(
      join(workDir, 'teste-mono-port/apps/api/src/main.ts'),
      'utf-8'
    )
    expect(mainTs).toContain("|| Number('4591')")
  })
})

/**
 * Drift guard for the reference modules: the template's `usuarios` and
 * `papeis` modules (configs, Detail, matrix, page, clients, icons, permission
 * checker) must type-check against the real @telamonjs/ui and
 * @telamonjs/permissions. `src/lib/utils` and `src/hooks/use-session` are
 * stubbed (date-fns and next-auth are not CLI dependencies); everything else
 * is the template verbatim.
 */
describe('template usuarios/papeis modules — compile guard', () => {
  it('type-checks against @telamonjs/ui', () => {
    const cliRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const template = join(cliRoot, 'templates', 'app')
    // Inside the package so `npx tsc` resolves node_modules like a real app.
    const cwd = mkdtempSync(join(cliRoot, '.template-compile-'))
    try {
      for (const rel of [
        'src/app/admin/usuarios',
        'src/app/admin/papeis',
        'src/lib/api',
        'src/lib/icons.ts',
        'src/lib/permissions.ts',
      ]) {
        cpSync(join(template, rel), join(cwd, rel), { recursive: true })
      }
      mkdirSync(join(cwd, 'src', 'lib'), { recursive: true })
      writeFileSync(
        join(cwd, 'src', 'lib', 'utils.ts'),
        'export function formatDate(value: Date | string): string {\n  return String(value)\n}\n'
      )
      mkdirSync(join(cwd, 'src', 'hooks'), { recursive: true })
      writeFileSync(
        join(cwd, 'src', 'hooks', 'use-session.ts'),
        "import type { UserWithPermissions } from '@telamonjs/permissions'\nexport function useSession(): { user: UserWithPermissions | undefined } {\n  return { user: undefined }\n}\n"
      )
      writeFileSync(
        join(cwd, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            lib: ['dom', 'dom.iterable', 'esnext'],
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            isolatedModules: true,
            jsx: 'preserve',
            target: 'ES2017',
            paths: { '@/*': ['./src/*'] },
          },
          include: ['src/**/*.ts', 'src/**/*.tsx'],
        })
      )
      try {
        execSync('npx tsc --noEmit -p tsconfig.json', { cwd, stdio: 'pipe' })
      } catch (error) {
        const out = error instanceof Error && 'stdout' in error ? String((error as { stdout: unknown }).stdout) : String(error)
        throw new Error(`template admin modules failed to type-check:\n${out}`)
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })
})
