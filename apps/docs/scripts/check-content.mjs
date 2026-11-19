#!/usr/bin/env node
// Anti-drift gate for every Markdown/MDX file in the repo (`pnpm docs:check`):
//   [broken-link]          site links (/docs/...) that point to no page
//   [broken-relative-link] relative links in any .md/.mdx that point to no file
//   [unknown-entry] / [missing-export] / [not-reexported]
//                          imports from @telamonjs/* that the entry point does not export
//   [history]              internal versions and removal-speak (the docs describe the current state)
//   [denylist]             names that do not exist but keep being written
//   site-only prose rules  hardcoded versions, version notes, sprint-speak, page history, dead hosts
//   + the fact checks of scripts/docs/check-facts.mjs
//
// A line containing `docs-check: allow` (in an HTML/MDX comment or a code
// comment) or a ❌ exempts itself and the rest of its block (up to the next
// blank line outside a code fence) from every rule
// but the link checks. Use it for the "what does NOT exist" tables and the
// wrong-way examples, never to silence a real mistake. A denylisted name in
// prose that negates it ("there is no `AdminLayout`", on that line or the one
// before) is fine too.
//
// ponytail: regex over raw MDX/TS text, no AST parser -- good enough for a
// link/pattern/import guard, upgrade to remark if false positives pile up.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { LIBRARY_PACKAGES, PACKAGES, ROOT, entryPoints } from '../../../scripts/docs/exports-lib.mjs'
import { checkFacts } from '../../../scripts/docs/check-facts.mjs'

const DOCS_PREFIX = 'apps/docs/content/docs/'

// Deliberately NOT re-exported by the UI package (a second copy breaks the
// app's provider). Apps import them from @tanstack/react-query / next-intl.
const NOT_REEXPORTED = new Set([
  'useQuery', 'useMutation', 'useQueryClient', 'useInfiniteQuery', 'useSuspenseQuery',
  'QueryClient', 'QueryClientProvider', 'HydrationBoundary', 'dehydrate',
  'useTranslations', 'useLocale', 'useFormatter', 'useMessages', 'useNow', 'useTimeZone',
  'NextIntlClientProvider', 'getTranslations', 'getLocale', 'getMessages',
])

