// Fact checks for docs prose, run by `pnpm docs:check` (apps/docs/scripts/check-content.mjs).
// Each fact is read from its single home in the code and compared with what
// the docs claim:
//   field-type count  — the `FieldType` union (packages/ui/src/field-system/field-registry.ts)
//   `pnpm <script>`   — the package.json scripts of the context the doc describes
//   `telamonjs <cmd>` — the commander definitions in packages/cli/src
//   lint rule tables  — the rule ids in packages/cli/src/commands/lint
//   test/export/page counts — never stated in prose (they rot)
//
// ponytail: regex over raw text, the same trade-off as the export collector.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PACKAGES, ROOT, pkgJson, readJson } from './exports-lib.mjs'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const scriptsOf = rel => {
  try {
    return Object.keys(readJson(join(ROOT, rel)).scripts ?? {})
  } catch {
    return [] // template package.json with handlebars outside strings
  }
}

// ── facts from the code ─────────────────────────────────────────────────────
const unionBody = read('packages/ui/src/field-system/field-registry.ts').match(/export type FieldType =([\s\S]*?)\n\n/)?.[1]
if (!unionBody) throw new Error('check-facts: FieldType union not found in field-registry.ts')
const FIELD_TYPE_COUNT = new Set(unionBody.match(/'[^']+'/g)).size

const PNPM_BUILTINS = new Set(['add', 'install', 'i', 'remove', 'rm', 'update', 'up', 'exec', 'dlx', 'create', 'init', 'why', 'list', 'ls', 'link', 'unlink', 'store', 'publish', 'pack', 'outdated', 'audit', 'prune', 'rebuild', 'setup', 'env', 'config', 'import', 'patch', 'approve-builds', 'licenses', 'deploy', 'fetch', 'recursive', 'version'])
// Bins `pnpm <bin>` runs as a fallback when no script has that name.
const PNPM_BINS = new Set(['prisma', 'next', 'tsc', 'vitest', 'eslint', 'prettier', 'changeset', 'telamonjs', 'create-telamonjs-app', 'tsx', 'nest', 'storybook', 'fumadocs-mdx'])
const ROOT_SCRIPTS = scriptsOf('package.json')
const APP_SCRIPTS = scriptsOf('packages/cli/templates/app/package.json')
const MONOREPO_SCRIPTS = ['root', 'apps/web-overlay', 'apps/api', 'apps/jobs', 'packages/shared'].flatMap(d => scriptsOf(`packages/cli/templates/monorepo/${d}/package.json`))
const PACKAGE_SCRIPTS = PACKAGES.flatMap(p => Object.keys(pkgJson(p).scripts ?? {}))
const ALL_SCRIPTS = new Set([...ROOT_SCRIPTS, ...APP_SCRIPTS, ...MONOREPO_SCRIPTS, ...PACKAGE_SCRIPTS])
// Which scripts a doc may name depends on who runs the command it shows.
function scriptsFor(rel) {
  if (/^packages\/cli\/templates\/monorepo\//.test(rel)) return new Set(MONOREPO_SCRIPTS)
  if (/^(packages\/cli\/templates\/app|apps\/example)\//.test(rel)) return new Set(APP_SCRIPTS)
  if (/^(AGENTS|CLAUDE|CONTRIBUTING)\.md$|^\.github\/|^\.changeset\/|^docs\//.test(rel)) return new Set(ROOT_SCRIPTS)
  return ALL_SCRIPTS // README, site pages and package docs describe both the repo and a consumer app
}

// CLI: top-level commands (+ aliases), their subcommands, and every --flag.
const CLI_DIR = 'packages/cli/src'
const cliSources = [`${CLI_DIR}/cli.ts`, ...readdirSync(join(ROOT, CLI_DIR, 'commands')).map(d => `${CLI_DIR}/commands/${d}/index.ts`)].filter(f => existsSync(join(ROOT, f)))
const TOP = new Set(['help'])
const SUBS = new Map()
const FLAGS = new Set(['--help', '--version'])
for (const f of cliSources) {
  const src = read(f)
  for (const m of src.matchAll(/--([a-z][\w-]*)/g)) FLAGS.add(`--${m[1]}`)
  if (f.endsWith('cli.ts')) {
    for (const m of src.matchAll(/\.(?:command|alias)\('([\w-]+)'/g)) TOP.add(m[1])
    continue
  }
  const top = src.match(/new Command\('([\w-]+)'\)(\s*\.alias\('([\w-]+)'\))?/)
  if (!top) continue
  const subs = new Set(['help', ...[...src.matchAll(/\.(?:command|alias)\('([\w-]+)'/g)].map(m => m[1])].filter(s => s !== top[3]))
  for (const name of [top[1], top[3]].filter(Boolean)) {
    TOP.add(name)
    if (subs.size > 1) SUBS.set(name, subs)
  }
}

// Lint rule ids: object keys and `rule: '…'` / at(…, 'id', 'error'|'warning') literals.
const lintSrc = readdirSync(join(ROOT, CLI_DIR, 'commands/lint')).filter(f => f.endsWith('.ts') && !f.includes('.test.')).map(f => read(`${CLI_DIR}/commands/lint/${f}`)).join('\n')
const RULE_IDS = new Set([...lintSrc.matchAll(/(?:^\s*'([a-z0-9-]+)':|rule:\s*'([a-z0-9-]+)'|'([a-z0-9-]+)',\s*'(?:error|warning)')/gm)].map(m => m[1] ?? m[2] ?? m[3]))

// ── the checks ──────────────────────────────────────────────────────────────
const FIELD_COUNT_RE = /\b(\d+)[\s-]+(?:built-in\s+)?(?:field[\s-]types?|type[\s-]field)\b/gi
const COUNT_RE = /\b\d[\d,.]*\+?\s+(?:passing\s+|unit\s+|automated\s+)?tests\b|\b\d[\d,]*\+?\s+(?:root\s+|public\s+|named\s+|exported\s+)?(?:exports|exported names)\b|\b\d+\s+static pages\b/i
const PNPM_RE = /(?:^|[\s;&|(`])pnpm\s+(?:(?:--filter|-F)\s+\S+\s+|-r\s+|-w\s+)?(?:run\s+)?([a-z][\w:.-]*)/g
const CLI_RE = /(?:^|[\s;&|(`'"])(telamonjs|create-telamonjs-app)((?:\s+[^\s;&|#`'"]+)*)/g

/**
 * @param docs [{ rel, lines: [{ text, code: string[], allowed }] }]  — `code` holds
 *   the line's code segments (the whole line inside a fence, inline spans outside).
 * @returns failure messages
 */
export function checkFacts(docs) {
  const failures = []
  const fail = (rule, loc, msg) => failures.push(`[${rule}] ${loc}: ${msg}`)

  for (const p of PACKAGES) {
    for (const m of (pkgJson(p).description ?? '').matchAll(FIELD_COUNT_RE)) {
      if (Number(m[1]) !== FIELD_TYPE_COUNT) fail('field-type-count', `packages/${p}/package.json`, `description says ${m[1]}, the FieldType union has ${FIELD_TYPE_COUNT}`)
    }
  }

  for (const { rel, lines } of docs) {
    const scripts = scriptsFor(rel)
    lines.forEach(({ text, code, allowed }, i) => {
      if (allowed) return
      const loc = `${rel}:${i + 1}`
      for (const m of text.matchAll(FIELD_COUNT_RE)) {
        if (Number(m[1]) !== FIELD_TYPE_COUNT) fail('field-type-count', loc, `"${m[0]}" — the FieldType union has ${FIELD_TYPE_COUNT}`)
      }
      const count = text.match(COUNT_RE)
      if (count) fail('count-in-prose', loc, `"${count[0]}" — test/export/page counts are not stated in docs`)

      for (const seg of code) {
        for (const m of seg.matchAll(PNPM_RE)) {
          const name = m[1]
          if (/--filter|-F\s/.test(m[0]) ? ALL_SCRIPTS.has(name) : scripts.has(name)) continue
          if (PNPM_BUILTINS.has(name) || PNPM_BINS.has(name)) continue
          fail('unknown-script', loc, `\`pnpm ${name}\` — no such script here`)
        }
        for (const m of seg.matchAll(CLI_RE)) {
          const args = m[2].trim().split(/\s+/).filter(Boolean)
          if (m[1] === 'telamonjs' && args.length && /^[a-z]/.test(args[0])) {
            const [cmd, sub] = args
            if (!TOP.has(cmd)) fail('unknown-cli-command', loc, `\`telamonjs ${cmd}\` is not a CLI command`)
            else if (SUBS.has(cmd) && sub && /^[a-z][\w-]*$/.test(sub) && !SUBS.get(cmd).has(sub)) fail('unknown-cli-command', loc, `\`telamonjs ${cmd} ${sub}\` is not a CLI command`)
          }
          for (const flag of args.filter(a => a.startsWith('--')).map(a => a.split('=')[0])) {
            if (!FLAGS.has(flag)) fail('unknown-cli-flag', loc, `\`${flag}\` is not an option of the CLI`)
          }
        }
      }

      const rule = text.match(/^\|\s*`([a-z0-9-]+)`\s*\|\s*(?:error|warning)\s*\|/)
      if (rule && !RULE_IDS.has(rule[1])) fail('unknown-lint-rule', loc, `\`${rule[1]}\` is not a \`telamonjs lint\` rule id`)
    })
  }
  return failures
}
