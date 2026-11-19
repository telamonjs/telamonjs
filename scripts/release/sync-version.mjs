#!/usr/bin/env node
// Stamps the package versions into the places that copy them.
// Runs inside `pnpm version-packages`, right after `changeset version`:
//   - `export const version` in @telamonjs/ui mirrors ui's package.json version;
//   - `DEFAULT_UI_VERSION` in the CLI (the ui range generated apps install) is `^<ui version>`;
//   - every `"@telamonjs/<pkg>": "^x"` pin in packages/cli/templates/**/package.json
//     is `^<that package's version>` ({{placeholders}} are filled at create time and left alone).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ROOT, pkgJson } from '../docs/exports-lib.mjs'

function stamp(rel, re, replacement) {
  const file = join(ROOT, rel)
  const src = readFileSync(file, 'utf8')
  if (!re.test(src)) throw new Error(`sync-version: pattern ${re} not found in ${rel}`)
  writeFileSync(file, src.replace(re, replacement))
}

const ui = pkgJson('ui').version
stamp('packages/ui/src/exports/types-constants.ts', /(export const version\s*=\s*')[^']+(')/, `$1${ui}$2`)
stamp('packages/cli/src/commands/create.ts', /(export const DEFAULT_UI_VERSION\s*=\s*')[^']+(')/, `$1^${ui}$2`)
console.log(`✓ ui version constant → ${ui}, DEFAULT_UI_VERSION → ^${ui}`)

const walk = dir => readdirSync(dir).flatMap(e => (statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : [join(dir, e)]))
for (const file of walk(join(ROOT, 'packages/cli/templates')).filter(f => f.endsWith('package.json'))) {
  const src = readFileSync(file, 'utf8')
  const next = src.replace(/("@telamonjs\/([\w-]+)":\s*")\^\d[^"]*(")/g, (_, open, name, close) => `${open}^${pkgJson(name).version}${close}`)
  if (next !== src) {
    writeFileSync(file, next)
    console.log(`✓ ${relative(ROOT, file)}: @telamonjs/* pins stamped`)
  }
}
