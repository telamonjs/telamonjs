#!/usr/bin/env node
// Switches apps/web between the published @telamonjs/ui and a local checkout
// (link mode). Used by the telamonjs:link/unlink scripts and the husky hooks.
//
//   node scripts/telamonjs-mode.mjs link      # point at the checkout
//   node scripts/telamonjs-mode.mjs unlink    # back to the published range
//
// The checkout sits next to this project unless TELAMONJS_UI says otherwise.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FILE = 'apps/web/package.json'
const PKG = '@telamonjs/ui'
const UI = resolve(process.env.TELAMONJS_UI ?? '../telamonjs/packages/ui')
const isLinked = range => typeof range === 'string' && range.startsWith('link:')

// The range to go back to: the one already committed, else the latest published
// version. Never the checkout's own version, which may not be on npm yet.
function publishedRange() {
  try {
    const committed = JSON.parse(
      execSync(`git show HEAD:${FILE}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    ).dependencies?.[PKG]
    if (committed && !isLinked(committed)) return committed
  } catch {
    // no commit yet, or the file is new
  }
  return '^' + execSync(`npm view ${PKG} version`, { encoding: 'utf8' }).trim()
}

const pkg = JSON.parse(readFileSync(FILE, 'utf8'))
const current = pkg.dependencies[PKG]
const command = process.argv[2]

if (command === 'link') {
  pkg.dependencies[PKG] = 'link:' + UI
} else if (command === 'unlink') {
  if (!isLinked(current)) process.exit(0)
  pkg.dependencies[PKG] = publishedRange()
} else {
  console.error('usage: node scripts/telamonjs-mode.mjs link|unlink')
  process.exit(1)
}

writeFileSync(FILE, JSON.stringify(pkg, null, 2) + '\n')
console.log(`${PKG}: ${current} -> ${pkg.dependencies[PKG]}`)
