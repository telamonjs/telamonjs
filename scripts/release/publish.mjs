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

// The registry lists a new version minutes before its tarball propagates, and
// installs fail with ERR_PNPM_FETCH_404 meanwhile. A green Release means
// "installable": wait for every tarball to answer 200.
const tarballUrl = (name, version) =>
  `https://registry.npmjs.org/${name}/-/${name.split('/').pop()}-${version}.tgz`

const waitInstallable = async (urls, { timeoutMs = 15 * 60_000, intervalMs = 20_000 } = {}) => {
  const pending = new Set(urls)
  const deadline = Date.now() + timeoutMs
  while (pending.size > 0 && Date.now() < deadline) {
    for (const url of [...pending]) {
      const res = await fetch(url, { method: 'HEAD' }).catch(() => null)
      if (res?.ok) pending.delete(url)
    }
    if (pending.size > 0) await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return [...pending]
}

const publishedUrls = []
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
  publishedUrls.push(tarballUrl(name, version))
  published++
}
console.log(published ? `✓ ${published} package(s) published` : '✓ nothing to publish: every version is already on npm')

if (publishedUrls.length > 0) {
  const missing = await waitInstallable(publishedUrls)
  if (missing.length === 0) console.log('✓ every published tarball is downloadable: safe to announce')
  // Published is published: warn instead of failing the run
  else for (const url of missing) console.log(`::warning::tarball not downloadable yet: ${url}`)
}
