#!/usr/bin/env node
/**
 * Regenerates apps/example with the CLI itself, so the example never drifts
 * from the template. Run after changing packages/cli/templates:
 *
 *   pnpm --filter @telamonjs/cli build && pnpm example:generate
 *   pnpm example:generate --check   (CI: regenerates into a temp dir and diffs against apps/example)
 *
 * Framework deps become workspace:*; deps the catalog pins become catalog:;
 * the ui peers outside the catalog take the version ui itself installs.
 * A second copy of react / react-hook-form / react-query in the workspace
 * breaks hooks at runtime, which an app installed from npm never sees.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { ROOT, readJson } from '../docs/exports-lib.mjs'

const CHECK = process.argv.includes('--check')
const cliBin = join(ROOT, 'packages/cli/dist/cli.js')
if (!existsSync(cliBin)) {
  console.error('✗ packages/cli/dist missing — run `pnpm --filter @telamonjs/cli build` first')
  process.exit(1)
}

const exampleDir = join(ROOT, 'apps/example')
const parent = CHECK ? mkdtempSync(join(tmpdir(), 'telamonjs-example-')) : join(ROOT, 'apps')
const appDir = join(parent, 'example')
if (!CHECK) rmSync(appDir, { recursive: true, force: true })
execFileSync(process.execPath, [cliBin, 'create', 'example', '--skip-install', '--skip-git'], { cwd: parent, stdio: CHECK ? 'ignore' : 'inherit' })

const pkgPath = join(appDir, 'package.json')
const pkg = readJson(pkgPath)
pkg.name = '@telamonjs/example'
pkg.private = true
const uiPkg = readJson(join(ROOT, 'packages/ui/package.json'))
const catalog = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8').split(/^catalog:/m)[1] ?? ''
const catalogNames = new Set([...catalog.matchAll(/^ {2}'?([@\w./-]+)'?:/gm)].map(m => m[1]))
for (const field of ['dependencies', 'devDependencies']) {
  for (const dep of Object.keys(pkg[field] ?? {})) {
    if (dep.startsWith('@telamonjs/')) pkg[field][dep] = 'workspace:*'
    else if (catalogNames.has(dep)) pkg[field][dep] = 'catalog:'
    else if (uiPkg.peerDependencies?.[dep] && uiPkg.devDependencies?.[dep]) pkg[field][dep] = uiPkg.devDependencies[dep]
  }
}
// pnpm only reads overrides at the workspace root; the root package.json keeps them
delete pkg.pnpm
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
rmSync(join(appDir, '.npmrc'), { force: true })

if (!CHECK) {
  console.log('✓ apps/example regenerated — run `pnpm install` and review the diff')
  process.exit(0)
}

// Compare the fresh copy with the tracked (and new, not ignored) files of apps/example.
const walk = dir => readdirSync(dir).flatMap(e => (statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : [join(dir, e)]))
const generated = walk(appDir).map(f => relative(appDir, f))
// Files the example's .gitignore drops (next-env.d.ts, *.sql) never reach git.
let ignored = ''
try {
  ignored = execFileSync('git', ['check-ignore', '--no-index', '--stdin', '-z'], { cwd: exampleDir, input: generated.join('\0'), encoding: 'utf8' })
} catch (err) {
  if (err.status !== 1) throw err // 1 = nothing ignored
}
const ignoredSet = new Set(ignored.split('\0'))
const fresh = new Set(generated.filter(f => !ignoredSet.has(f)))
const current = new Set(
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'], { cwd: exampleDir, encoding: 'utf8' })
    .split('\0')
    .filter(f => f && existsSync(join(exampleDir, f)))
)
const drift = [
  ...[...fresh].filter(f => !current.has(f)).map(f => `missing   ${f}`),
  ...[...current].filter(f => !fresh.has(f)).map(f => `extra     ${f}`),
  ...[...fresh].filter(f => current.has(f) && !readFileSync(join(appDir, f)).equals(readFileSync(join(exampleDir, f)))).map(f => `differs   ${f}`),
].sort((a, b) => a.slice(10).localeCompare(b.slice(10)))
rmSync(parent, { recursive: true, force: true })
if (drift.length) {
  console.error(`✗ apps/example drifted from packages/cli/templates:\n  ${drift.join('\n  ')}\n— run \`pnpm example:generate\` and commit`)
  process.exit(1)
}
console.log('✓ apps/example matches the CLI template')
