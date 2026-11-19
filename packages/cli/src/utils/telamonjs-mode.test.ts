import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// The monorepo template's link-mode switcher (templates/monorepo/root/scripts).
const script = join(__dirname, '..', '..', 'templates', 'monorepo', 'root', 'scripts', 'telamonjs-mode.mjs')

describe('telamonjs-mode.mjs (monorepo template)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'telamonjs-mode-'))
  const checkout = join(dir, 'checkout')
  const app = join(dir, 'app')
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const run = (cmd: string) =>
    execFileSync(process.execPath, [script, cmd], { cwd: app, env: { ...process.env, TELAMONJS_UI: checkout } })
  const uiRange = () =>
    JSON.parse(readFileSync(join(app, 'apps/web/package.json'), 'utf8')).dependencies['@telamonjs/ui']

  it('unlink restores the committed range, not the checkout version', () => {
    mkdirSync(checkout, { recursive: true })
    // a checkout ahead of npm: this version was never published
    writeFileSync(join(checkout, 'package.json'), JSON.stringify({ name: '@telamonjs/ui', version: '1.0.9' }))
    mkdirSync(join(app, 'apps/web'), { recursive: true })
    writeFileSync(join(app, 'apps/web/package.json'), JSON.stringify({ dependencies: { '@telamonjs/ui': '^1.0.1' } }))
    const git = (...args: string[]) => execFileSync('git', args, { cwd: app })
    git('init', '-q')
    git('add', '.')
    git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'init')

    run('link')
    expect(uiRange()).toBe(`link:${checkout}`)
    run('unlink')
    expect(uiRange()).toBe('^1.0.1')
  })
})
