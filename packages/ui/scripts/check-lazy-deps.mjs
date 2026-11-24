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
 * Usage: node scripts/check-lazy-deps.mjs   (after `pnpm build`)
 * Exits 1 if a heavy dep is statically reachable from any entry.
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
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
  // Export stack: loaded on demand by ExportMenu via import('./exportUtils')
  /^jspdf(-autotable)?(\/|$)/,
  /^papaparse(\/|$)/,
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

process.exit(failed ? 1 : 0)
