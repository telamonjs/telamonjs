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
    expect(readFileSync(join(projectPath, 'docker-compose.prod.yml'), 'utf-8')).toContain('image: postgres:16-alpine')

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

    // .env.example: DATABASE_URL resolved, secret left blank for the dev
    // to generate — not a hardcoded value baked into the template.
    const envExample = readFileSync(join(projectPath, '.env.example'), 'utf-8')
    expect(envExample).toContain('DATABASE_URL="postgresql://')
    expect(envExample).toMatch(/^NEXTAUTH_SECRET=\s*$/m)
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
      'apps/web/src/auth.ts',
      'apps/web/AGENTS.md',
    ]
    for (const file of expectedFiles) {
      expect(existsSync(join(root, file)), `missing ${file}`).toBe(true)
    }

    // The usuarios CRUD Route Handlers and Prisma move out of apps/web —
    // the API and packages/shared own them now.
    for (const gone of [
      'apps/web/src/app/api/usuarios',
      'apps/web/src/lib/prisma.ts',
      'apps/web/prisma',
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
 * Drift guard for the reference module: the template's `usuarios` module
 * (config + Detail + client + icons) must type-check against the real
 * @telamonjs/ui. `src/lib/utils` is stubbed (date-fns is not a
 * CLI dependency); everything else is the template verbatim.
 */
describe('template usuarios module — compile guard', () => {
  it('type-checks against @telamonjs/ui', () => {
    const cliRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const template = join(cliRoot, 'templates', 'app')
    // Inside the package so `npx tsc` resolves node_modules like a real app.
    const cwd = mkdtempSync(join(cliRoot, '.template-compile-'))
    try {
      for (const rel of ['src/app/admin/usuarios', 'src/lib/api', 'src/lib/icons.ts']) {
        cpSync(join(template, rel), join(cwd, rel), { recursive: true })
      }
      mkdirSync(join(cwd, 'src', 'lib'), { recursive: true })
      writeFileSync(
        join(cwd, 'src', 'lib', 'utils.ts'),
        'export function formatDate(value: Date | string): string {\n  return String(value)\n}\n'
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
        throw new Error(`template usuarios module failed to type-check:\n${out}`)
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })
})
