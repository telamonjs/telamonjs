// Shared export collector: reads each package's public surface straight from
// its source barrels (package.json `exports` -> src/**/index.ts, following
// `export *` and named re-exports), so it never needs a build.
//
// Used by scripts/docs/generate.mjs (the exports index) and by
// apps/docs/scripts/check-content.mjs (the import check).
//
// ponytail: regex over raw TS text, no AST parser. generate.mjs cross-checks
// the runtime set it computes for the ui root against the API snapshot, so a
// parser blind spot fails loudly; upgrade to the TypeScript API if it does.

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
// Reading order everywhere (exports index, llms.txt, READMEs).
export const PACKAGES = ['ui', 'data', 'auth', 'permissions', 'logger', 'queue', 'cli']
export const LIBRARY_PACKAGES = PACKAGES.filter(p => p !== 'cli')

export const readJson = file => JSON.parse(readFileSync(file, 'utf8'))
export const pkgJson = p => readJson(join(ROOT, 'packages', p, 'package.json'))

function resolveModule(from, spec) {
  const base = resolve(dirname(from), spec.replace(/\.js$/, ''))
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  return null
}

const stripComments = src => src.replace(/\/\*[\s\S]*?\*\/|(^|[^:'"])\/\/.*$/gm, '$1')
const DECL_RUNTIME = /\b(?:const|let|var|function\*?|class|enum|namespace)\s+$/
const parseList = list =>
  list
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const isType = /^type\s+/.test(part)
      const [local, exported = local] = part.replace(/^type\s+/, '').split(/\s+as\s+/).map(s => s.trim())
      return { local, exported, isType }
    })

const cache = new Map()

/** Map<name, 'runtime' | 'type'> of everything `file` exports. */
export function collectExports(file) {
  if (!file) return new Map()
  if (cache.has(file)) return cache.get(file)
  const names = new Map()
  cache.set(file, names) // cycle guard: a re-entrant call sees the partial map
  const src = stripComments(readFileSync(file, 'utf8'))
  const add = (name, kind) => {
    if (name !== 'default' && names.get(name) !== 'runtime') names.set(name, kind)
  }

  // Kind of a name that is local to this file (declared or imported).
  const localKind = name => {
    const decl = new RegExp(`\\b(const|let|var|function\\*?|class|enum|namespace|interface|type)\\s+${name}\\b`).exec(src)
    if (decl) return /interface|type/.test(decl[1]) ? 'type' : 'runtime'
    for (const m of src.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      const hit = parseList(m[2]).find(i => i.exported === name)
      if (!hit) continue
      if (m[1] || hit.isType) return 'type'
      return m[3].startsWith('.') ? (collectExports(resolveModule(file, m[3])).get(hit.local) ?? 'runtime') : 'runtime'
    }
    return 'runtime'
  }

  for (const m of src.matchAll(/export\s+\*\s+(?:as\s+(\w+)\s+)?from\s+['"](\.[^'"]+)['"]/g)) {
    if (m[1]) add(m[1], 'runtime')
    else for (const [n, k] of collectExports(resolveModule(file, m[2]))) add(n, k)
  }
  for (const m of src.matchAll(/export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?((?:const\s+enum|const|let|var|function\*?|class|enum|namespace|interface|type)\s+)([A-Za-z_$][\w$]*)/g)) {
    add(m[2], DECL_RUNTIME.test(m[1]) || m[1].startsWith('const enum') ? 'runtime' : 'type')
  }
  for (const m of src.matchAll(/export\s+(type\s+)?\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/g)) {
    const target = m[3]?.startsWith('.') ? collectExports(resolveModule(file, m[3])) : null
    for (const { local, exported, isType } of parseList(m[2])) {
      if (m[1] || isType) add(exported, 'type')
      else if (m[3]) add(exported, target ? (target.get(local) ?? 'runtime') : 'runtime')
      else add(exported, localKind(local))
    }
  }
  return names
}

function typesPath(target) {
  if (typeof target === 'string') return target.endsWith('.d.ts') ? target : null
  if (!target || typeof target !== 'object') return null
  return target.types ?? typesPath(target.import) ?? typesPath(target.default)
}

/**
 * Entry points of a package: [{ entry: '.', spec: '@telamonjs/ui', file, exports, kind }].
 * `exports` is null for non-module entries (stylesheet, raw file); `kind` names them.
 */
export function entryPoints(p) {
  const pkgDir = join(ROOT, 'packages', p)
  const pj = pkgJson(p)
  return Object.entries(pj.exports ?? {}).map(([entry, target]) => {
    const spec = `${pj.name}${entry.slice(1)}`
    const types = typesPath(target)
    if (!types) {
      const path = typeof target === 'string' ? target : JSON.stringify(target)
      return { entry, spec, exports: null, kind: path.endsWith('.css') ? 'stylesheet' : 'file', target: path }
    }
    const file = resolveModule(join(pkgDir, 'package.json'), types.replace(/^\.\/dist\//, './src/').replace(/\.d\.c?ts$/, ''))
    if (!file) throw new Error(`exports-lib: cannot map ${spec} (${types}) to a source file`)
    return { entry, spec, file, exports: collectExports(file), kind: 'module' }
  })
}

/** Runtime names pinned by the ui snapshot test. */
export function uiSnapshotNames() {
  const snap = readFileSync(join(ROOT, 'packages/ui/src/__snapshots__/index.test.ts.snap'), 'utf8')
  const block = snap.match(/pins the full sorted list of exported names 1`\] = `\n\[([\s\S]*?)\]/)
  if (!block) throw new Error('exports-lib: export list not found in the ui snapshot')
  return new Set([...block[1].matchAll(/"([^"]+)"/g)].map(m => m[1]))
}
