/** True when RHF's `dirtyFields` (nested booleans / arrays) has any field marked dirty. */
export function hasDirtyField(dirty: unknown): boolean {
  if (dirty === true) return true
  if (Array.isArray(dirty)) return dirty.some(hasDirtyField)
  if (dirty && typeof dirty === 'object') return Object.values(dirty).some(hasDirtyField)
  return false
}
