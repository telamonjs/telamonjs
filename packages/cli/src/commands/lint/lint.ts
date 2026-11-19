import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import chalk from 'chalk'
import { findCrudConfig, parse } from './ast.js'
import { type Finding, configRules, pageRules } from './rules.js'
import { findAncestorDir } from '../generate/messages-writer.js'

export interface LintReport {
  files: number
  findings: Finding[]
  errors: number
  warnings: number
}

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '__fixtures__'])

/** Every `.tsx` under `dir` (recursive), skipping build/vendor dirs. */
export function findFiles(dir: string): string[] {
  dir = resolve(dir)
  return (readdirSync(dir, { recursive: true, encoding: 'utf-8' }) as string[])
    .filter((rel) => rel.endsWith('.tsx') && !rel.split(sep).some((seg) => SKIP_DIRS.has(seg)))
    .map((rel) => join(dir, rel))
    .filter((f) => statSync(f).isFile())
    .sort()
}

export function lintProject(dir: string): LintReport {
  const files = findFiles(dir)
  const findings: Finding[] = []
  for (const file of files) {
    const parsed = parse(file)
    if (file.endsWith(`${sep}config.tsx`)) {
      const config = findCrudConfig(parsed.sf)
      if (!config) continue
      for (const rule of Object.values(configRules)) findings.push(...rule({ ...parsed, config }))
    } else {
      for (const rule of Object.values(pageRules)) findings.push(...rule(parsed))
    }
  }
  const messagesDir = findMessagesDir(dir)
  if (messagesDir) findings.push(...i18nUntranslatedFindings(messagesDir))
  // Explicit per-file escape: `// telamonjs-lint-disable-file <rule>[, <rule>]` in the
  // FLAGGED file (e.g. the `[id]` page of a legitimate timeline). No rule = disables all.
  const kept = findings.filter((f) => !isDisabled(f))
  kept.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  return {
    files: files.length,
    findings: kept,
    errors: kept.filter((f) => f.severity === 'error').length,
    warnings: kept.filter((f) => f.severity === 'warning').length,
  }
}

/** Walks up from `dir` looking for `messages/pt-BR.json` (app-level, not per-config-file). */
function findMessagesDir(dir: string): string | undefined {
  const appRoot = findAncestorDir(dir, (d) => existsSync(join(d, 'messages', 'pt-BR.json')))
  return appRoot ? join(appRoot, 'messages') : undefined
}

/** Dot-path -> string value, for leaf strings only (nested message objects). */
function flattenMessages(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  if (!obj || typeof obj !== 'object') return out
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') Object.assign(out, flattenMessages(value, path))
    else if (typeof value === 'string') out[path] = value
  }
  return out
}

/** Best-effort 1-based line of a JSON leaf key's first occurrence (for the Finding). */
function lineOfJsonKey(raw: string, path: string): number {
  const leaf = path.split('.').at(-1)
  const idx = leaf ? raw.indexOf(`"${leaf}"`) : -1
  return idx < 0 ? 1 : raw.slice(0, idx).split('\n').length
}

/**
 * `i18n-untranslated` (warning): a key whose value in `en.json`/`es.json` is
 * byte-for-byte the same as `pt-BR.json` -- a stub `writeModuleMessages` wrote
 * that nobody has translated yet.
 */
function i18nUntranslatedFindings(messagesDir: string): Finding[] {
  const ptFile = join(messagesDir, 'pt-BR.json')
  if (!existsSync(ptFile)) return []
  const pt = flattenMessages(JSON.parse(readFileSync(ptFile, 'utf-8')))
  const out: Finding[] = []
  for (const locale of ['en', 'es']) {
    const file = join(messagesDir, `${locale}.json`)
    if (!existsSync(file)) continue
    const raw = readFileSync(file, 'utf-8')
    const data = flattenMessages(JSON.parse(raw))
    for (const [path, value] of Object.entries(pt)) {
      if (data[path] === value) {
        out.push({
          rule: 'i18n-untranslated',
          severity: 'warning',
          message: `\`${path}\` — same value as pt-BR.json in ${locale}.json (not translated)`,
          file,
          line: lineOfJsonKey(raw, path),
        })
      }
    }
  }
  return out
}

/** eslint-stylish–like output. */
export function printReport(report: LintReport, cwd = process.cwd()): void {
  let current = ''
  for (const f of report.findings) {
    if (f.file !== current) {
      current = f.file
      console.log(`\n${chalk.underline(relative(cwd, f.file) || f.file)}`)
    }
    const sev = f.severity === 'error' ? chalk.red('error  ') : chalk.yellow('warning')
    console.log(`  ${chalk.dim(String(f.line).padStart(4))}  ${sev}  ${f.message}  ${chalk.dim(f.rule)}`)
  }
  const total = report.errors + report.warnings
  console.log()
  if (!total) {
    console.log(chalk.green(`✔ ${report.files} file(s), no problems`))
    return
  }
  const summary = `✖ ${total} problem(s) (${report.errors} error(s), ${report.warnings} warning(s)) in ${report.files} file(s)`
  console.log(report.errors ? chalk.red.bold(summary) : chalk.yellow.bold(summary))
}

const disableCache = new Map<string, Set<string> | 'all' | null>()
function isDisabled(f: Finding): boolean {
  if (!disableCache.has(f.file)) {
    let entry: Set<string> | 'all' | null = null
    try {
      const m = readFileSync(f.file, 'utf8').match(/telamonjs-lint-disable-file(?:\s+([\w-]+(?:\s*,\s*[\w-]+)*))?/)
      if (m) entry = m[1] ? new Set(m[1].split(',').map((r) => r.trim())) : 'all'
    } catch {
      entry = null
    }
    disableCache.set(f.file, entry)
  }
  const entry = disableCache.get(f.file)
  return entry === 'all' || (entry instanceof Set && entry.has(f.rule))
}
