/**
 * Writes the generator's i18n strings into an app's `messages/{pt-BR,en,es}.json`.
 *
 * Only apps that already have i18n wired up (`src/i18n/request.ts`, next-intl's
 * request config) get `msg()` in generated templates -- see `hasI18n()`. Apps
 * without it keep the pre-i18n behavior (literal pt-BR strings), so this writer
 * is a no-op there.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const LOCALES = ['pt-BR', 'en', 'es'] as const

/**
 * Walks up from `startDir` (inclusive) through at most `maxLevels` ancestors,
 * returning the first directory where `predicate` holds, else `undefined`.
 * Shared by every "find the app root" scan (i18n detection, messages dir
 * lookup) so there's one place that owns the walk-up bound.
 */
export function findAncestorDir(
  startDir: string,
  predicate: (dir: string) => boolean,
  maxLevels = 10
): string | undefined {
  let dir = resolve(startDir)
  for (let i = 0; i < maxLevels; i++) {
    if (predicate(dir)) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

/** True when `appRoot` has i18n set up: a next-intl request config, or an existing messages dir. */
export function hasI18n(appRoot: string): boolean {
  return existsSync(join(appRoot, 'src', 'i18n', 'request.ts')) || existsSync(join(appRoot, 'messages', 'pt-BR.json'))
}

/**
 * Writes `block` under `messages.<moduleKey>` in each of
 * `messages/{pt-BR,en,es}.json` at `appRoot`.
 *
 * `en`/`es` receive the exact same (untranslated) value as typed for pt-BR --
 * a human translates later; `telamonjs lint`'s `i18n-untranslated` rule flags the
 * pending ones. No-op, silently, when `appRoot` has no `messages/` dir (app
 * without i18n).
 *
 * @throws when `moduleKey` already exists in any of the three files and
 * `opts.force` is not set.
 */
export function writeModuleMessages(
  appRoot: string,
  moduleKey: string,
  block: Record<string, unknown>,
  opts: { force?: boolean } = {}
): void {
  const dir = join(appRoot, 'messages')
  if (!existsSync(dir)) return

  const files = LOCALES.map((locale) => join(dir, `${locale}.json`))
  const data = files.map((file) => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>) : {}))

  if (!opts.force) {
    const already = files.find((file, i) => moduleKey in data[i])
    if (already) {
      throw new Error(`"${moduleKey}" already exists in ${already} -- pass { force: true } to overwrite`)
    }
  }

  files.forEach((file, i) => {
    data[i][moduleKey] = block
    writeFileSync(file, `${JSON.stringify(data[i], null, 2)}\n`, 'utf-8')
  })
}
