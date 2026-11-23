import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { link, unlink } from './link'

const dir = mkdtempSync(join(tmpdir(), 'telamonjs-link-'))
// a checkout ahead of npm: its version was never published
const checkout = join(dir, 'telamonjs')
const write = (file: string, json: unknown) => {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
}
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const commit = (cwd: string) => {
  const git = (...args: string[]) => execFileSync('git', args, { cwd })
  git('init', '-q')
  git('add', '.')
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'init')
}

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubEnv('TELAMONJS_UI', undefined)
  write(join(checkout, 'packages/ui/package.json'), { name: '@telamonjs/ui', version: '1.0.9' })
  write(join(checkout, 'packages/logger/package.json'), { name: '@telamonjs/logger', version: '1.0.9' })
})
afterAll(() => {
  vi.unstubAllEnvs()
  rmSync(dir, { recursive: true, force: true })
})

describe('telamonjs link / unlink', () => {
  it('single app: edits ./package.json and restores the committed range', () => {
    const app = join(dir, 'single')
    const file = join(app, 'package.json')
    write(file, { name: 'single', dependencies: { '@telamonjs/ui': '^1.0.1' } })
    commit(app)
    const original = readFileSync(file, 'utf8')

    link({ cwd: app, ui: join(checkout, 'packages/ui') })
    expect(read(file)).toEqual({
      name: 'single',
      dependencies: { '@telamonjs/ui': 'file:../telamonjs/packages/ui' },
      dependenciesMeta: { '@telamonjs/ui': { injected: true } },
      pnpm: { overrides: { '@telamonjs/logger': 'link:../telamonjs/packages/logger' } },
    })

    unlink({ cwd: app })
    expect(readFileSync(file, 'utf8')).toBe(original)
  })

  it('monorepo: detects apps/web, puts the override in the workspace root and keeps its other overrides', () => {
    const repo = join(dir, 'mono')
    const web = join(repo, 'apps/web/package.json')
    const root = join(repo, 'package.json')
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), '') // a stray workspace further up must not win
    mkdirSync(repo, { recursive: true })
    writeFileSync(join(repo, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n")
    write(root, { name: 'mono', pnpm: { overrides: { 'motion-dom': '~12.23.23' } } })
    write(web, { name: 'web', dependencies: { '@telamonjs/ui': '^1.0.1' } })
    commit(repo)
    const originals = [readFileSync(root, 'utf8'), readFileSync(web, 'utf8')]

    link({ cwd: repo }) // default checkout: ../telamonjs/packages/ui from the workspace root
    expect(read(web).dependencies['@telamonjs/ui']).toBe('file:../../../telamonjs/packages/ui')
    expect(read(web).dependenciesMeta).toEqual({ '@telamonjs/ui': { injected: true } })
    expect(read(root).pnpm.overrides).toEqual({
      'motion-dom': '~12.23.23',
      '@telamonjs/logger': 'link:../telamonjs/packages/logger',
    })

    // from inside apps/web (pnpm --filter … exec): same result
    unlink({ cwd: join(repo, 'apps/web') })
    expect([readFileSync(root, 'utf8'), readFileSync(web, 'utf8')]).toEqual(originals)
    rmSync(join(dir, 'pnpm-workspace.yaml'))
  })

  it('--package picks the file; a missing checkout or dependency fails without writing', () => {
    const app = join(dir, 'custom')
    const file = join(app, 'packages/admin/package.json')
    write(file, { dependencies: { '@telamonjs/ui': '^1.0.1' } })
    write(join(app, 'package.json'), { name: 'root' })
    expect(() => link({ cwd: app })).toThrow(/not a dependency/)
    expect(() => link({ cwd: app, package: 'packages/admin/package.json', ui: join(dir, 'nowhere') })).toThrow(/not found/)
    expect(read(file).dependencies['@telamonjs/ui']).toBe('^1.0.1')
    link({ cwd: app, package: 'packages/admin/package.json', ui: join(checkout, 'packages/ui') })
    expect(read(file).dependencies['@telamonjs/ui']).toBe('file:../../../telamonjs/packages/ui')
  })
})

describe('monorepo template husky hooks', () => {
  const hooks = join(__dirname, '..', '..', 'templates', 'monorepo', 'root', '.husky')
  const repo = join(dir, 'hooks')
  const bin = join(dir, 'bin')
  const calls = join(dir, 'calls.log')
  const installed = join(repo, 'apps/web/node_modules/@telamonjs/ui')
  // stand-ins for the CLI and pnpm: record the call, pnpm exits with $PNPM_EXIT
  const shim = (name: string, exit: string) => {
    mkdirSync(bin, { recursive: true })
    writeFileSync(join(bin, name), `#!/bin/sh\necho "${name} $*" >> "${calls}"\nexit ${exit}\n`)
    chmodSync(join(bin, name), 0o755)
  }
  const run = (hook: string, env: Record<string, string> = {}) => {
    rmSync(calls, { force: true })
    try {
      execFileSync('sh', [join(hooks, hook)], { cwd: repo, stdio: 'pipe', env: { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}` } })
      return 0
    } catch (error) {
      return (error as { status: number }).status
    }
  }
  const logged = () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : [])
  const installAt = (target: string) => {
    mkdirSync(target, { recursive: true })
    rmSync(installed, { force: true })
    mkdirSync(join(installed, '..'), { recursive: true })
    symlinkSync(target, installed)
  }

  beforeAll(() => {
    shim('telamonjs', '0')
    shim('pnpm', '${PNPM_EXIT:-0}')
    write(join(repo, 'apps/web/package.json'), { dependencies: { '@telamonjs/ui': '^1.0.1' } })
  })

  // pnpm installs every package as a symlink into its store
  it('post-commit does not relink a package installed from the registry', () => {
    installAt(join(repo, 'node_modules/.pnpm/@telamonjs+ui@1.0.1/node_modules/@telamonjs/ui'))
    expect(run('post-commit')).toBe(0)
    expect(logged()).toEqual([])
  })

  it('post-commit relinks when node_modules still holds the injected checkout', () => {
    installAt(join(repo, 'node_modules/.pnpm/@telamonjs+ui@file+..+telamonjs+packages+ui/node_modules/@telamonjs/ui'))
    expect(run('post-commit')).toBe(0)
    expect(logged()).toEqual(['telamonjs link'])
  })

  it('pre-commit unlinks a linked app and aborts when the lockfile update fails', () => {
    write(join(repo, 'apps/web/package.json'), { dependencies: { '@telamonjs/ui': 'file:../../../telamonjs/packages/ui' } })
    expect(run('pre-commit', { PNPM_EXIT: '1' })).toBe(1)
    expect(logged()).toEqual(['telamonjs unlink', 'pnpm install --lockfile-only --silent'])
  })
})
