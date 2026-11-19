/**
 * Best human message carried by an error/result, or `undefined`.
 *
 * Covers what REST clients actually throw/return: `Error.message` (string — or
 * an ARRAY when a client assigns NestJS's `message: string[]` as-is), NestJS
 * bodies `{ message: string | string[] }`, axios-like `response.data.message`
 * and `errors: Record<string, string[]>`. Arrays are joined one per line.
 */
export function getErrorMessage(source: unknown): string | undefined {
  if (typeof source === 'string') return source.trim() || undefined
  if (!source || typeof source !== 'object') return undefined
  const o = source as Record<string, unknown>
  const response = o.response as { data?: unknown } | undefined
  return (
    fromMessage(o.message) ??
    (response && typeof response === 'object' ? getErrorMessage(response.data) : undefined) ??
    fromFieldErrors(o.errors)
  )
}

function fromMessage(m: unknown): string | undefined {
  if (typeof m === 'string') return m.trim() || undefined
  if (Array.isArray(m)) {
    const parts = m.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    return parts.length ? parts.join('\n') : undefined
  }
  return undefined
}

function fromFieldErrors(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return fromMessage(errors)
  const parts = Object.values(errors as Record<string, unknown>).flatMap(v =>
    Array.isArray(v) ? v : [v]
  )
  return fromMessage(parts)
}
