/**
 * Thrown when a feature needs an optional peer dependency the app did not
 * install (e.g. PDF export → `jspdf` + `jspdf-autotable`). Callers turn it
 * into a localized message naming `packages`.
 */
export class MissingPeerError extends Error {
  override readonly name = 'MissingPeerError'

  constructor(
    readonly packages: string[],
    options?: { cause?: unknown }
  ) {
    const list = packages.join(' ')
    super(`Missing optional peer dependency: install ${list} (pnpm add ${list})`, options)
  }
}

/**
 * Whether `error` is a module-not-found failure (webpack/Turbopack, Node, Vite),
 * as opposed to a network/chunk error that should surface unchanged.
 */
export function isModuleNotFound(error: unknown): boolean {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code
    if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') return true
    if (/Cannot find (module|package)|Failed to resolve/.test(e.message)) return true
  }
  return false
}
