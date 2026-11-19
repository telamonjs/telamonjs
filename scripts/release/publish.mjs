#!/usr/bin/env node
// Publishes every package whose package.json version is not on npm yet, then
// tags it (`@telamonjs/<pkg>@<version>`). Run by .github/workflows/release.yml
// after CI passes on main; npm authenticates the workflow through trusted
// publishing (OIDC), so there is no token anywhere.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts })

const isPublished = (name, version) => {
  try {
    // stderr ignored: a 404 here is the expected "not published yet" answer
    return run('npm', ['view', `${name}@${version}`, 'version'], { stdio: ['ignore', 'pipe', 'ignore'] }).trim() === version
  } catch {
    return false
  }
}

let published = 0
for (const dir of readdirSync(join(ROOT, 'packages'))) {
  const pkgDir = join(ROOT, 'packages', dir)
  const { name, version, private: isPrivate } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  if (isPrivate || isPublished(name, version)) continue

  // pnpm pack rewrites workspace:^ to the real range; npm publishes the tarball
  const out = mkdtempSync(join(tmpdir(), 'telamonjs-pack-'))
  run('pnpm', ['pack', '--pack-destination', out], { cwd: pkgDir })
  const tarball = join(out, readdirSync(out).find(f => f.endsWith('.tgz')))
  run('npm', ['publish', tarball, '--access', 'public', '--provenance'], { stdio: 'inherit' })

  const tag = `${name}@${version}`
  try {
    run('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])
  } catch {
    run('git', ['tag', '-a', tag, '-m', `${name} ${version}`])
    run('git', ['push', 'origin', tag], { stdio: 'inherit' })
  }
  console.log(`✓ published ${tag}`)
  published++
}
console.log(published ? `✓ ${published} package(s) published` : '✓ nothing to publish: every version is already on npm')
