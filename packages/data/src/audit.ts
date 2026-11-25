/** One changed field: the value before and the value sent. */
export interface FieldChange {
  old: unknown
  new: unknown
}

export interface ComputeDiffOptions {
  /** Keys never reported. Replaces the default `['createdAt', 'updatedAt']`. */
  ignore?: string[]
}

const DIFF_IGNORE = ['createdAt', 'updatedAt']

const isDecimal = (value: unknown): value is { toNumber(): number } =>
  typeof value === 'object' && value !== null && typeof (value as { toNumber?: unknown }).toNumber === 'function'

function changed(before: unknown, after: unknown): boolean {
  if (before == null || after == null) return (before == null) !== (after == null)
  if (before instanceof Date || after instanceof Date) {
    return new Date(before as Date | string).getTime() !== new Date(after as Date | string).getTime()
  }
  const a = isDecimal(before) ? before.toNumber() : before
  const b = isDecimal(after) ? after.toNumber() : after
  if (typeof a === 'number' || typeof b === 'number') return Number(a) !== Number(b)
  if (typeof a === 'bigint' || typeof b === 'bigint') return String(a) !== String(b)
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) !== JSON.stringify(b)
  return a !== b
}

/**
 * The fields of `after` whose value differs from `before`, as `{ key: { old, new } }`
 * (`{}` when nothing changed). Reads only the keys of `after`, so a partial DTO
 * works, and skips its `undefined` values. Shallow: a nested object or array is
 * one value, compared as JSON. `null` equals `undefined`; dates compare by
 * instant (Date or ISO string); a Decimal-like (`toNumber()`) or numeric string
 * compares as a number.
 *
 * ```ts
 * const before = await prisma.order.findUniqueOrThrow({ where: { id } })
 * const diff = computeDiff(before, dto)   // { status: { old: 'OPEN', new: 'PAID' } }
 * ```
 */
export function computeDiff(before: object, after: object, options: ComputeDiffOptions = {}): Record<string, FieldChange> {
  const ignore = options.ignore ?? DIFF_IGNORE
  const old = before as Record<string, unknown>
  const diff: Record<string, FieldChange> = {}
  for (const [key, value] of Object.entries(after)) {
    if (value === undefined || ignore.includes(key)) continue
    if (changed(old[key], value)) diff[key] = { old: old[key] ?? null, new: value }
  }
  return diff
}

/**
 * Key fragments `redactPayload` masks by default. Spread it to add your own:
 * `redactPayload(body, [...DEFAULT_REDACT_KEYS, 'ssn'])`.
 */
export const DEFAULT_REDACT_KEYS: readonly string[] = [
  'password',
  'passwd',
  // pt-BR schemas name it `senha`; same list as ui's AuditChangesViewer
  'senha',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'accesskey',
  'privatekey',
  'credential',
]

const REDACTED = '[REDACTED]'
const normalize = (key: string): string => key.toLowerCase().replace(/[-_]/g, '')

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * A copy of `value` with the value of every secret key replaced by
 * `'[REDACTED]'`, through nested objects and arrays. A key is secret when,
 * lowercased and without `-`/`_`, it contains one of `keys` (so `password`
 * catches `newPassword`, `token` catches `REFRESH_TOKEN`, `apikey` catches
 * `api-key`). `keys` replaces the default list. Dates and class instances
 * (Decimal, Buffer) are returned as they are; the input is never mutated.
 */
export function redactPayload(value: unknown, keys: readonly string[] = DEFAULT_REDACT_KEYS): unknown {
  const fragments = keys.map(normalize)
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk)
    if (!isPlainObject(node)) return node
    return Object.fromEntries(
      Object.entries(node).map(([key, child]) => {
        const name = normalize(key)
        return [key, fragments.some((fragment) => name.includes(fragment)) ? REDACTED : walk(child)]
      })
    )
  }
  return walk(value)
}
