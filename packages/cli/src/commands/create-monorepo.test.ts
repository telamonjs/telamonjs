/**
 * createMonorepoApp called directly into a tmp dir. create.test.ts already
 * pins the PostgreSQL tree through `createApp --monorepo`; this covers what
 * it does not: MySQL, the apps/web pruning, the .env symlinks, and the
 * git/install subprocesses (execa mocked — no network, no git).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, lstatSync, mkdtempSync, readFileSync, readlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { execa } = vi.hoisted(() => ({ execa: vi.fn() }))
vi.mock('execa', () => ({ default: execa }))

import { createMonorepoApp, type MonorepoCreateOptions } from './create-monorepo.js'
import { DEFAULT_UI_VERSION } from './create.js'

describe('createMonorepoApp', () => {
  let workDir: string
  let logs: string
  let root: string

  const scaffold = (opts: Partial<MonorepoCreateOptions> = {}) =>
    createMonorepoApp('my-shop', root, {
      provider: 'postgresql',
      appPort: 3100,
      skipInstall: true,
      skipGit: true,
      isLocalDev: false,
      cliVersion: '9.9.9',
      ...opts,
    })

  const read = (rel: string) => readFileSync(join(root, rel), 'utf-8')
  const json = (rel: string) => JSON.parse(read(rel))

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'telamonjs-monorepo-'))
    root = join(workDir, 'my-shop')
    execa.mockReset().mockResolvedValue({ stdout: '' })
    logs = ''
    vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
      logs += `${String(msg ?? '')}\n`
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(workDir, { recursive: true, force: true })
  })

  describe('MySQL', () => {
    it('wires the MySQL image, port, credentials, health check and Prisma provider', async () => {
      await scaffold({ provider: 'mysql' })

      const compose = read('docker-compose.yml')
      expect(compose).toContain('image: mysql:8.0')
      expect(compose).toContain("- '3306:3306'")
      expect(compose).toContain('MYSQL_ROOT_PASSWORD: password')
      expect(compose).toContain('MYSQL_DATABASE: my_shop')
      expect(compose).toContain("test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost']")
      expect(compose).toContain('my_shop_db_data:/var/lib/mysql/data')
      expect(compose).not.toContain('POSTGRES_')

      expect(read('.env.example')).toContain(
        'DATABASE_URL="mysql://root:password@localhost:3306/my_shop"'
      )
      expect(read('packages/shared/prisma/schema.prisma')).toContain('provider = "mysql"')
    })
  })

  describe('Generated tree', () => {
    it('derives slug, scope, app name and ports from the project name and appPort', async () => {
      await scaffold()

      const rootPkg = json('package.json')
      expect(rootPkg.name).toBe('my-shop-monorepo')
      expect(rootPkg.scripts.dev).toBe('pnpm --filter @my-shop/web dev')
      expect(rootPkg.devDependencies['@telamonjs/cli']).toBe('^9.9.9')

      const webPkg = json('apps/web/package.json')
      expect(webPkg.name).toBe('@my-shop/web')
      expect(webPkg.dependencies['@telamonjs/ui']).toBe(DEFAULT_UI_VERSION)
      expect(webPkg.dependencies['@my-shop/shared']).toBe('workspace:*')

      const env = read('.env.example')
      expect(env).toContain('NEXTAUTH_URL="http://localhost:3100"')
      expect(env).toContain('API_PORT=4100')
      expect(env).toContain('REDIS_PORT=6379')
      expect(env).toContain('NEXT_PUBLIC_APP_NAME="My Shop"')
      // The secret is never generated into a file
      expect(env).toMatch(/^NEXTAUTH_SECRET=\s*$/m)

      expect(read('docker-compose.yml')).toContain('container_name: my-shop-db')
    })

    it('removes from apps/web what the root and packages/shared own', async () => {
      await scaffold()

      for (const gone of [
        'docker-compose.yml',
        'docker-compose.prod.yml',
        '.env.example',
        'README.md',
        'prisma',
        'src/lib/prisma.ts',
        'src/app/api/usuarios',
      ]) {
        expect(existsSync(join(root, 'apps/web', gone)), `apps/web/${gone}`).toBe(false)
      }
      // ...while the overlay replaced the single-package files
      expect(read('apps/web/package.json')).toContain('"@my-shop/shared": "workspace:*"')
      expect(existsSync(join(root, 'README.md'))).toBe(true)
    })

    it('links apps/web/.env and packages/shared/.env to the root .env', async () => {
      await scaffold()

      for (const dir of ['apps/web', 'packages/shared']) {
        const link = join(root, dir, '.env')
        expect(lstatSync(link).isSymbolicLink(), `${dir}/.env`).toBe(true)
        expect(readlinkSync(link)).toBe('../../.env')
      }
      // Dangling until the user copies .env.example
      expect(existsSync(join(root, '.env'))).toBe(false)
    })

    it('restores the dotfiles npm strips from the tarball', async () => {
      await scaffold()
      expect(existsSync(join(root, '.gitignore'))).toBe(true)
      expect(existsSync(join(root, '_gitignore'))).toBe(false)
    })
  })

  describe('Subprocesses', () => {
    it('initialises git and installs with corepack pnpm in the project root', async () => {
      await scaffold({ skipGit: false, skipInstall: false })

      const calls = execa.mock.calls.map(([cmd, args, opts]) => ({ cmd, args, cwd: opts?.cwd }))
      expect(calls).toEqual([
        { cmd: 'git', args: ['init'], cwd: root },
        { cmd: 'git', args: ['add', '.'], cwd: root },
        { cmd: 'git', args: ['commit', '-m', 'Initial commit from telamonjs CLI'], cwd: root },
        { cmd: 'corepack', args: ['pnpm', 'install'], cwd: root },
      ])
      // Installed already: no manual install step
      expect(logs).not.toMatch(/^\s+pnpm install$/m)
    })

    it('skips both when asked and tells the user to install', async () => {
      await scaffold()

      expect(execa).not.toHaveBeenCalled()
      expect(logs).toMatch(/^\s+pnpm install$/m)
    })

    it('in local framework development, skips install and points to pnpm link', async () => {
      await scaffold({ skipInstall: false, isLocalDev: true })

      expect(execa).not.toHaveBeenCalled()
      expect(logs).toMatch(/^\s+pnpm install$/m)
      expect(logs).toContain('Local development detected')
    })

    it('prints the web and API URLs from appPort', async () => {
      await scaffold()

      expect(logs).toContain('Project my-shop created successfully! (monorepo)')
      expect(logs).toContain('Web: http://localhost:3100')
      expect(logs).toContain('API: http://localhost:4100/v1')
    })

    it('propagates an install failure', async () => {
      execa.mockRejectedValue(new Error('pnpm: network unreachable'))

      await expect(scaffold({ skipInstall: false })).rejects.toThrow('network unreachable')
    })
  })
})
