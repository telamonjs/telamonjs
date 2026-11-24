#!/usr/bin/env node
/**
 * check-lazy-deps.mjs
 *
 * Verifies that the default module graphs of telamonjs-ui (ListPage, AdminForm)
 * never STATICALLY import the heavy optional dependencies (tiptap ~140 KB,
 * recharts ~180 KB). Those must only be reachable through dynamic import()
 * (React.lazy), so consumers who never use richtext/charts don't pay the cost.
 *
 * The dist/ output is file-per-file ESM with extensioned relative imports
 * (tsup custom plugin), so static imports are parseable with a simple regex.
 * Dynamic import() calls are intentionally NOT followed.
 *
 * Optional peers (`peerDependenciesMeta.optional` in package.json) are stricter:
 * NO file in dist/ may import them statically, since an app that never installed
 * them must still build. They load through `import()` whose nearest enclosing
 * block is a `try`: webpack and Turbopack then downgrade the missing module to a
 * build warning and emit a stub that throws MODULE_NOT_FOUND at runtime
 * (verified with next build/dev, webpack and Turbopack, Next 15.5 and 16.4).
 *
 * Usage: node scripts/check-lazy-deps.mjs   (after `pnpm build`)
 * Exits 1 if a heavy dep is statically reachable from any entry, or an
 * optional peer is statically imported anywhere.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, resolve, relative, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist')

/** Entry points whose static graphs must stay free of heavy deps. */
const ENTRIES = [
  'pages/ListPage.js',
  'components/forms/AdminForm.js',
  // The whole field-system registry is part of every form graph:
  'field-system/field-registry.js',
  // ChartWidget must load recharts lazily (ChartWidgetChart):
  'dashboard/widgets/ChartWidget.js',
  // Shell: cmdk loads on first Cmd+K; toolbar: react-day-picker loads with the
  // DateRange subcomponent.
  'layouts/AdminShell.js',
  'components/toolbar/TabToolbar.js',
  // Root provider of every app: only the default locale ships statically.
  'providers/AppProviders.js',
]

/** Bare specifiers that must NOT be statically reachable. */
const FORBIDDEN = [
  /^@tiptap\//,
  /^recharts(\/|$)/,
  // PDF export: optional peers, also checked across all of dist/ below
  /^jspdf(-autotable)?(\/|$)/,
]

/**
 * Extra forbidden specifiers for the entries that do NOT legitimately render forms.
 * (AdminForm's field registry statically includes cmdk/react-day-picker, so those
 * can't be forbidden globally.)
 */
const NON_FORM_FORBIDDEN = [/^cmdk$/, /^react-day-picker(\/|$)/]
const NON_FORM_ENTRIES = new Set([
  'layouts/AdminShell.js',
  'components/toolbar/TabToolbar.js',
])

// Static import/export-from statements. Dynamic `import(` has no `from`
// clause and side-effect dynamic imports don't exist, so these patterns
// only match static edges in esbuild's ESM output.
const STATIC_RE = [
  /(?:^|[;\n}])\s*import\s+[\w$*{},\s]*?from\s*['"]([^'"]+)['"]/g, // import x from '...'
  /(?:^|[;\n])\s*import\s*['"]([^'"]+)['"]/g, // import '...' (side-effect)
  /(?:^|[;\n}])\s*export\s+[\w$*{},\s]*?from\s*['"]([^'"]+)['"]/g, // export ... from '...'
]

function staticImports(file) {
  const code = readFileSync(file, 'utf8')
  const specs = new Set()
  for (const re of STATIC_RE) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(code)) !== null) specs.add(m[1])
  }
  return [...specs]
}

/** Internal modules (dist-relative) that must NOT be statically reachable from the same entries. */
const FORBIDDEN_MODULES = {
  // Dialogs pull AdminForm + the field registry; they must load on first open
  'pages/ListPage.js': ['components/forms/AdminForm.js'],
  // en/es load on demand (load-messages.ts) when the app passes no messages
  'providers/AppProviders.js': [
    'i18n/messages/en/index.js',
    'i18n/messages/es/index.js',
  ],
}

let failed = false

for (const entry of ENTRIES) {
  const entryPath = resolve(DIST, entry)
  if (!existsSync(entryPath)) {
    console.error(`✗ entry not found: ${entry} (run pnpm build first)`)
    failed = true
    continue
  }

  const visited = new Set()
  const parent = new Map() // file -> importer (for reporting the chain)
  const bareHits = [] // { spec, importer }
  const queue = [entryPath]
  visited.add(entryPath)

  while (queue.length > 0) {
    const file = queue.shift()
    for (const spec of staticImports(file)) {
      if (spec.startsWith('.')) {
        const next = resolve(dirname(file), spec)
        if (!visited.has(next)) {
          visited.add(next)
          parent.set(next, file)
          if (existsSync(next)) queue.push(next)
        }
      } else if (
        FORBIDDEN.some(re => re.test(spec)) ||
        (NON_FORM_ENTRIES.has(entry) &&
          NON_FORM_FORBIDDEN.some(re => re.test(spec)))
      ) {
        bareHits.push({ spec, importer: file })
      }
    }
  }

  for (const mod of FORBIDDEN_MODULES[entry] ?? []) {
    if (visited.has(resolve(DIST, mod))) {
      failed = true
      console.error(`✗ ${entry}: ${mod} is statically reachable`)
    }
  }

  if (bareHits.length > 0) {
    failed = true
    console.error(`✗ ${entry}: heavy deps statically reachable:`)
    for (const { spec, importer } of bareHits) {
      // Reconstruct the import chain entry -> ... -> importer
      const chain = [relative(DIST, importer)]
      let cur = importer
      while (parent.has(cur)) {
        cur = parent.get(cur)
        chain.unshift(relative(DIST, cur))
      }
      console.error(`    ${spec}\n      via ${chain.join('\n          -> ')}`)
    }
  } else {
    console.log(
      `✓ ${entry}: ${visited.size} modules traversed, no static heavy-dep imports`
    )
  }
}

const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'))
const optionalPeers = Object.keys(pkg.peerDependencies ?? {}).filter(
  name => pkg.peerDependenciesMeta?.[name]?.optional === true
)
const isOptionalPeer = spec =>
  optionalPeers.some(name => spec === name || spec.startsWith(`${name}/`))

function* jsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* jsFiles(path)
    else if (entry.name.endsWith('.js')) yield path
  }
}

/** Whether the nearest block enclosing `index` is a `try { … }`. */
function insideTry(code, index) {
  let depth = 0
  for (let i = index - 1; i >= 0; i--) {
    if (code[i] === '}') depth++
    else if (code[i] === '{' && depth-- === 0) return /\btry\s*$/.test(code.slice(0, i))
  }
  return false
}

const DYNAMIC_RE = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g

const peerHits = []
for (const file of jsFiles(DIST)) {
  for (const spec of staticImports(file)) {
    if (isOptionalPeer(spec)) peerHits.push(`${spec} in ${relative(DIST, file)}`)
  }
  const code = readFileSync(file, 'utf8')
  for (const m of code.matchAll(DYNAMIC_RE)) {
    if (isOptionalPeer(m[1]) && !insideTry(code, m.index)) {
      peerHits.push(`import('${m[1]}') outside a try block in ${relative(DIST, file)}`)
    }
  }
}
if (peerHits.length > 0) {
  failed = true
  console.error('✗ optional peers must load through import() directly inside try { }:')
  for (const hit of peerHits) console.error(`    ${hit}`)
} else {
  console.log(`✓ optional peers (${optionalPeers.join(', ')}): no static import, every import() inside try`)
}

process.exit(failed ? 1 : 0)