// Internal release numbers mean nothing to a 1.x reader; third-party versions are fine.
const INTERNAL_VERSION = /\b[1-9]\.x\b|\bv[1-9](?:\.\d+)*\+?(?![\w/])|\b(?:since|removed in|fixed in|deprecated in)\s+(?:version\s+)?v?\d+(?:\.\d+)+/i
const THIRD_PARTY = /NextAuth|next-auth|Auth\.js|authjs|tanstack|React Query v\d|@nestjs|NestJS v\d|BullMQ v\d|Bull\W*v3|TypeScript[\s:*]+\d|Tailwind(?:CSS)? v\d|Zod v\d|Prisma v\d|Recharts v\d|Node(?:\.js)? v\d|legacy v4|v4 cookie|\bv5 default\b|\/v1\b|["']v1["']|\bv1\b.*(?:global|prefix)|(?:global|prefix).*\bv1\b/i
const REMOVAL_SPEAK = /\b(?:was|were|been) removed\b|\bthe removed\b|\blegacy pattern|Last Updated/i

// Names that do not exist in any @telamonjs package but keep being written.
// A file that imports one of them from another module (e.g. `RadarChart` from
// recharts) may use it.
const DENYLIST = ['ProgressBar', 'DonutChart', 'RadarChart', 'ComposedChart', 'AdminLayout', 'CrudLayout', 'FormLayout', 'LayoutProvider', 'ZustandFormProps']
const DENY_RE = new RegExp(`\\b(${DENYLIST.join('|')})\\b`, 'g')
const SELECT_TYPE_RE = /\btype:\s*['"]select['"]/
const NEGATION_RE = /\b(?:no|not|never|none)\b|n't\b|instead of/i

// ── export maps: '@telamonjs/ui/charts' -> Set(names) | null (non-module entry) ─
const ENTRY_EXPORTS = new Map()
for (const p of LIBRARY_PACKAGES) for (const e of entryPoints(p)) ENTRY_EXPORTS.set(e.spec, e.exports)
if ((ENTRY_EXPORTS.get('@telamonjs/ui')?.size ?? 0) < 100) {
  console.error('check-content: the ui root export set looks empty -- the export parser needs updating')
  process.exit(1)
}

// ── files: every tracked (or new, not ignored) .md/.mdx ─────────────────────
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.md', '*.mdx'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(f => f && existsSync(join(ROOT, f)))
  .sort()
const isChangelog = rel => /(^|\/)CHANGELOG[^/]*$/.test(rel)

const toSlug = rel => {
  const r = rel.slice(DOCS_PREFIX.length).replace(/\.mdx$/, '')
  if (r === 'index') return '/docs'
  return `/docs/${r.replace(/\/?index$/, '')}`
}
const slugs = new Set(files.filter(f => f.startsWith(DOCS_PREFIX) && f.endsWith('.mdx')).map(toSlug))

/** Per line: text, its code segments, whether an allow-marker covers it. */
function parse(text) {
  let fence = null
  let allow = false
  return text.split('\n').map(line => {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1]
    const wasFence = fence
    if (marker && (!fence || marker.startsWith(fence))) fence = fence ? null : marker
    if (line.includes('docs-check: allow') || line.includes('❌')) allow = true
    else if (!fence && !wasFence && line.trim() === '') allow = false
    const inCode = Boolean(wasFence || marker)
    return { text: line, inCode, code: inCode ? [line] : [...line.matchAll(/`([^`]+)`/g)].map(m => m[1]), allowed: allow }
  })
}

let failures = 0
const fail = msg => {
  console.error(msg)
  failures++
}

const linkRe = /\]\((\/docs(?:\/[^)#\s]*)?)|href=['"](\/docs(?:\/[^'"#]*)?)/g
const mdLinkRe = /\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g
const importRe = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"](@telamonjs\/[^'"]+)['"]/g
const specRe = /(?:from|import)\s*['"](@telamonjs\/[\w-]+(?:\/[^'"]*)?)['"]/g
const versionNoteRe = /\*\*Since:?\*\*|\bsince\s+v\d|\bnew in v?\d+\.\d+/i
const docs = []

for (const rel of files) {
  const abs = join(ROOT, rel)
  const text = readFileSync(abs, 'utf8')
  const lines = parse(text)
  const isSite = rel.startsWith(DOCS_PREFIX)
  const lineOf = index => text.slice(0, index).split('\n').length
  docs.push({ rel, lines })

  // 1. Site links must point to a real slug (anchors ignored).
  if (isSite) {
    for (const m of text.matchAll(linkRe)) {
      const target = (m[1] || m[2]).replace(/\/$/, '') || '/docs'
      if (!slugs.has(target)) fail(`[broken-link] ${rel}:${lineOf(m.index)}: ${target}`)
    }
  }

  // 2. Relative links must point to a real file (code blanked out first).
  const prose = lines.map(l => (l.inCode ? '' : l.text.replace(/`[^`]*`/g, ''))).join('\n')
  for (const m of prose.matchAll(mdLinkRe)) {
    const url = m[1]
    if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(url) || url.includes('{{')) continue
    if (url.startsWith('/') && rel.endsWith('.mdx')) continue // site route, checked above
    const target = decodeURI(url.split('#')[0].split('?')[0])
    if (!target) continue
    const resolved = target.startsWith('/') ? join(ROOT, target) : resolve(dirname(abs), target)
    // The monorepo's apps/web is the app template with web-overlay copied on top.
    const overlaid = resolved.replace('/templates/monorepo/apps/web-overlay/', '/templates/app/')
    const candidates = [resolved, overlaid, `${resolved}.mdx`, `${resolved}.md`, join(resolved, 'index.mdx')]
    if (!candidates.some(c => existsSync(c) && (c === resolved || c === overlaid || statSync(c).isFile()))) {
      fail(`[broken-relative-link] ${rel}:${lineOf(m.index)}: ${url}`)
    }
  }

  // 3. Imports from @telamonjs/*: the entry must exist and export every name.
  for (const m of text.matchAll(specRe)) {
    const line = lineOf(m.index)
    if (lines[line - 1].allowed) continue
    if (!ENTRY_EXPORTS.has(m[1])) fail(`[unknown-entry] ${rel}:${line}: ${m[1]} is not an entry point of any package (${PACKAGES.join(', ')})`)
  }
  for (const m of text.matchAll(importRe)) {
    const line = lineOf(m.index)
    const exported = ENTRY_EXPORTS.get(m[2])
    if (!exported || lines[line - 1].allowed) continue
    for (const part of m[1].replace(/\/\/.*$/gm, '').split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
      if (!name || exported.has(name)) continue
      if (NOT_REEXPORTED.has(name)) fail(`[not-reexported] ${rel}:${line}: "${name}" comes from @tanstack/react-query or next-intl, never from ${m[2]}`)
      else fail(`[missing-export] ${rel}:${line}: "${name}" is not exported by ${m[2]}`)
    }
  }

  if (isChangelog(rel)) continue

  // Denylisted names this file imports from a non-@telamonjs module are its own.
  const ownNames = new Set()
  for (const m of text.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    if (!m[2].startsWith('@telamonjs/')) for (const n of m[1].split(',')) ownNames.add(n.trim().split(/\s+as\s+/).pop())
  }

  // 4. Line rules.
  lines.forEach(({ text: line, inCode, allowed }, i) => {
    if (allowed) return
    const loc = `${rel}:${i + 1}`
    if ((INTERNAL_VERSION.test(line) && !THIRD_PARTY.test(line)) || REMOVAL_SPEAK.test(line)) fail(`[history] ${loc}: ${line.trim()}`)
    for (const m of line.matchAll(DENY_RE)) {
      // `function AdminLayout` is an app's own Next.js layout, not a framework name.
      if (ownNames.has(m[1]) || (!inCode && NEGATION_RE.test(`${lines[i - 1]?.text ?? ''} ${line}`)) || /function\s+$/.test(line.slice(0, m.index))) continue
      fail(`[denylist] ${loc}: "${m[1]}" does not exist in TelamonJS`)
    }
    if (SELECT_TYPE_RE.test(line)) fail(`[denylist] ${loc}: there is no 'select' field type — use 'relationship'`)

    if (!isSite) return
    // Example config like appVersion: '1.0.0' is not a TelamonJS version, so
    // the check requires 'telamonjs' on the line.
    if (/telamonjs/i.test(line) && /\b\d+\.\d+\.\d+\b/.test(line)) fail(`[hardcoded-version] ${loc}: ${line.trim()} — use <PkgVersion pkg="…" />`)
    if (versionNoteRe.test(line)) fail(`[version-note] ${loc}: ${line.trim()}`)
    if (/\bSprint \d+/i.test(line)) fail(`[sprint-speak] ${loc}: ${line.trim()}`)
    if (/previous version|verified against|rewritten against|corrected against/i.test(line)) fail(`[page-history] ${loc}: ${line.trim()}`)
    if (line.includes('storybook.example.com')) fail(`[dead-host] ${loc}: ${line.trim()}`)
  })
}

for (const msg of checkFacts(docs.filter(d => !isChangelog(d.rel)))) fail(msg)

if (failures > 0) {
  console.error(`\ncheck-content: ${failures} issue(s) found across ${files.length} files.`)
  process.exit(1)
}
console.log(`check-content: ok (${files.length} files scanned, ${ENTRY_EXPORTS.size} entry points)`)
