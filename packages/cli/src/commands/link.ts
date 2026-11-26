import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import chalk from 'chalk'

// Link mode: point an app's @telamonjs/ui at a local TelamonJS checkout, the
// recipe documented in troubleshooting.mdx ("Consuming the packages via link:"):
// an injected `file:` dependency, plus an override for each package the
// checkout's ui declares as `workspace:^` (logger, data), which only resolves
// through one. `unlink` goes back to the published range.

const UI = '@telamonjs/ui'
const SCOPE = '@telamonjs/'
const DEFAULT_UI = '../telamonjs/packages/ui'

interface PackageJson {
  dependencies?: Record<string, string>
  dependenciesMeta?: Record<string, unknown>
  pnpm?: { overrides?: Record<string, string>; [key: string]: unknown }
  [key: string]: unknown
}

export interface LinkOptions {
  /** The checkout's packages/ui (default: $TELAMONJS_UI, else ../telamonjs/packages/ui from the workspace root) */
  ui?: string
  /** The package.json that depends on @telamonjs/ui (default: apps/web/package.json, else package.json) */
  package?: string
  cwd?: string
}

const isLocal = (range: unknown): boolean => typeof range === 'string' && /^(file|link):/.test(range)

const readJson = (file: string): PackageJson => JSON.parse(readFileSync(file, 'utf8')) as PackageJson

const relPath = (from: string, to: string): string => {
  const path = relative(from, to)
  return path.startsWith('.') ? path : `./${path}`
}

/** Writes `file` only when `change` modified it, so an unchanged file keeps its formatting. */
function edit(file: string, change: (pkg: PackageJson) => void): void {
  const before = readFileSync(file, 'utf8')
  const pkg = JSON.parse(before) as PackageJson
  change(pkg)
  const after = JSON.stringify(pkg, null, 2) + '\n'
  if (after !== JSON.stringify(JSON.parse(before), null, 2) + '\n') writeFileSync(file, after)
}

/**
 * The app's package.json and the workspace root's (where pnpm reads overrides):
 * the nearest pnpm-workspace.yaml above the app, as pnpm itself finds it, else
 * the app itself.
 */
function locate(cwd: string, pkgOption?: string): { file: string; rootFile: string } {
  const file = resolve(cwd, pkgOption ?? (existsSync(join(cwd, 'apps/web/package.json')) ? 'apps/web/package.json' : 'package.json'))
  if (!existsSync(file)) throw new Error(`package.json not found: ${file}`)
  if (readJson(file).dependencies?.[UI] === undefined) throw new Error(`${UI} is not a dependency in ${file} (pass --package <path>)`)
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return { file, rootFile: join(dir, 'package.json') }
    if (dirname(dir) === dir) return { file, rootFile: file }
  }
}

// The range to go back to: the one committed at HEAD, else the latest published
// version. Never the checkout's own version, which may not be on npm yet.
function publishedRange(file: string): string {
  try {
    const committed = (
      JSON.parse(
        execFileSync('git', ['show', `HEAD:./${basename(file)}`], {
          cwd: dirname(file),
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
      ) as PackageJson
    ).dependencies?.[UI]
    if (committed && !isLocal(committed)) return committed
  } catch {
    // not a git repository, no commit yet, or the file is new
  }
  return '^' + execFileSync('npm', ['view', UI, 'version'], { encoding: 'utf8' }).trim()
}

const nextStep = () => console.log(chalk.cyan('Next: pnpm install'))

export function link({ ui, package: pkgOption, cwd = process.cwd() }: LinkOptions = {}): void {
  const { file, rootFile } = locate(cwd, pkgOption)
  const uiDir = ui ? resolve(cwd, ui) : resolve(dirname(rootFile), process.env.TELAMONJS_UI ?? DEFAULT_UI)
  const check = (dir: string, name: string) => {
    const manifest = join(dir, 'package.json')
    if (!existsSync(manifest) || readJson(manifest).name !== name) {
      throw new Error(`${name} not found at ${dir} (pass --ui <checkout>/packages/ui)`)
    }
  }
  check(uiDir, UI)
  // each workspace:^ dependency of the checkout's ui is its sibling in packages/
  const siblings = Object.entries(readJson(join(uiDir, 'package.json')).dependencies ?? {})
    .filter(([name, range]) => name.startsWith(SCOPE) && range.startsWith('workspace:'))
    .map(([name]) => [name, join(uiDir, '..', name.slice(SCOPE.length))] as const)
  for (const [name, dir] of siblings) check(dir, name)

  let from = ''
  let to = ''
  edit(file, pkg => {
    const deps = pkg.dependencies as Record<string, string>
    from = deps[UI]
    to = deps[UI] = `file:${relPath(dirname(file), uiDir)}`
    pkg.dependenciesMeta = { ...pkg.dependenciesMeta, [UI]: { injected: true } }
  })
  edit(rootFile, pkg => {
    const links = Object.fromEntries(siblings.map(([name, dir]) => [name, `link:${relPath(dirname(rootFile), dir)}`]))
    pkg.pnpm = { ...pkg.pnpm, overrides: { ...pkg.pnpm?.overrides, ...links } }
  })
  console.log(`${UI}: ${from} -> ${to}`)
  nextStep()
}

export function unlink({ package: pkgOption, cwd = process.cwd() }: Omit<LinkOptions, 'ui'> = {}): void {
  const { file, rootFile } = locate(cwd, pkgOption)
  edit(file, pkg => {
    const deps = pkg.dependencies as Record<string, string>
    if (isLocal(deps[UI])) {
      const from = deps[UI]
      deps[UI] = publishedRange(file)
      console.log(`${UI}: ${from} -> ${deps[UI]}`)
    }
    if (pkg.dependenciesMeta) {
      delete pkg.dependenciesMeta[UI]
      if (!Object.keys(pkg.dependenciesMeta).length) delete pkg.dependenciesMeta
    }
  })
  edit(rootFile, pkg => {
    const overrides = pkg.pnpm?.overrides
    const local = Object.keys(overrides ?? {}).filter(name => name.startsWith(SCOPE) && isLocal(overrides?.[name]))
    if (!pkg.pnpm || !overrides || !local.length) return
    for (const name of local) delete overrides[name]
    if (!Object.keys(overrides).length) delete pkg.pnpm.overrides
    if (!Object.keys(pkg.pnpm).length) delete pkg.pnpm
  })
  nextStep()
}

function report(run: () => void): void {
  try {
    run()
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

export const runLink = (options: LinkOptions): void => report(() => link(options))
export const runUnlink = (options: Omit<LinkOptions, 'ui'>): void => report(() => unlink(options))
