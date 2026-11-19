/**
 * Pure helpers extracted from sub-list.tsx (plan 012, behavior-preserving).
 *
 * These are framework-agnostic value resolvers used by SubList's cell renderer
 * and mobile-card value formatter. Kept out of the public utils barrel
 * (utils/index.ts) on purpose — they are internal to the crud SubList.
 *
 * @module utils/sub-list-helpers
 */

/**
 * Resolve a (possibly nested, dot-separated) path against an object.
 * Returns undefined for invalid paths or missing keys.
 */
export function resolveSubListPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  if (!path || typeof path !== 'string') return undefined
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
